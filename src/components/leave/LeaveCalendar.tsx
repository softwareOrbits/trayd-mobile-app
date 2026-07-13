import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeNewLeaveStyles } from '@/styles/leave.styles';
import { mondayIndex, parseKey, toKey, todayKey } from './leave.helpers';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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

type LeaveCalendarProps = {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
};

export const LeaveCalendar = ({ from, to, onChange }: LeaveCalendarProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeNewLeaveStyles);
  const today = todayKey();

  const lo = from && to && from > to ? to : from;
  const hi = from && to && from > to ? from : to;
  const single = lo != null && lo === hi;

  const [view, setView] = useState(() => {
    const base = parseKey(from) ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const now = new Date();
  const atFloor =
    view.year === now.getFullYear() && view.month === now.getMonth();

  const goPrev = () => {
    if (atFloor) return;
    setView(v =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { year: v.year, month: v.month - 1 },
    );
  };
  const goNext = () =>
    setView(v =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { year: v.year, month: v.month + 1 },
    );

  const cells = useMemo(() => {
    const lead = mondayIndex(new Date(view.year, view.month, 1).getDay());
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < lead; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view]);

  const tapDay = (day: number) => {
    const key = toKey(view.year, view.month, day);
    if (key < today) return;
    if (!lo || !single) {
      onChange(key, key);
      return;
    }
    if (key === lo) return;
    onChange(key < lo ? key : lo, key < lo ? lo : key);
  };

  return (
    <>
      <View style={styles.calNav}>
        <Pressable
          style={styles.calNavBtn}
          onPress={goPrev}
          disabled={atFloor}
          hitSlop={6}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={atFloor ? colors.disabledText : colors.secondary}
          />
        </Pressable>
        <Text style={styles.calMonth}>
          {MONTHS[view.month]} {view.year}
        </Text>
        <Pressable style={styles.calNavBtn} onPress={goNext} hitSlop={6}>
          <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day == null) return <View key={`e-${i}`} style={styles.cell} />;
          const key = toKey(view.year, view.month, day);
          const isLo = key === lo;
          const isHi = key === hi;
          const isEnd = isLo || isHi;
          const inRange =
            lo != null && hi != null && lo !== hi && key > lo && key < hi;
          const past = key < today;
          const bandStart = isLo && hi != null && lo !== hi;
          const bandEnd = isHi && lo != null && lo !== hi;
          return (
            <View key={key} style={styles.cell}>
              {inRange ? <View style={styles.bandFull} /> : null}
              {bandStart ? <View style={styles.bandRight} /> : null}
              {bandEnd ? <View style={styles.bandLeft} /> : null}
              <Pressable
                style={styles.cellPress}
                disabled={past}
                onPress={() => tapDay(day)}
              >
                <View style={[styles.dayCircle, isEnd && styles.dayCircleSel]}>
                  <Text
                    style={[
                      styles.dayText,
                      inRange && styles.dayTextRange,
                      isEnd && styles.dayTextSel,
                      past && styles.dayTextMuted,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </>
  );
};

export default LeaveCalendar;
