import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { AppToast, Avatar, Button, Input, JobFooter, JobHeader } from '@/components/ui';
import { RadioCard } from '@/components/wizard';
import { MaterialSelect, type SelectedMaterial } from '@/components/MaterialSelect';
import { JOB_TYPE_OPTIONS } from '@/utils/constants';
import {
  addJobAssignment,
  fetchJobDetail,
  fetchJobMaterials,
  fetchJobRoster,
  removeJobAssignment,
  updateJob,
  type JobCrewMember,
  type JobMaterial,
} from '@/services/jobs';
import {
  addMaterial as addMaterialOffline,
  removeMaterial as removeMaterialOffline,
} from '@/offline/materialActions';
import { fetchActiveRoster, type RosterEntry } from '@/services/member';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useTheme } from '@/theme';
import { makeEditJobStyles } from '@/styles/editJob.styles';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { goBackSafe } from '@/utils/navigation';
import type { JobType, MainStackParamList } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');

const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const msg = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 30) out.push(`${pad(h)}:${pad(m)}`);
  }
  return out;
})();

const dayLabel = (key: string) => {
  const d = new Date(`${key}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const dm = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  if (diff === 0) return { top: 'Today', bottom: dm };
  if (diff === 1) return { top: 'Tomorrow', bottom: dm };
  return { top: wd, bottom: dm };
};

const EditJobScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeEditJobStyles);
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'EditJob'>>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);
  const [matModal, setMatModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);

  const [jobType, setJobType] = useState<JobType>('standard');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [original, setOriginal] = useState<{
    jobType: JobType;
    date: string | null;
    time: string | null;
  } | null>(null);

  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [crew, setCrew] = useState<JobCrewMember[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  const [matName, setMatName] = useState('');
  const [matUnit, setMatUnit] = useState<string | null>(null);
  const [matQty, setMatQty] = useState('1');
  const [matCost, setMatCost] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJobDetail(params.jobId),
      fetchJobMaterials(params.jobId).catch(() => [] as JobMaterial[]),
      fetchJobRoster(params.jobId).catch(() => [] as JobCrewMember[]),
      fetchActiveRoster().catch(() => [] as RosterEntry[]),
    ])
      .then(([d, mats, members, all]) => {
        if (!active) return;
        const t = d.scheduledStartTime ? d.scheduledStartTime.slice(0, 5) : null;
        setJobType(d.jobType);
        setDate(d.scheduledDate);
        setTime(t);
        setOriginal({ jobType: d.jobType, date: d.scheduledDate, time: t });
        setMaterials(mats);
        setCrew(members);
        setRoster(all);
      })
      .catch(() =>
        Toast.show({ type: 'error', text1: 'Could not load this job.' }),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.jobId]);

  const dateOptions = useMemo(() => {
    const out: string[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push(toKey(d));
    }
    if (original?.date && !out.includes(original.date)) {
      out.unshift(original.date);
    }
    return out;
  }, [original?.date]);

  const vanStock = useMemo(
    () => materials.filter(m => m.source === 'van_stock'),
    [materials],
  );

  const available = useMemo(
    () => roster.filter(r => !crew.some(c => c.id === r.id)),
    [roster, crew],
  );

  const dirty =
    !!original &&
    (jobType !== original.jobType ||
      date !== original.date ||
      time !== original.time);

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await updateJob(params.jobId, {
        jobType,
        scheduledDate: date,
        scheduledStartTime: time,
      });
      dispatch(fetchJobs());
      Toast.show({ type: 'success', text1: 'Job updated.' });
      goBackSafe(navigation);
    } catch (e) {
      Toast.show({ type: 'error', text1: msg(e, 'Could not update the job.') });
      setSaving(false);
    }
  };

  const onPickMaterial = (m: SelectedMaterial) => {
    setMatName(m.name);
    setMatUnit(m.unit);
    if (m.sellPrice != null) setMatCost(String(m.sellPrice));
  };

  const openMatModal = () => {
    setMatName('');
    setMatUnit(null);
    setMatQty('1');
    setMatCost('');
    setMatModal(true);
  };

  const addMaterial = async () => {
    if (!matName.trim() || busy) return;
    setBusy(true);
    try {
      const { queued, material } = await addMaterialOffline({
        jobId: params.jobId,
        description: matName.trim(),
        quantity: Number(matQty) || 1,
        unitCost: Number(matCost) || 0,
        source: 'van_stock',
        unit: matUnit,
      });
      if (queued) {
        setMaterials(prev => [...prev, material]);
      } else {
        setMaterials(await fetchJobMaterials(params.jobId));
      }
      setMatModal(false);
      Toast.show({
        type: 'success',
        text1: queued ? 'Saved offline — will sync.' : 'Material added.',
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: msg(e, 'Could not add material.') });
    } finally {
      setBusy(false);
    }
  };

  const removeMaterial = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { queued } = await removeMaterialOffline(id);
      if (queued) {
        setMaterials(prev => prev.filter(m => m.id !== id));
      } else {
        setMaterials(await fetchJobMaterials(params.jobId));
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: msg(e, 'Could not remove material.') });
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (memberId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await addJobAssignment(params.jobId, memberId);
      setCrew(await fetchJobRoster(params.jobId));
      setMemberModal(false);
      Toast.show({ type: 'success', text1: 'Added to the job.' });
    } catch (e) {
      Toast.show({ type: 'error', text1: msg(e, 'Could not add to the job.') });
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await removeJobAssignment(params.jobId, memberId);
      setCrew(await fetchJobRoster(params.jobId));
    } catch (e) {
      Toast.show({ type: 'error', text1: msg(e, 'Could not remove.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.flex}>
      <JobHeader title="Edit job" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.section}>JOB TYPE</Text>
          <View style={styles.typeStack}>
            {JOB_TYPE_OPTIONS.map(opt => (
              <RadioCard
                key={opt.key}
                icon={opt.icon}
                title={opt.title}
                subtitle={opt.subtitle}
                selected={jobType === opt.key}
                onPress={() => setJobType(opt.key)}
              />
            ))}
          </View>

          <Text style={styles.section}>SCHEDULED DAY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {dateOptions.map(key => {
              const active = key === date;
              const l = dayLabel(key);
              return (
                <Pressable
                  key={key}
                  style={[styles.dateChip, active && styles.dateChipOn]}
                  onPress={() => setDate(key)}
                >
                  <Text style={[styles.dateTop, active && styles.dateTextOn]}>
                    {l.top}
                  </Text>
                  <Text style={[styles.dateBottom, active && styles.dateTextOn]}>
                    {l.bottom}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.section}>START TIME</Text>
          <Pressable style={styles.timeField} onPress={() => setTimeSheet(true)}>
            <Ionicons name="time-outline" size={18} color={colors.secondary} />
            <Text style={styles.timeValue}>{time ?? 'Set a start time'}</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.placeholder}
            />
          </Pressable>

          <View style={styles.sectionHead}>
            <Text style={styles.section}>MATERIALS · VAN STOCK</Text>
            <Pressable onPress={openMatModal} hitSlop={8}>
              <Text style={styles.addLink}>Add</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {vanStock.length ? (
              vanStock.map((m, i) => (
                <View
                  key={m.id}
                  style={[
                    styles.itemRow,
                    i < vanStock.length - 1 && styles.itemDivider,
                  ]}
                >
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{m.description}</Text>
                    <Text style={styles.itemSub}>
                      {`${m.quantity}${m.unit ?? ''} · €${(
                        m.quantity * m.unitCost
                      ).toFixed(2)}`}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeMaterial(m.id)} hitSlop={8}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.error}
                    />
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.emptyRow}>No materials added.</Text>
            )}
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.section}>TEAM</Text>
            <Pressable
              onPress={() => setMemberModal(true)}
              hitSlop={8}
              disabled={!available.length}
            >
              <Text
                style={[styles.addLink, !available.length && styles.addLinkOff]}
              >
                Add
              </Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {crew.length ? (
              crew.map((c, i) => (
                <View
                  key={c.id}
                  style={[
                    styles.itemRow,
                    i < crew.length - 1 && styles.itemDivider,
                  ]}
                >
                  <View style={styles.memberLeft}>
                    <Avatar name={c.name} size={32} />
                    <Text style={styles.itemName}>{c.name}</Text>
                  </View>
                  <Pressable onPress={() => removeMember(c.id)} hitSlop={8}>
                    <Ionicons name="close" size={18} color={colors.placeholder} />
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.emptyRow}>No one assigned yet.</Text>
            )}
          </View>
        </ScrollView>
      )}

      <JobFooter>
        <Button
          label="Save changes"
          fullWidth
          loading={saving}
          disabled={!dirty}
          onPress={save}
        />
      </JobFooter>

      <Modal
        visible={timeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeSheet(false)}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTimeSheet(false)}
          />
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Start time</Text>
            <ScrollView style={styles.pickerList}>
              {TIME_OPTIONS.map(t => {
                const active = t === time;
                return (
                  <Pressable
                    key={t}
                    style={styles.pickerRow}
                    onPress={() => {
                      setTime(t);
                      setTimeSheet(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerRowText,
                        active && styles.pickerRowActive,
                      ]}
                    >
                      {t}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={matModal}
        transparent
        animationType="fade"
        onRequestClose={() => setMatModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetBackdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMatModal(false)}
          />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Add van stock</Text>
            <MaterialSelect
              value={
                matName
                  ? {
                      materialId: null,
                      name: matName,
                      unit: matUnit,
                      sellPrice: null,
                    }
                  : null
              }
              onChange={onPickMaterial}
            />
            <View style={styles.sheetRow}>
              <Input
                label="Qty"
                keyboardType="numeric"
                value={matQty}
                onChangeText={setMatQty}
                containerStyle={styles.sheetRowItem}
              />
              <Input
                label="Unit price (€)"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={matCost}
                onChangeText={setMatCost}
                containerStyle={styles.sheetRowItem}
              />
            </View>
            <Button
              label="Add item"
              fullWidth
              loading={busy}
              disabled={!matName.trim()}
              onPress={addMaterial}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={memberModal}
        transparent
        animationType="fade"
        onRequestClose={() => setMemberModal(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMemberModal(false)}
          />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Add to the job</Text>
            {available.length ? (
              <ScrollView style={styles.memberList}>
                {available.map(m => (
                  <Pressable
                    key={m.id}
                    style={styles.memberOption}
                    onPress={() => addMember(m.id)}
                  >
                    <Avatar name={m.fullName ?? 'U'} size={34} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.itemName}>
                        {m.fullName ?? 'Member'}
                      </Text>
                      {m.roleName ? (
                        <Text style={styles.itemSub}>{m.roleName}</Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="add-circle"
                      size={22}
                      color={colors.primary}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyRow}>Everyone is already assigned.</Text>
            )}
          </View>
        </View>
      </Modal>

      <AppToast />
    </View>
  );
};

export default EditJobScreen;
