import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { MONTHS_FULL as MONTHS, MONTHS_SHORT } from '@/utils/constants';
import { dateKey, pad, parseDateKey, toDateKey } from '@/utils/datetime';

type Props = {
  visible: boolean;
  value?: string | null;
  onSelect: (date: string) => void;
  onClose: () => void;
  title?: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CELL_HEIGHT = 44;
const GRID_ROWS = 6;
const GRID_CELLS = GRID_ROWS * 7;
const GRID_HEIGHT = CELL_HEIGHT * GRID_ROWS;
const WEEKDAY_HEIGHT = 18;
const BODY_GAP = 12;
const BODY_HEIGHT = WEEKDAY_HEIGHT + BODY_GAP + GRID_HEIGHT;
const MONTH_CELL_HEIGHT = BODY_HEIGHT / 4;

const toKey = dateKey;
const parseKey = parseDateKey;

const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;

/** Types as `12/08/2026` — slashes appear on their own. */
const maskDMY = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];
  return parts.filter(p => p.length).join('/');
};

/** Only a real, complete day/month/year returns a key — nothing is guessed. */
const keyFromDMY = (typed: string): string | null => {
  const m = typed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12 || day < 1) return null;
  if (day > new Date(year, month, 0).getDate()) return null;
  return toDateKey(year, month - 1, day);
};

const dmyFromKey = (key: string | null | undefined) => {
  const d = parseDateKey(key);
  if (!d) return '';
  return maskDMY(
    `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`,
  );
};

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
  const [typed, setTyped] = useState(() => dmyFromKey(value));

  useEffect(() => {
    if (visible) {
      setView(selected ?? new Date());
      setPickingMonth(false);
      setTyped(dmyFromKey(value));
    }
  }, [visible, selected, value]);

  const typedKey = keyFromDMY(typed);

  const onType = (raw: string) => {
    const masked = maskDMY(raw);
    setTyped(masked);
    const key = keyFromDMY(masked);
    const d = parseKey(key);
    if (d) {
      setPickingMonth(false);
      setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const useTyped = () => {
    if (!typedKey) return;
    Keyboard.dismiss();
    onSelect(typedKey);
    onClose();
  };

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
    Keyboard.dismiss();
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

          <View style={styles.typeRow}>
            <TextInput
              style={styles.typeInput}
              value={typed}
              onChangeText={onType}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={10}
              onSubmitEditing={useTyped}
            />
            <Pressable
              style={[styles.typeBtn, !typedKey && styles.typeBtnOff]}
              onPress={useTyped}
              disabled={!typedKey}
              hitSlop={6}
            >
              <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
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
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeInput: {
      flex: 1,
      height: 44,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.mono,
      letterSpacing: 1,
      color: theme.colors.text,
    },
    typeBtn: {
      width: 44,
      height: 44,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    typeBtnOff: { opacity: 0.4 },
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
