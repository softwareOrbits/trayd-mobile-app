import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { fetchTimesheet, type Timesheet } from '@/services/timesheet';
import { fmtHoursMin } from '@/components/wrapUp/helpers';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeTimesheetStyles } from '@/styles/timesheet.styles';
import type { MainStackParamList } from '@/types';

const monthLabel = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

const dayParts = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    num: d.getDate(),
  };
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type PickerProps = {
  visible: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onApply: (year: number, month: number) => void;
};

const MonthYearPicker = ({
  visible,
  year,
  month,
  onClose,
  onApply,
}: PickerProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeTimesheetStyles);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [draftYear, setDraftYear] = useState(year);

  useEffect(() => {
    if (visible) {
      setDraftYear(year);
      setMode('month');
    }
  }, [visible, year]);

  const nowD = new Date();
  const thisYear = nowD.getFullYear();
  const thisMonth = nowD.getMonth();
  const years = Array.from({ length: 12 }, (_, i) => thisYear - 9 + i);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <View style={styles.handle} />

          {mode === 'month' ? (
            <>
              <View style={styles.pickerHead}>
                <Text style={styles.pickerLabel}>MONTH</Text>
                <View style={styles.yearNav}>
                  <Pressable onPress={() => setDraftYear(y => y - 1)} hitSlop={8}>
                    <Ionicons name="chevron-back" size={20} color={colors.white} />
                  </Pressable>
                  <Pressable onPress={() => setMode('year')} hitSlop={8}>
                    <Text style={styles.yearNavValue}>{draftYear}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDraftYear(y => Math.min(thisYear, y + 1))}
                    hitSlop={8}
                    disabled={draftYear >= thisYear}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.white}
                      style={draftYear >= thisYear ? { opacity: 0.3 } : undefined}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.grid}>
                {MONTHS.map((label, i) => {
                  const selected = draftYear === year && i === month;
                  const future = draftYear === thisYear && i > thisMonth;
                  return (
                    <Pressable
                      key={label}
                      style={[
                        styles.gridItem,
                        selected && styles.gridItemOn,
                        future && { opacity: 0.3 },
                      ]}
                      disabled={future}
                      onPress={() => {
                        onApply(draftYear, i);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          styles.gridItemText,
                          selected && styles.gridItemTextOn,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <View style={styles.pickerHead}>
                <Text style={styles.pickerLabel}>YEAR</Text>
                <Text style={styles.yearNavValue}>{draftYear}</Text>
              </View>

              <View style={styles.grid}>
                {years.map(y => {
                  const selected = y === draftYear;
                  const future = y > thisYear;
                  return (
                    <Pressable
                      key={y}
                      style={[
                        styles.gridItem,
                        selected && styles.gridItemOn,
                        future && { opacity: 0.3 },
                      ]}
                      disabled={future}
                      onPress={() => {
                        setDraftYear(y);
                        setMode('month');
                      }}
                    >
                      <Text
                        style={[
                          styles.gridItemText,
                          selected && styles.gridItemTextOn,
                        ]}
                      >
                        {y}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const TimesheetScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeTimesheetStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const now = new Date();
  const [{ year, month }, setYm] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [data, setData] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    fetchTimesheet(from, to)
      .then(t => active && setData(t))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year, month]);

  const shiftMonth = (dir: number) =>
    setYm(prev => {
      const d = new Date(prev.year, prev.month + dir, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const maxHours = useMemo(
    () => Math.max(1, ...(data?.days ?? []).map(d => d.totalHours)),
    [data],
  );

  const days = data?.days ?? [];

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headTop}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.eyebrow}>HOURS · WORKING-TIME RECORD</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.title}>Your timesheet</Text>

        <View style={styles.monthRow}>
          <Pressable
            style={styles.monthPill}
            onPress={() => setPickerOpen(true)}
          >
            <Text style={styles.monthPillText}>{monthLabel(year, month)}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.white} />
          </Pressable>
          <View style={styles.arrows}>
            <Pressable style={styles.arrowBtn} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.white} />
            </Pressable>
            <Pressable
              style={[styles.arrowBtn, isCurrentMonth && { opacity: 0.4 }]}
              disabled={isCurrentMonth}
              onPress={() => shiftMonth(1)}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.totalValue}>
          {fmtHoursMin(data?.totalHours ?? 0)}
        </Text>
        <Text style={styles.totalSub}>
          {isCurrentMonth && data?.running
            ? 'This month · still running'
            : 'This month'}
        </Text>
      </View>

      {loading ? (
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : days.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="time-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No hours this month</Text>
          <Text style={styles.emptyText}>
            Hours log automatically when you start a job. Each day’s work will
            show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>BY DAY</Text>
          {days.map(d => {
            const { weekday, num } = dayParts(d.date);
            const pct = Math.round((d.totalHours / maxHours) * 100);
            const worked = d.jobCount > 0;
            return (
              <View key={d.date} style={styles.dayRow}>
                <View style={styles.dayDateCol}>
                  <Text style={styles.dayWeekday}>{weekday}</Text>
                  <Text style={styles.dayNum}>{num}</Text>
                </View>
                <View style={styles.dayBody}>
                  {d.leave ? (
                    <View style={styles.leaveTag}>
                      <Ionicons
                        name="airplane-outline"
                        size={13}
                        color={colors.secondary}
                      />
                      <Text style={styles.leaveTagText}>{d.leave}</Text>
                    </View>
                  ) : null}
                  {worked ? (
                    <>
                      {d.leave ? <View style={styles.leaveSpacer} /> : null}
                      <Text style={styles.dayMeta}>
                        {d.jobCount} job{d.jobCount === 1 ? '' : 's'}
                      </Text>
                      <View style={styles.dayBarTrack}>
                        <View
                          style={[styles.dayBarFill, { width: `${pct}%` }]}
                        />
                      </View>
                    </>
                  ) : null}
                </View>
                <Text style={worked ? styles.dayHours : styles.dayHoursMuted}>
                  {worked ? fmtHoursMin(d.totalHours) : '—'}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <MonthYearPicker
        visible={pickerOpen}
        year={year}
        month={month}
        onClose={() => setPickerOpen(false)}
        onApply={(y, m) => setYm({ year: y, month: m })}
      />
    </View>
  );
};

export default TimesheetScreen;
