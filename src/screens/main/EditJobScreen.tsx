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
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { AppToast, Button, CalendarModal, JobFooter } from '@/components/ui';
import { JOB_TYPE_OPTIONS, HALF_HOUR_TIME_OPTIONS } from '@/utils/constants';
import { fmtDateWeekday } from '@/utils/datetime';
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
import { searchMaterials, type CatalogMaterial } from '@/services/materials';
import {
  addMaterial as addMaterialOffline,
  removeMaterial as removeMaterialOffline,
} from '@/offline/materialActions';
import { fetchActiveRoster, type RosterEntry } from '@/services/member';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useTheme } from '@/theme';
import { makeNewJobStyles } from '@/styles/newJob.styles';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { goBackSafe } from '@/utils/navigation';
import type { JobType, MainStackParamList } from '@/types';

type When = 'schedule' | 'nodate';

type Original = {
  jobType: JobType;
  date: string | null;
  time: string | null;
  crew: string[];
};

type ChipMember = { id: string; name: string; isSelf: boolean };

const SHORT_TYPE: Record<string, string> = {
  standard: 'Standard',
  quote: 'Quote visit',
  callout: 'Call-out',
};

const WHEN_OPTIONS = [
  ['schedule', 'calendar-outline', 'Schedule'],
  ['nodate', 'reorder-three-outline', 'No date'],
] as const;

const CUSTOMER_AVATAR = { width: 34, height: 34, borderRadius: 17 };

const firstName =(name: string | null) =>
  (name ?? '').trim().split(/\s+/)[0] || 'Member';

const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ');

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every(x => b.includes(x));

const EditJobScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeNewJobStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'EditJob'>>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<Original | null>(null);

  const [customer, setCustomer] = useState<{ name: string; sub: string } | null>(
    null,
  );
  const [jobType, setJobType] = useState<JobType>('standard');
  const [when, setWhen] = useState<When>('nodate');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [datePicker, setDatePicker] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);

  const [crew, setCrew] = useState<string[]>([]);
  const [assigned, setAssigned] = useState<JobCrewMember[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [pickedMaterials, setPickedMaterials] = useState<CatalogMaterial[]>([]);
  const [matSheet, setMatSheet] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [catalog, setCatalog] = useState<CatalogMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

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
        const ids = members.map(m => m.id);
        setCustomer({
          name: d.customerName ?? 'Customer',
          sub: joinParts(d.customerAddress, d.customerEircode),
        });
        setJobType(d.jobType);
        setDate(d.scheduledDate);
        setTime(t);
        setWhen(d.scheduledDate ? 'schedule' : 'nodate');
        setOriginal({ jobType: d.jobType, date: d.scheduledDate, time: t, crew: ids });
        setMaterials(mats.filter(m => m.source === 'van_stock'));
        setAssigned(members);
        setCrew(ids);
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

  useEffect(() => {
    if (!matSheet) return;
    let active = true;
    setMaterialsLoading(true);
    const t = setTimeout(() => {
      searchMaterials(materialSearch)
        .then(rows => active && setCatalog(rows))
        .catch(e => console.warn('materials:', e?.message))
        .finally(() => active && setMaterialsLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [matSheet, materialSearch]);

  const people = useMemo<ChipMember[]>(() => {
    const out: ChipMember[] = roster.map(r => ({
      id: r.id,
      name: r.fullName ?? r.email ?? 'Member',
      isSelf: !!r.isSelf,
    }));
    assigned.forEach(a => {
      if (!out.some(p => p.id === a.id)) {
        out.push({ id: a.id, name: a.name, isSelf: false });
      }
    });
    return out;
  }, [roster, assigned]);

  const keptMaterials = materials.filter(m => !removedIds.includes(m.id));
  const scheduledDate = when === 'schedule' ? date : null;
  const scheduledTime = when === 'schedule' ? time : null;

  const jobDirty =
    !!original &&
    (jobType !== original.jobType ||
      scheduledDate !== original.date ||
      scheduledTime !== original.time);
  const crewDirty = !!original && !sameSet(crew, original.crew);
  const materialsDirty = removedIds.length > 0 || pickedMaterials.length > 0;
  const dirty = jobDirty || crewDirty || materialsDirty;

  const crewOk = crew.length > 0 || !original?.crew.length;
  const scheduleOk = when !== 'schedule' || (!!date && !!time);
  const ready = !loading && dirty && crewOk && scheduleOk;
  const why = loading
    ? null
    : !crewOk
    ? 'Add someone on site.'
    : !scheduleOk
    ? 'Pick a date and start time.'
    : !dirty
    ? 'Make a change to save it.'
    : null;

  const toggleCrew = (id: string) =>
    setCrew(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );

  const toggleMaterial = (m: CatalogMaterial) =>
    setPickedMaterials(prev =>
      prev.some(x => x.id === m.id)
        ? prev.filter(x => x.id !== m.id)
        : [...prev, m],
    );

  const chooseWhen = (next: When) => {
    setWhen(next);
    if (next === 'schedule' && !date) setDatePicker(true);
  };

  const save = async () => {
    if (!ready || saving || !original) return;
    setSaving(true);
    try {
      if (jobDirty) {
        await updateJob(params.jobId, {
          jobType,
          scheduledDate,
          scheduledStartTime: scheduledTime ? `${scheduledTime}:00` : null,
        });
      }

      const added = crew.filter(id => !original.crew.includes(id));
      const dropped = original.crew.filter(id => !crew.includes(id));
      const newMaterials = jobType === 'quote' ? [] : pickedMaterials;
      const results = await Promise.allSettled([
        ...added.map(id => addJobAssignment(params.jobId, id)),
        ...dropped.map(id => removeJobAssignment(params.jobId, id)),
        ...removedIds.map(id => removeMaterialOffline(id)),
        ...newMaterials.map(m =>
          addMaterialOffline({
            jobId: params.jobId,
            description: m.name,
            quantity: 1,
            unitCost: m.sellPrice,
            source: 'van_stock',
            unit: m.unit,
          }),
        ),
      ]);

      dispatch(fetchJobs());
      const failed = results.filter(r => r.status === 'rejected').length;
      Toast.show(
        failed
          ? {
              type: 'error',
              text1: 'Some changes didn’t save.',
              text2: `${failed} update${failed === 1 ? '' : 's'} failed.`,
            }
          : { type: 'success', text1: 'Job updated.' },
      );
      goBackSafe(navigation);
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not update the job.',
      });
      setSaving(false);
    }
  };

  const label = (text: string, extra?: string, first?: boolean) => (
    <Text style={[styles.label, first && styles.labelFirst]}>
      {text}
      {extra ? <Text style={styles.labelExtra}>{` · ${extra}`}</Text> : null}
    </Text>
  );

  const typeHint =
    JOB_TYPE_OPTIONS.find(o => o.key === jobType)?.subtitle ?? '';
  const showMaterials = jobType !== 'quote' || keptMaterials.length > 0;
  const materialCount = keptMaterials.length + pickedMaterials.length;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.back}
          onPress={() => goBackSafe(navigation)}
          hitSlop={8}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.topTitle}>Edit job</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.secondary} style={styles.loader} />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {label('Customer', undefined, true)}
          <View style={styles.gap8}>
            <View style={[styles.dd, styles.ddActive]}>
              <View style={[styles.av, CUSTOMER_AVATAR]}>
                <Text style={styles.avText}>
                  {(customer?.name ?? '?').trim().charAt(0).toUpperCase() ||
                    '?'}
                </Text>
              </View>
              <View style={styles.ci}>
                <Text style={styles.custName} numberOfLines={1}>
                  {customer?.name ?? 'Customer'}
                </Text>
                {customer?.sub ? (
                  <Text style={styles.custSub} numberOfLines={1}>
                    {customer.sub}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {label('Job type')}
          <View style={styles.chips3}>
            {JOB_TYPE_OPTIONS.map(opt => {
              const on = jobType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.tchip, on && styles.tchipOn]}
                  onPress={() => setJobType(opt.key)}
                  accessibilityState={{ selected: on }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={on ? colors.primary : colors.secondary}
                  />
                  <Text style={[styles.tchipText, on && styles.tchipTextOn]}>
                    {SHORT_TYPE[opt.key] ?? opt.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{typeHint}</Text>

          {label('On site')}
          <View style={styles.pchips}>
            {people.map(m => {
              const on = crew.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  style={[styles.pchip, on && styles.pchipOn]}
                  onPress={() => toggleCrew(m.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <View style={[styles.pav, on && styles.pavOn]}>
                    <Text style={[styles.pavText, on && styles.pavTextOn]}>
                      {m.name.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.pchipText, on && styles.pchipTextOn]}>
                    {m.isSelf ? 'Me' : firstName(m.name)}
                  </Text>
                  {on ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {showMaterials ? (
            <>
              {label('Off the van', 'optional')}
              {materialCount ? (
                <View style={styles.pchips}>
                  {keptMaterials.map(m => (
                    <View key={m.id} style={styles.mchip}>
                      <Text style={styles.mchipText} numberOfLines={1}>
                        {m.quantity === 1
                          ? m.description
                          : `${m.description} · ${m.quantity}${m.unit ?? ''}`}
                      </Text>
                      <Pressable
                        style={styles.mchipX}
                        onPress={() => setRemovedIds(prev => [...prev, m.id])}
                        accessibilityLabel={`Remove ${m.description}`}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                  ))}
                  {jobType === 'quote'
                    ? null
                    : pickedMaterials.map(m => (
                        <View key={m.id} style={styles.mchip}>
                          <Text style={styles.mchipText} numberOfLines={1}>
                            {m.name}
                          </Text>
                          <Pressable
                            style={styles.mchipX}
                            onPress={() => toggleMaterial(m)}
                            accessibilityLabel={`Remove ${m.name}`}
                          >
                            <Ionicons
                              name="close"
                              size={16}
                              color={colors.textMuted}
                            />
                          </Pressable>
                        </View>
                      ))}
                </View>
              ) : null}
              {jobType === 'quote' ? null : (
                <Pressable
                  style={styles.addPill}
                  onPress={() => setMatSheet(true)}
                >
                  <Ionicons name="add" size={18} color={colors.secondary} />
                  <Text style={styles.addPillText}>
                    {materialCount ? 'Add more' : 'Add materials'}
                  </Text>
                </Pressable>
              )}
            </>
          ) : null}

          {label('When')}
          <View style={styles.when}>
            {WHEN_OPTIONS.map(([key, icon, text]) => {
              const on = when === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.whenBtn, on && styles.whenBtnOn]}
                  onPress={() => chooseWhen(key)}
                  accessibilityState={{ selected: on }}
                >
                  <Ionicons name={icon} size={16} color={colors.secondary} />
                  <Text style={styles.whenText}>{text}</Text>
                </Pressable>
              );
            })}
          </View>
          {when === 'schedule' ? (
            <View style={styles.pills2}>
              <Pressable
                style={[styles.pillbtn, styles.pillWide]}
                onPress={() => setDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.secondary}
                />
                <Text
                  style={date ? styles.pillValue : styles.pillPlaceholder}
                  numberOfLines={1}
                >
                  {date ? fmtDateWeekday(date) : 'Date *'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.pillbtn, styles.pillNarrow]}
                onPress={() => setTimeSheet(true)}
              >
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.secondary}
                />
                <Text style={time ? styles.pillValue : styles.pillPlaceholder}>
                  {time ?? 'Start time *'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}

      <JobFooter>
        {why ? <Text style={styles.why}>{why}</Text> : null}
        <Button
          label="Save changes"
          fullWidth
          loading={saving}
          disabled={!ready || saving}
          onPress={save}
        />
      </JobFooter>

      <CalendarModal
        visible={datePicker}
        value={date}
        title="Schedule this job for"
        onSelect={d => {
          setDatePicker(false);
          setDate(d);
          if (!time) setTimeSheet(true);
        }}
        onClose={() => setDatePicker(false)}
      />

      <Modal
        visible={timeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeSheet(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTimeSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
            <View style={styles.grab} />
            <Text style={styles.sheetTitle}>Start time</Text>
            <ScrollView>
              <View style={styles.times}>
                {HALF_HOUR_TIME_OPTIONS.map(t => {
                  const on = t === time;
                  return (
                    <Pressable
                      key={t}
                      style={[styles.timeBtn, on && styles.timeBtnOn]}
                      onPress={() => {
                        setTime(t);
                        setTimeSheet(false);
                      }}
                    >
                      <Text style={[styles.timeText, on && styles.timeTextOn]}>
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={matSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setMatSheet(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMatSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
            <View style={styles.grab} />
            <Text style={styles.sheetTitle}>Anything off the van?</Text>
            <Text style={styles.sheetSub}>
              Tap to add van stock. You can adjust it during the job.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Search materials…"
              placeholderTextColor={colors.placeholder}
              value={materialSearch}
              onChangeText={setMaterialSearch}
              autoCapitalize="none"
            />
            <ScrollView
              style={styles.sheetList}
              keyboardShouldPersistTaps="handled"
            >
              {materialsLoading && !catalog.length ? (
                <ActivityIndicator
                  color={colors.secondary}
                  style={styles.loader}
                />
              ) : catalog.length ? (
                catalog.map(m => {
                  const on = pickedMaterials.some(x => x.id === m.id);
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.matRow, on && styles.matRowOn]}
                      onPress={() => toggleMaterial(m)}
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={styles.matName}>{m.name}</Text>
                      <Text style={styles.matPrice}>
                        {`€${m.sellPrice.toFixed(2)}${
                          m.unit ? `\n${m.unit}` : ''
                        }`}
                      </Text>
                      <View style={[styles.tick, on && styles.tickOn]}>
                        {on ? (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={colors.white}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.hint}>
                  No materials found. Try a different search.
                </Text>
              )}
            </ScrollView>
            <Button
              label={
                pickedMaterials.length
                  ? `Done · ${pickedMaterials.length} item${
                      pickedMaterials.length === 1 ? '' : 's'
                    }`
                  : 'Done'
              }
              fullWidth
              onPress={() => setMatSheet(false)}
            />
          </View>
        </View>
      </Modal>

      <AppToast />
    </KeyboardAvoidingView>
  );
};

export default EditJobScreen;
