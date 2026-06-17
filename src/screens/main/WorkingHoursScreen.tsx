import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { AppToast, Button, JobFooter, JobHeader } from '@/components/ui';
import {
  WEEK_DAYS,
  fetchMyMember,
  parseWorkingHours,
  updateMyWorkingHours,
  type WorkingHours,
} from '@/services/member';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { MainStackParamList } from '@/types';

const pad = (n: number) => n.toString().padStart(2, '0');

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 30) out.push(`${pad(h)}:${pad(m)}`);
  }
  return out;
})();

const sameHours = (a: WorkingHours, b: WorkingHours) =>
  WEEK_DAYS.every(({ key }) => {
    const x = a[key];
    const y = b[key];
    return x.enabled === y.enabled && x.start === y.start && x.end === y.end;
  });

const WorkingHoursScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [hours, setHours] = useState<WorkingHours | null>(null);
  const [original, setOriginal] = useState<WorkingHours | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{
    day: string;
    field: 'start' | 'end';
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyMember()
      .then(m => {
        if (!active) return;
        const parsed = parseWorkingHours(m.workingHours);
        setHours(parsed);
        setOriginal(parsed);
      })
      .catch(() => active && Toast.show({ type: 'error', text1: 'Could not load your hours.' }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const toggleDay = useCallback((key: string) => {
    setHours(prev =>
      prev ? { ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } } : prev,
    );
  }, []);

  const setTime = useCallback(
    (key: string, field: 'start' | 'end', value: string) => {
      setHours(prev =>
        prev ? { ...prev, [key]: { ...prev[key], [field]: value } } : prev,
      );
    },
    [],
  );

  const applyToWeekdays = useCallback(() => {
    setHours(prev => {
      if (!prev) return prev;
      const mon = prev.mon;
      const next = { ...prev };
      for (const k of ['tue', 'wed', 'thu', 'fri']) {
        next[k] = { ...mon };
      }
      return next;
    });
    Toast.show({ type: 'success', text1: 'Copied Monday to Tue–Fri.' });
  }, []);

  const dirty = hours && original ? !sameHours(hours, original) : false;

  const save = async () => {
    if (!hours || !dirty || saving) return;
    setSaving(true);
    try {
      await updateMyWorkingHours(hours);
      Toast.show({ type: 'success', text1: 'Working hours saved.' });
      navigation.goBack();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not save your hours.',
      });
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <JobHeader title="Working hours" onBack={() => navigation.goBack()} />

      {loading || !hours ? (
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Tell the office when you’re usually available. This shows up when
            they plan and assign jobs.
          </Text>

          {WEEK_DAYS.map(({ key, label }) => {
            const day = hours[key];
            return (
              <View key={key} style={styles.dayCard}>
                <View style={styles.dayTop}>
                  <Text style={styles.dayLabel}>{label}</Text>
                  <View style={styles.dayRight}>
                    <Text
                      style={[
                        styles.dayState,
                        { color: day.enabled ? colors.green : colors.textMuted },
                      ]}
                    >
                      {day.enabled ? 'Working' : 'Off'}
                    </Text>
                    <Switch
                      value={day.enabled}
                      onValueChange={() => toggleDay(key)}
                      trackColor={{ true: colors.primary, false: colors.borderMuted }}
                      thumbColor={colors.white}
                    />
                  </View>
                </View>

                {day.enabled ? (
                  <View style={styles.timeRow}>
                    <TimeChip
                      label="From"
                      value={day.start}
                      onPress={() => setPicker({ day: key, field: 'start' })}
                      styles={styles}
                    />
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={colors.placeholder}
                    />
                    <TimeChip
                      label="To"
                      value={day.end}
                      onPress={() => setPicker({ day: key, field: 'end' })}
                      styles={styles}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          <Pressable style={styles.copyBtn} onPress={applyToWeekdays}>
            <Ionicons name="copy-outline" size={16} color={colors.secondary} />
            <Text style={styles.copyText}>Copy Monday to Tue–Fri</Text>
          </Pressable>
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
        visible={picker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPicker(null)}
          />
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>
              {picker?.field === 'end' ? 'End time' : 'Start time'}
            </Text>
            <ScrollView style={styles.pickerList}>
              {TIME_OPTIONS.map(t => {
                const current =
                  picker && hours ? hours[picker.day][picker.field] === t : false;
                return (
                  <Pressable
                    key={t}
                    style={styles.pickerRow}
                    onPress={() => {
                      if (picker) setTime(picker.day, picker.field, t);
                      setPicker(null);
                    }}
                  >
                    <Text
                      style={[styles.pickerRowText, current && styles.pickerRowActive]}
                    >
                      {t}
                    </Text>
                    {current ? (
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

      <AppToast />
    </View>
  );
};

const TimeChip = ({
  label,
  value,
  onPress,
  styles,
}: {
  label: string;
  value: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) => (
  <Pressable style={styles.timeChip} onPress={onPress}>
    <Text style={styles.timeChipLabel}>{label}</Text>
    <Text style={styles.timeChipValue}>{value}</Text>
  </Pressable>
);

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 12 },
    subtitle: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 20,
      marginBottom: 4,
    },
    dayCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    dayTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dayLabel: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    dayRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dayState: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    timeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    timeChipLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
    },
    timeChipValue: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    copyText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.secondary,
    },

    pickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    pickerCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.lg,
      paddingVertical: 16,
      paddingHorizontal: 8,
      maxHeight: '60%',
    },
    pickerTitle: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    pickerList: { paddingHorizontal: 8 },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    pickerRowText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    pickerRowActive: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
  });

export default WorkingHoursScreen;
