import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Noun = { one: string; many: string };

export type DateRangeFilterProps = {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
  markedDates?: string[];
  count?: number;
  noun?: Noun;
  summaryNoun?: Noun;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

type Mode = 'day' | 'month' | 'year';
type Anchor = { x: number; y: number; width: number; height: number };

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_LONG = [
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
const toKey = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;
const parseKey = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};
const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;

const fmtDay = (key: string) => {
  const d = parseKey(key);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
const fmtDayLong = (key: string) => {
  const d = parseKey(key);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};
const fmtRange = (loKey: string, hiKey: string) => {
  const a = parseKey(loKey);
  const b = parseKey(hiKey);
  if (!a || !b) return '';
  return a.getFullYear() === b.getFullYear()
    ? `${fmtDay(loKey)} – ${fmtDay(hiKey)} ${b.getFullYear()}`
    : `${fmtDay(loKey)} ${a.getFullYear()} – ${fmtDay(hiKey)} ${b.getFullYear()}`;
};

const plural = (n: number, noun: Noun) => `${n} ${n === 1 ? noun.one : noun.many}`;

const GAP = 8;

export const DateRangeFilter = ({
  from,
  to,
  onChange,
  markedDates = [],
  count = 0,
  noun = { one: 'result', many: 'results' },
  summaryNoun,
  placeholder = 'All time',
  style,
}: DateRangeFilterProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('day');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selFrom, setSelFrom] = useState<string | null>(null);
  const [selTo, setSelTo] = useState<string | null>(null);

  const summaryWords = summaryNoun ?? noun;

  const lo = selFrom && selTo && selFrom > selTo ? selTo : selFrom;
  const hi = selFrom && selTo && selFrom > selTo ? selFrom : selTo;
  const single = lo != null && lo === hi;

  const dotSet = useMemo(() => new Set(markedDates), [markedDates]);

  const pickCount = useMemo(() => {
    if (!lo && !hi) return markedDates.length;
    return markedDates.filter(d => (!lo || d >= lo) && (!hi || d <= hi)).length;
  }, [markedDates, lo, hi]);

  const cells = useMemo(() => {
    const lead = mondayIndex(new Date(viewYear, viewMonth, 1).getDay());
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < lead; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewYear, viewMonth]);

  const years = useMemo(() => {
    const base = Math.max(new Date().getFullYear(), viewYear);
    return Array.from({ length: 12 }, (_, i) => base - 11 + i);
  }, [viewYear]);

  const appliedActive = from != null || to != null;
  const appliedLo = from && to && from > to ? to : from;
  const appliedHi = from && to && from > to ? from : to;
  const appliedSummary = !appliedActive
    ? placeholder
    : appliedLo && appliedHi && appliedLo !== appliedHi
      ? fmtRange(appliedLo, appliedHi)
      : fmtDayLong((appliedLo ?? appliedHi)!);

  const triggerLabel = !open
    ? appliedActive
      ? 'FILTERED'
      : 'ALL TIME'
    : mode !== 'day'
      ? 'MONTH'
      : !lo
        ? 'ALL TIME'
        : single
          ? 'SINGLE DAY'
          : 'DATE RANGE';

  const triggerValue = !open
    ? appliedSummary
    : mode !== 'day'
      ? `${MONTHS_LONG[viewMonth]} ${viewYear}`
      : !lo
        ? placeholder
        : single
          ? fmtDayLong(lo)
          : fmtRange(lo, hi!);

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const l = from && to && from > to ? to : from;
      const h = from && to && from > to ? from : to;
      setSelFrom(l);
      setSelTo(h);
      const at = parseKey(l) ?? parseKey(h) ?? new Date();
      setViewYear(at.getFullYear());
      setViewMonth(at.getMonth());
      setMode('day');
      setPanelHeight(0);
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const close = () => setOpen(false);

  const tapDay = (day: number) => {
    const key = toKey(viewYear, viewMonth, day);
    if (!lo || !single) {
      setSelFrom(key);
      setSelTo(key);
      return;
    }
    if (key === lo) return;
    setSelFrom(key < lo ? key : lo);
    setSelTo(key < lo ? lo : key);
  };

  const wholeMonth = () => {
    const last = new Date(viewYear, viewMonth + 1, 0).getDate();
    setSelFrom(toKey(viewYear, viewMonth, 1));
    setSelTo(toKey(viewYear, viewMonth, last));
  };

  const caption = !lo
    ? 'Tap a day to filter'
    : single
      ? 'Tap another day for a range'
      : 'Tap a new day to start over';

  const screenH = Dimensions.get('window').height;
  const belowTop = anchor ? anchor.y + anchor.height + GAP : 0;
  const spaceBelow = anchor ? screenH - belowTop : 0;
  const flip =
    anchor != null &&
    panelHeight > 0 &&
    spaceBelow < panelHeight &&
    anchor.y > spaceBelow;
  const panelTop = flip
    ? Math.max(GAP, (anchor?.y ?? 0) - panelHeight - GAP)
    : belowTop;
  const ready = panelHeight > 0;

  const onPanelLayout = (e: LayoutChangeEvent) =>
    setPanelHeight(e.nativeEvent.layout.height);

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        ref={triggerRef}
        style={styles.trigger}
        onPress={() => (open ? close() : openDropdown())}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.secondary} />
        <View style={styles.triggerBody}>
          <Text style={styles.triggerLabel}>{triggerLabel}</Text>
          <Text style={styles.triggerValue} numberOfLines={1}>
            {triggerValue}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {!open ? (
        <Text style={styles.summary}>{plural(count, summaryWords)}</Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.scrim} onPress={close} />
        {anchor ? (
          <View
            onLayout={onPanelLayout}
            style={[
              styles.panel,
              {
                position: 'absolute',
                top: panelTop,
                left: anchor.x,
                width: anchor.width,
                opacity: ready ? 1 : 0,
              },
            ]}
          >
            {mode === 'day' ? (
              <>
                <View style={styles.navRow}>
                  <Pressable
                    style={styles.navLabel}
                    onPress={() => setMode('month')}
                    hitSlop={6}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={colors.secondary}
                    />
                    <Text style={styles.navLabelText}>
                      {`${MONTHS_LONG[viewMonth]} ${viewYear}`}
                    </Text>
                  </Pressable>
                  <Pressable onPress={wholeMonth} hitSlop={6}>
                    <Text style={styles.wholeMonth}>Whole month</Text>
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
                    if (day == null)
                      return <View key={`e-${i}`} style={styles.cell} />;
                    const key = toKey(viewYear, viewMonth, day);
                    const isLo = key === lo;
                    const isHi = key === hi;
                    const isEnd = isLo || isHi;
                    const inRange =
                      lo != null &&
                      hi != null &&
                      lo !== hi &&
                      key > lo &&
                      key < hi;
                    const hasDot = dotSet.has(key);
                    const bandStart = isLo && hi != null && lo !== hi;
                    const bandEnd = isHi && lo != null && lo !== hi;
                    return (
                      <View key={key} style={styles.cell}>
                        {inRange ? <View style={styles.bandFull} /> : null}
                        {bandStart ? <View style={styles.bandRight} /> : null}
                        {bandEnd ? <View style={styles.bandLeft} /> : null}
                        <Pressable
                          style={styles.cellPress}
                          onPress={() => tapDay(day)}
                        >
                          <View
                            style={[
                              styles.dayCircle,
                              isEnd && styles.dayCircleSel,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                inRange && styles.dayTextRange,
                                isEnd && styles.dayTextSel,
                              ]}
                            >
                              {day}
                            </Text>
                          </View>
                          {hasDot ? (
                            <View
                              style={[styles.dot, isEnd && styles.dotOnSel]}
                            />
                          ) : null}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <Text style={styles.caption}>{caption}</Text>

                <View style={styles.footer}>
                  <Pressable
                    style={[styles.btn, styles.btnGhost]}
                    onPress={() => {
                      setSelFrom(null);
                      setSelTo(null);
                    }}
                  >
                    <Text style={styles.btnGhostText}>Clear days</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={() => {
                      onChange(selFrom, selTo);
                      close();
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>
                      {`Done · ${plural(pickCount, noun)}`}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : mode === 'month' ? (
              <>
                <Text style={styles.pickLabel}>Select a month</Text>
                <View style={styles.yearStep}>
                  <Pressable
                    onPress={() => setViewYear(y => y - 1)}
                    hitSlop={10}
                    style={styles.stepBtn}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={colors.secondary}
                    />
                  </Pressable>
                  <Pressable
                    style={styles.yearPill}
                    onPress={() => setMode('year')}
                    hitSlop={6}
                  >
                    <Text style={styles.yearPillText}>{viewYear}</Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={colors.secondary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setViewYear(y => y + 1)}
                    hitSlop={10}
                    style={styles.stepBtn}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.secondary}
                    />
                  </Pressable>
                </View>
                <View style={styles.gridPad}>
                  {MONTHS_SHORT.map((m, i) => {
                    const active = i === viewMonth;
                    return (
                      <View key={m} style={styles.gridItem}>
                        <Pressable
                          style={[
                            styles.gridPill,
                            active && styles.gridPillActive,
                          ]}
                          onPress={() => {
                            setViewMonth(i);
                            setMode('day');
                          }}
                        >
                          <Text
                            style={[
                              styles.gridItemText,
                              active && styles.gridItemTextActive,
                            ]}
                          >
                            {m}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.pickLabel}>Select a year</Text>
                <View style={styles.gridPad}>
                  {years.map(y => {
                    const active = y === viewYear;
                    return (
                      <View key={y} style={styles.gridItem}>
                        <Pressable
                          style={[
                            styles.gridPill,
                            active && styles.gridPillActive,
                          ]}
                          onPress={() => {
                            setViewYear(y);
                            setMode('month');
                          }}
                        >
                          <Text
                            style={[
                              styles.gridItemText,
                              active && styles.gridItemTextActive,
                            ]}
                          >
                            {y}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        ) : null}
      </Modal>
    </View>
  );
};

const BAND = 'rgba(22,52,90,0.10)';

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { paddingTop: 16, paddingBottom: 8, gap: 8 },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
    },
    triggerBody: { flex: 1 },
    triggerLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    triggerValue: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      marginTop: 2,
    },
    summary: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    scrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    panel: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
      padding: 14,
      gap: 12,
      shadowColor: theme.colors.black,
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navLabel: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    navLabelText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    wholeMonth: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    weekRow: { flexDirection: 'row' },
    weekday: {
      width: `${100 / 7}%`,
      textAlign: 'center',
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.5,
      color: theme.colors.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellPress: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bandFull: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      left: 0,
      right: 0,
      backgroundColor: BAND,
    },
    bandRight: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      left: '50%',
      right: 0,
      backgroundColor: BAND,
    },
    bandLeft: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      left: 0,
      right: '50%',
      backgroundColor: BAND,
    },
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleSel: { backgroundColor: theme.colors.secondary },
    dayText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    dayTextRange: { fontFamily: theme.fonts.semibold },
    dayTextSel: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
    dot: {
      position: 'absolute',
      bottom: 4,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.colors.primary,
    },
    dotOnSel: { backgroundColor: theme.colors.white },
    caption: {
      textAlign: 'center',
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    footer: { flexDirection: 'row', gap: 10 },
    btn: {
      height: 48,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnGhost: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
    },
    btnGhostText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    btnPrimary: { flex: 1.4, backgroundColor: theme.colors.secondary },
    btnPrimaryText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },
    pickLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
    yearStep: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    yearPillText: {
      fontSize: theme.typography.size.xl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    gridPad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -5,
    },
    gridItem: {
      width: '33.3333%',
      paddingVertical: 6,
      paddingHorizontal: 5,
    },
    gridPill: {
      paddingVertical: 14,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
    },
    gridPillActive: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    gridItemText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    gridItemTextActive: {
      color: theme.colors.white,
      fontFamily: theme.fonts.bold,
    },
  });

export default DateRangeFilter;
