import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  AskTraydFab,
  CalendarModal,
  StatusPill,
  useBottomNavHeight,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { fetchLeaveRequests } from '@/services/leave';
import { fetchTasks } from '@/services/tasks';
import { isOverdue, vehicleLabel } from '@/components/tasks/tasks.helpers';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { useCollapsibleOnScroll } from '@/utils/useCollapsibleOnScroll';
import { WEEK_LETTERS } from '@/utils/constants';
import { fmtDMY, fmtWeekdayDMY, timeOf } from '@/utils/datetime';
import { dateKey } from '@/components/jobs/jobsScreen.helpers';
import { makeCalendarStyles } from '@/styles/calendar.styles';
import {
  JOB_TYPE_LABEL,
  LEAVE_TYPE_LABEL_LONG,
  STATUS_GROUP,
  type Job,
  type JobStatus,
  type LeaveRequest,
  type MainStackParamList,
  type Task,
} from '@/types';

const mondayOf = (base: Date) => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

const STATUS_WORD: Record<JobStatus, string> = {
  scheduled: 'scheduled',
  active: 'running',
  paused: 'suspended',
  awaiting_review: 'awaiting review',
  approved: 'approved',
  downloaded: 'downloaded',
  paid: 'paid',
  cancelled: 'cancelled',
};

const dayTitle = (key: string, todayKey: string) => {
  const formatted = fmtWeekdayDMY(key);
  return key === todayKey ? `Today · ${formatted}` : formatted;
};

const groupLabel = (key: string) => fmtWeekdayDMY(key).toUpperCase();

