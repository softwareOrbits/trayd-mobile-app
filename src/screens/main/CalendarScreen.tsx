import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AskTraydFab, StatusPill, useBottomNavHeight } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { fetchLeaveRequests } from '@/services/leave';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { useCollapsibleOnScroll } from '@/utils/useCollapsibleOnScroll';
import { dateKey } from '@/components/jobs/jobsScreen.helpers';
import { makeCalendarStyles } from '@/styles/calendar.styles';
import {
  JOB_TYPE_LABEL,
  LEAVE_TYPE_LABEL_LONG,
  STATUS_GROUP,
  type Job,
  type LeaveRequest,
  type MainStackParamList,
} from '@/types';

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const mondayOf = (base: Date) => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

const localityOf = (addr: string | null) => {
  if (!addr) return '';
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[1] : '';
};

const timeOf = (t: string | null) => (t ? t.slice(0, 5) : null);

const statusWord = (status: Job['status']) =>
  status === 'active'
    ? 'running'
    : status === 'paused'
    ? 'paused'
    : 'scheduled';

const dayTitle = (key: string, todayKey: string) => {
  const formatted = new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
  return key === todayKey ? `Today · ${formatted}` : formatted;
};

const CalendarScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCalendarStyles);
  const insets = useSafeAreaInsets();
  const navHeight = useBottomNavHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const dispatch = useAppDispatch();
  const jobs = useAppSelector(s => s.jobs.items);
  const { collapsed, onScroll } = useCollapsibleOnScroll();

  const todayKey = dateKey(new Date());
  const [selected, setSelected] = useState(todayKey);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchJobs());
    }, [dispatch]),
  );

  useEffect(() => {
    let active = true;
    fetchLeaveRequests()
      .then(rows => {
        if (!active) return;
        setLeaves(
          rows.filter(r => r.status === 'approved' || r.status === 'pending'),
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      if (!job.scheduledDate || !STATUS_GROUP[job.status]) continue;
      const bucket = map.get(job.scheduledDate) ?? [];
      bucket.push(job);
      map.set(job.scheduledDate, bucket);
    }
    return map;
  }, [jobs]);

  const leavesByDay = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    for (const leave of leaves) {
      const cursor = new Date(`${leave.startDate}T00:00:00`);
      const end = new Date(`${leave.endDate}T00:00:00`);
      for (; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const dow = cursor.getDay();
        if (dow === 0 || dow === 6) continue;
        const key = dateKey(cursor);
        const bucket = map.get(key) ?? [];
        bucket.push(leave);
        map.set(key, bucket);
      }
    }
    return map;
  }, [leaves]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return dateKey(d);
      }),
    [weekStart],
  );

  const monthLabel = new Date(`${weekDays[3]}T00:00:00`)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    .toUpperCase();

  const shiftWeek = (dir: number) =>
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + dir * 7);
      return d;
    });

  const dayJobs = useMemo(
    () =>
      (jobsByDay.get(selected) ?? [])
        .slice()
        .sort((a, b) =>
          (a.scheduledStartTime ?? '').localeCompare(b.scheduledStartTime ?? ''),
        ),
    [jobsByDay, selected],
  );
  const dayLeaves = leavesByDay.get(selected) ?? [];
  const isEmpty = dayJobs.length === 0 && dayLeaves.length === 0;

  const jobBadge = (status: Job['status']) => {
    const group = STATUS_GROUP[status];
    if (group === 'live')
      return { label: 'LIVE', bg: colors.primary, fg: colors.onPrimary, accent: colors.primary };
    if (group === 'paused')
      return { label: 'PAUSED', bg: colors.warningBg, fg: colors.warning, accent: colors.warning };
    if (group === 'done')
      return { label: 'DONE', bg: colors.surfaceMuted, fg: colors.green, accent: colors.green };
    return { label: 'NEXT', bg: colors.secondary, fg: colors.white, accent: colors.secondary };
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.eyebrow}>CALENDAR</Text>
        <Text style={styles.title}>{dayTitle(selected, todayKey)}</Text>

        <View style={styles.monthRow}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <View style={styles.weekNav}>
            <Pressable style={styles.navBtn} onPress={() => shiftWeek(-1)} hitSlop={6}>
              <Ionicons name="chevron-back" size={16} color={colors.text} />
            </Pressable>
            <Pressable style={styles.navBtn} onPress={() => shiftWeek(1)} hitSlop={6}>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.weekStrip}>
          {weekDays.map((key, i) => {
            const on = key === selected;
            const hasItems =
              (jobsByDay.get(key)?.length ?? 0) > 0 ||
              (leavesByDay.get(key)?.length ?? 0) > 0;
            return (
              <Pressable
                key={key}
                style={[styles.dayCell, on && styles.dayCellOn]}
                onPress={() => setSelected(key)}
              >
                <Text style={[styles.dayLetter, on && styles.dayLetterOn]}>
                  {WEEK_LETTERS[i]}
                </Text>
                <Text style={[styles.dayNum, on && styles.dayNumOn]}>
                  {Number(key.slice(8))}
                </Text>
                <View style={hasItems ? styles.dot : styles.dotEmpty} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: navHeight + 24 }]}
      >
        {isEmpty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.emptyText}>You had a clear day.</Text>
          </View>
        ) : null}

        {dayJobs.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>JOBS</Text>
              <Text style={styles.sectionCount}>· {dayJobs.length}</Text>
            </View>
            <View style={styles.card}>
              {dayJobs.map((job, index) => {
                const badge = jobBadge(job.status);
                const name = job.customerName ?? JOB_TYPE_LABEL[job.jobType];
                const locality = localityOf(job.customerAddress);
                const time = timeOf(job.scheduledStartTime);
                return (
                  <Fragment key={job.id}>
                    {index > 0 ? <View style={styles.jobDivider} /> : null}
                    <Pressable
                      style={styles.jobRow}
                      onPress={() =>
                        navigation.navigate('JobDetail', { jobId: job.id })
                      }
                    >
                      <View
                        style={[styles.jobAccentBar, { backgroundColor: badge.accent }]}
                      />
                      <View style={styles.jobRowContent}>
                        <View style={styles.jobTimeCol}>
                          {time ? <Text style={styles.jobTime}>{time}</Text> : null}
                          <StatusPill label={badge.label} bg={badge.bg} fg={badge.fg} />
                        </View>
                        <View style={styles.rowBody}>
                          <Text style={styles.jobTitle} numberOfLines={1}>
                            {locality ? `${name} — ${locality}` : name}
                          </Text>
                          <Text style={styles.rowSub}>
                            {JOB_TYPE_LABEL[job.jobType]} · {statusWord(job.status)}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.placeholder}
                        />
                      </View>
                    </Pressable>
                  </Fragment>
                );
              })}
            </View>
          </>
        ) : null}

        {dayLeaves.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionDot, { backgroundColor: colors.secondary }]} />
              <Text style={styles.sectionLabel}>LEAVE</Text>
              <Text style={styles.sectionCount}>· {dayLeaves.length}</Text>
            </View>
            <View style={styles.card}>
              {dayLeaves.map((leave, index) => (
                <Fragment key={leave.id}>
                  {index > 0 ? <View style={styles.jobDivider} /> : null}
                  <Pressable
                    style={styles.jobRow}
                    onPress={() =>
                      navigation.navigate('LeaveRequestDetail', { request: leave })
                    }
                  >
                    <View
                      style={[styles.jobAccentBar, { backgroundColor: colors.secondary }]}
                    />
                    <View style={styles.jobRowContent}>
                      <View style={styles.leaveIcon}>
                        <Ionicons
                          name="sunny-outline"
                          size={20}
                          color={colors.secondary}
                        />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.jobTitle} numberOfLines={1}>
                          {LEAVE_TYPE_LABEL_LONG[leave.type]}
                        </Text>
                        <Text style={styles.rowSub}>
                          {leave.days} day{leave.days === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <StatusPill
                        label={leave.status === 'pending' ? 'Pending' : 'Approved'}
                        tone={leave.status === 'pending' ? 'warning' : 'info'}
                      />
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.placeholder}
                      />
                    </View>
                  </Pressable>
                </Fragment>
              ))}
            </View>
          </>
        ) : null}

        {!isEmpty ? (
          <Text style={styles.footer}>TAP ANY ENTRY FOR THE FULL DETAIL</Text>
        ) : null}
      </ScrollView>

      <AskTraydFab collapsed={collapsed} />
    </View>
  );
};

export default CalendarScreen;
