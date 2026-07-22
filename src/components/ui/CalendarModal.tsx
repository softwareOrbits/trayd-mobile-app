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
const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

const CELL_HEIGHT = 44;
const GRID_ROWS = 6;
const GRID_CELLS = GRID_ROWS * 7;
const GRID_HEIGHT = CELL_HEIGHT * GRID_ROWS;
const WEEKDAY_HEIGHT = 18;
const BODY_GAP = 12;
const BODY_HEIGHT = WEEKDAY_HEIGHT + BODY_GAP + GRID_HEIGHT;
const MONTH_CELL_HEIGHT = BODY_HEIGHT / 4;

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
  const [pickingMonth, setPickingMonth] = useState(false);

  useEffect(() => {
    if (visible) {
      setView(selected ?? new Date());
      setPickingMonth(false);
    }
  }, [visible, selected]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const todayKey = toKey(new Date());
  const highlightKey = selected ? toKey(selected) : todayKey;

  const cells = useMemo(() => {
    const lead = mondayIndex(new Date(year, month, 1).getDay());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < lead; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d);
    while (out.length < GRID_CELLS) out.push(null);
    return out;
  }, [year, month]);

  const shift = (delta: number) =>
    setView(
      pickingMonth
        ? new Date(year + delta, month, 1)
        : new Date(year, month + delta, 1),
    );

  const choose = (day: number) => {
    onSelect(toKey(new Date(year, month, day)));
    onClose();
  };

  const chooseMonth = (index: number) => {
    setView(new Date(year, index, 1));
    setPickingMonth(false);
  };

  const jumpToToday = () => {
    const now = new Date();
    setView(new Date(now.getFullYear(), now.getMonth(), 1));
    setPickingMonth(false);
    onSelect(toKey(now));
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
            <Pressable
              onPress={() => setPickingMonth(v => !v)}
              hitSlop={8}
              style={styles.monthTap}
            >
              <Text style={styles.monthLabel}>
                {pickingMonth ? `${year}` : `${MONTHS[month]} ${year}`}
              </Text>
              <Ionicons
                name={pickingMonth ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.secondary}
              />
            </Pressable>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={styles.navBtn}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.secondary}
              />
            </Pressable>
          </View>

          <View style={styles.body}>
            {pickingMonth ? (
              <View style={styles.monthGrid}>
              {MONTHS_SHORT.map((label, index) => {
                const isCurrent = index === month;
                return (
                  <Pressable
                    key={label}
                    style={styles.monthCell}
                    onPress={() => chooseMonth(index)}
                  >
                    <View
                      style={[
                        styles.monthPill,
                        isCurrent && styles.monthPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthText,
                          isCurrent && styles.monthTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <>
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
                  const isSelected = key === highlightKey;
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
              </>
            )}
          </View>

          <Pressable onPress={jumpToToday} hitSlop={8} style={styles.todayBtn}>
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
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
    monthTap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    monthLabel: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    body: { height: BODY_HEIGHT, gap: BODY_GAP },
    weekRow: { flexDirection: 'row', height: WEEKDAY_HEIGHT },
    weekday: {
      width: '14.2857%',
      textAlign: 'center',
      fontSize: 11,
      lineHeight: WEEKDAY_HEIGHT,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      height: GRID_HEIGHT,
    },
    cell: {
      width: '14.2857%',
      height: CELL_HEIGHT,
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
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      height: BODY_HEIGHT,
    },
    monthCell: {
      width: '33.3333%',
      height: MONTH_CELL_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthPill: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: theme.radii.pill,
    },
    monthPillActive: { backgroundColor: theme.colors.primary },
    monthText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    monthTextActive: {
      color: theme.colors.onPrimary,
      fontFamily: theme.fonts.bold,
    },
    todayBtn: { alignItems: 'center', paddingVertical: 4 },
    todayText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
  });

export default CalendarModal;