const filterLabel = (key: string) => {
  return fmtDMY(key);
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
  const [mode, setMode] = useState<'day' | 'past'>('day');
  const [selected, setSelected] = useState(todayKey);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchTasks()
        .then(rows => active && setTasks(rows))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.deadlineDate) continue;
      const bucket = map.get(task.deadlineDate) ?? [];
      bucket.push(task);
      map.set(task.deadlineDate, bucket);
    }
    return map;
  }, [tasks]);

  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      if (!job.scheduledDate) continue;
      const bucket = map.get(job.scheduledDate) ?? [];
      bucket.push(job);
      map.set(job.scheduledDate, bucket);
    }
    return map;
  }, [jobs]);

  const unscheduledJobs = useMemo(
    () =>
      jobs.filter(job => {
        if (job.scheduledDate) return false;
        const group = STATUS_GROUP[job.status];
        return group === 'upcoming' || group === 'live' || group === 'paused';
      }),
    [jobs],
  );

  const unscheduledTasks = useMemo(
    () => tasks.filter(t => !t.deadlineDate && t.status !== 'complete'),
    [tasks],
  );

  const unscheduledCount = unscheduledJobs.length + unscheduledTasks.length;

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
  const dayTasks = useMemo(
    () =>
      (tasksByDay.get(selected) ?? [])
        .slice()
        .sort((a, b) =>
          (a.deadlineTime ?? '').localeCompare(b.deadlineTime ?? ''),
        ),
    [tasksByDay, selected],
  );
  const isEmpty =
    dayJobs.length === 0 && dayLeaves.length === 0 && dayTasks.length === 0;

  /**
   * Everything dated before today — jobs and tasks, all statuses alike —
   * newest first, grouped by date. No status filter: this is the full history,
   * narrowed only by the From/To dates when the user sets them.
   */
  const pastSections = useMemo(() => {
    const inRange = (date: string | null): date is string =>
      date != null &&
      date < todayKey &&
      (fromDate == null || date >= fromDate) &&
      (toDate == null || date <= toDate);

    const map = new Map<string, { jobs: Job[]; tasks: Task[] }>();
    const bucket = (key: string) => {
      let entry = map.get(key);
      if (!entry) {
        entry = { jobs: [], tasks: [] };
        map.set(key, entry);
      }
      return entry;
    };

    jobs
      .filter(j => inRange(j.scheduledDate))
      .sort((a, b) =>
        (b.scheduledStartTime ?? '').localeCompare(a.scheduledStartTime ?? ''),
      )
      .forEach(j => bucket(j.scheduledDate as string).jobs.push(j));

    tasks
      .filter(t => inRange(t.deadlineDate))
      .sort((a, b) =>
        (b.deadlineTime ?? '').localeCompare(a.deadlineTime ?? ''),
      )
      .forEach(t => bucket(t.deadlineDate as string).tasks.push(t));

    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [jobs, tasks, todayKey, fromDate, toDate]);

  const pastCount = pastSections.reduce(
    (s, [, entry]) => s + entry.jobs.length + entry.tasks.length,
    0,
  );
  const filtered = fromDate != null || toDate != null;

  const pickDate = (key: string) => {
    if (picker === 'from') {
      setFromDate(key);
      if (toDate != null && key > toDate) setToDate(null);
    } else if (picker === 'to') {
      setToDate(key);
      if (fromDate != null && key < fromDate) setFromDate(null);
    }
  };

  const clearFilter = () => {
    setFromDate(null);
    setToDate(null);
  };

  const jobBadge = (status: Job['status']) => {
    if (status === 'cancelled')
      return { label: 'CANCELLED', bg: colors.surfaceMuted, fg: colors.textMuted, accent: colors.placeholder };
    const group = STATUS_GROUP[status];
    if (group === 'live')
      return { label: 'LIVE', bg: colors.primary, fg: colors.onPrimary, accent: colors.primary };
    if (group === 'paused')
      return { label: 'SUSPENDED', bg: colors.warningBg, fg: colors.warning, accent: colors.warning };
    if (group === 'done')
      return { label: 'DONE', bg: colors.surfaceMuted, fg: colors.green, accent: colors.green };
    return { label: 'NEXT', bg: colors.secondary, fg: colors.white, accent: colors.secondary };
  };

  const renderJobRow = (job: Job, index: number) => {
    const badge =
      !job.scheduledDate && STATUS_GROUP[job.status] === 'upcoming'
        ? {
            label: 'UNSCHEDULED',
            bg: colors.warningBg,
            fg: colors.warning,
            accent: colors.warning,
          }
        : jobBadge(job.status);
    const name = job.customerName ?? JOB_TYPE_LABEL[job.jobType];
    const eircode = job.customerEircode?.trim() || null;
    const time = timeOf(job.scheduledStartTime);
    return (
      <Fragment key={job.id}>
        {index > 0 ? <View style={styles.jobDivider} /> : null}
        <Pressable
          style={styles.jobRow}
          onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
        >
          <View style={[styles.jobAccentBar, { backgroundColor: badge.accent }]} />
          <View style={styles.jobRowContent}>
            <View style={styles.jobTimeCol}>
              {time ? <Text style={styles.jobTime}>{time}</Text> : null}
              {eircode ? (
                <Text style={styles.jobEircode} numberOfLines={1}>
                  {eircode}
                </Text>
              ) : null}
              <StatusPill label={badge.label} bg={badge.bg} fg={badge.fg} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.rowSub}>
                {JOB_TYPE_LABEL[job.jobType]} · {STATUS_WORD[job.status]}
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
  };

  const taskBadge = (task: Task) => {
    if (task.status === 'complete')
      return { label: 'DONE', bg: colors.surfaceMuted, fg: colors.green, accent: colors.green };
    if (isOverdue(task))
      return { label: 'OVERDUE', bg: colors.errorBg, fg: colors.error, accent: colors.error };
    if (task.status === 'in_progress')
      return { label: 'LIVE', bg: colors.primary, fg: colors.onPrimary, accent: colors.primary };
    if (!task.deadlineDate)
      return { label: 'UNSCHEDULED', bg: colors.warningBg, fg: colors.warning, accent: colors.warning };
    return { label: 'TASK', bg: colors.secondary, fg: colors.white, accent: colors.secondary };
  };

  const renderTaskRow = (task: Task, index: number) => {
    const badge = taskBadge(task);
    const fleet = vehicleLabel(task);
    const eircode = task.eircode?.trim() || null;
    const sub = task.description?.trim() || `Assigned by ${task.creator?.name ?? 'your team'}`;
    return (
      <Fragment key={task.id}>
        {index > 0 ? <View style={styles.jobDivider} /> : null}
        <Pressable
          style={styles.jobRow}
          onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        >
          <View style={[styles.jobAccentBar, { backgroundColor: badge.accent }]} />
          <View style={styles.jobRowContent}>
            <View style={styles.jobTimeCol}>
              {eircode ? (
                <Text style={styles.jobEircode} numberOfLines={1}>
                  {eircode}
                </Text>
              ) : null}
              <StatusPill label={badge.label} bg={badge.bg} fg={badge.fg} />
            </View>
            <View style={styles.rowBody}>
              <View style={styles.taskTitleRow}>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                {fleet ? (
                  <View style={styles.taskFleetChip}>
                    <Ionicons name="car-outline" size={11} color={colors.textMuted} />
                    <Text style={styles.taskFleetText}>FLEET</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rowSub} numberOfLines={1}>
                {sub}
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
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.eyebrow}>CALENDAR</Text>
        <Text style={styles.title}>
          {mode === 'day' ? dayTitle(selected, todayKey) : 'Previous work'}
        </Text>

        <View style={styles.segment}>
          {(['day', 'past'] as const).map(key => {
            const on = mode === key;
            return (
              <Pressable
                key={key}
                onPress={() => setMode(key)}
                style={[styles.segmentBtn, on && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextActive]}>
                  {key === 'day' ? 'Day' : 'Past'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'past' ? (
          <View style={styles.filterRow}>
            {(['from', 'to'] as const).map(edge => {
              const value = edge === 'from' ? fromDate : toDate;
              return (
                <Pressable
                  key={edge}
                  style={[styles.filterChip, value != null && styles.filterChipOn]}
                  onPress={() => setPicker(edge)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={value != null ? colors.secondary : colors.placeholder}
                  />
                  <View>
                    <Text style={styles.filterChipLabel}>
                      {edge === 'from' ? 'FROM' : 'TO'}
                    </Text>
                    <Text
                      style={[
                        styles.filterChipValue,
                        value == null && styles.filterChipValueEmpty,
                      ]}
                    >
                      {value != null ? filterLabel(value) : 'Any date'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {filtered ? (
              <Pressable
                style={styles.filterClear}
                onPress={clearFilter}
                hitSlop={6}
                accessibilityLabel="Clear date filter"
              >
                <Ionicons name="close" size={16} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        ) : (
        <>
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
              (leavesByDay.get(key)?.length ?? 0) > 0 ||
              (tasksByDay.get(key)?.length ?? 0) > 0;
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
        </>
        )}
      </View>

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: navHeight + 24 }]}
      >
        {mode === 'past' ? (
          pastCount === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {filtered ? 'Nothing in those dates' : 'No previous work'}
              </Text>
              <Text style={styles.emptyText}>
                {filtered
                  ? 'Widen the range or clear the filter.'
                  : 'Work dated before today will show up here.'}
              </Text>
            </View>
          ) : (
            pastSections.map(([key, entry]) => (
              <Fragment key={key}>
                <View style={styles.sectionHead}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionLabel}>{groupLabel(key)}</Text>
                  <Text style={styles.sectionCount}>
                    · {entry.jobs.length + entry.tasks.length}
                  </Text>
                </View>
                <View style={styles.card}>
                  {entry.jobs.map(renderJobRow)}
                  {entry.tasks.map((task, i) =>
                    renderTaskRow(task, entry.jobs.length + i),
                  )}
                </View>
              </Fragment>
            ))
          )
        ) : (
          <>
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
            <View style={styles.card}>{dayJobs.map(renderJobRow)}</View>
          </>
        ) : null}

        {dayTasks.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <View
                style={[styles.sectionDot, { backgroundColor: colors.primary }]}
              />
              <Text style={styles.sectionLabel}>TASKS</Text>
              <Text style={styles.sectionCount}>· {dayTasks.length}</Text>
            </View>
            <View style={styles.card}>{dayTasks.map(renderTaskRow)}</View>
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

        {unscheduledCount > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <View
                style={[styles.sectionDot, { backgroundColor: colors.warning }]}
              />
              <Text style={styles.sectionLabel}>UNSCHEDULED</Text>
              <Text style={styles.sectionCount}>· {unscheduledCount}</Text>
            </View>
            <Text style={styles.unscheduledHint}>
              Assigned to you with no date yet.
            </Text>
            <View style={styles.card}>
              {unscheduledJobs.map(renderJobRow)}
              {unscheduledTasks.map((task, i) =>
                renderTaskRow(task, unscheduledJobs.length + i),
              )}
            </View>
          </>
        ) : null}
          </>
        )}

        {(mode === 'past'
          ? pastCount > 0
          : !isEmpty || unscheduledCount > 0) ? (
          <Text style={styles.footer}>TAP ANY ENTRY FOR THE FULL DETAIL</Text>
        ) : null}
      </ScrollView>

      <CalendarModal
        visible={picker != null}
        value={picker === 'from' ? fromDate : toDate}
        title={picker === 'from' ? 'Show jobs from' : 'Show jobs up to'}
        onSelect={pickDate}
        onClose={() => setPicker(null)}
      />

      <AskTraydFab collapsed={collapsed} />
    </View>
  );
};

export default CalendarScreen;
