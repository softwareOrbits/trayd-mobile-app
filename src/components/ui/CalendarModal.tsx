import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Props = {
  visible: boolean;
  value?: string | null;
  onSelect: (date: string) => void;
  onClose: () => void;
  title?: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;

export const CalendarModal = ({
  visible,
  value,
  onSelect,
  onClose,
  title = 'Pick a date',
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const selected = useMemo(() => parseKey(value), [value]);
  const [view, setView] = useState(() => selected ?? new Date());

  useEffect(() => {
    if (visible) setView(selected ?? new Date());
  }, [visible, selected]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const todayKey = toKey(new Date());
  const selectedKey = selected ? toKey(selected) : null;

  const cells = useMemo(() => {
    const lead = mondayIndex(new Date(year, month, 1).getDay());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < lead; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month]);

  const shift = (delta: number) => setView(new Date(year, month + delta, 1));
  const choose = (day: number) => {
    onSelect(toKey(new Date(year, month, day)));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.monthRow}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.secondary} />
            </Pressable>
            <Text style={styles.monthLabel}>{`${MONTHS[month]} ${year}`}</Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={styles.navBtn}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondary}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map(w => (
              <Text key={w} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day == null)
                return <View key={`empty-${i}`} style={styles.cell} />;
              const key = `${year}-${pad(month + 1)}-${pad(day)}`;
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={key}
                  style={styles.cell}
                  onPress={() => choose(day)}
                >
                  <View
                    style={[
                      styles.dayPill,
                      isSelected && styles.daySelected,
                      !isSelected && isToday && styles.dayToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 12,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    navBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthLabel: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    weekRow: { flexDirection: 'row' },
    weekday: {
      width: '14.2857%',
      textAlign: 'center',
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: '14.2857%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayPill: {
      width: 38,
      height: 38,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySelected: { backgroundColor: theme.colors.primary },
    dayToday: { borderWidth: 1, borderColor: theme.colors.borderMuted },
    dayText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    dayTextSelected: {
      color: theme.colors.onPrimary,
      fontFamily: theme.fonts.bold,
    },
  });

export default CalendarModal;
