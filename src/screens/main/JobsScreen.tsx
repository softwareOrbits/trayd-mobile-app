import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button } from '@/components/ui';
import {
  CompletedJobItem,
  JobListItem,
  JobSectionHeader,
  JobTabs,
  LiveJobItem,
  LiveNowBanner,
} from '@/components/jobs';
import { useSync } from '@/offline';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useTheme, type Theme } from '@/theme';
import { titleStyles } from '@/theme/constants';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { formatElapsed } from '@/utils/liveMeta';
import {
  fetchJobSegments,
  segmentsElapsedHours,
  type JobSegment,
} from '@/services/jobs';
import {
  STATUS_GROUP,
  type Job,
  type JobStatusGroup,
  type JobTabItem,
  type JobTabKey,
  type MainStackParamList,
} from '@/types';

const EMPTY_LABEL: Record<JobTabKey, string> = {
  today: 'jobs scheduled today',
  week: 'jobs scheduled this week',
  live: 'live jobs',
  resume: 'jobs to resume',
  done: 'completed jobs',
};

const RANGE = 'This week';

const groupOf = (job: Job): JobStatusGroup | null => STATUS_GROUP[job.status];

/** Local YYYY-MM-DD key (ISO dates sort/compare lexicographically). */
const dateKey = (d: Date) => {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Monday-anchored bounds of the week containing `base`. */
const weekBounds = (base: Date) => {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dateKey(start), end: dateKey(end) };
};

const fmtSectionLabel = (date: string | null) => {
  if (!date) return 'Unscheduled';
  const value = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((value.getTime() - today.getTime()) / 86400000);
  const formatted = value.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (days === 0) return `Today · ${formatted}`;
  if (days === 1) return `Tomorrow · ${formatted}`;
  if (days === -1) return `Yesterday · ${formatted}`;
  return formatted;
};

const buildDateSections = (jobs: Job[]) => {
  const byDate = new Map<string, Job[]>();
  jobs.forEach(job => {
    const key = job.scheduledDate ?? '';
    const bucket = byDate.get(key) ?? [];
    bucket.push(job);
    byDate.set(key, bucket);
  });
  return [...byDate.keys()]
    .sort()
    .map(date => ({
      title: fmtSectionLabel(date || null),
      data: byDate.get(date) ?? [],
    }));
};

const liveSections = (active: Job[], paused: Job[]) =>
  [
    { title: 'Live', data: active },
    { title: 'Paused', data: paused },
  ].filter(s => s.data.length > 0);

const weekdayLabel = (date: string | null) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
      })
    : '';

const JobsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const dispatch = useAppDispatch();
  const items = useAppSelector(state => state.jobs.items);
  const status = useAppSelector(state => state.jobs.status);
  const user = useAppSelector(state => state.auth.user);
  const { pending, flushNow } = useSync();
  const [activeTab, setActiveTab] = useState<JobTabKey>('today');
  const [refreshing, setRefreshing] = useState(false);

  // Real per-job clock from job_time_entries segments: closed hours are frozen,
  // the open segment (active jobs only) keeps ticking. Paused jobs have no open
  // segment, so their timer stops — no more mock time running in the background.
  const [segMeta, setSegMeta] = useState<Map<string, JobSegment[]>>(new Map());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    dispatch(fetchJobs());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchJobs()).unwrap();
    } catch {
      // error surfaced via the slice's `status`/empty state
    } finally {
      setRefreshing(false);
    }
  };

  // Date anchors computed once per mount (a tab switch shouldn't recompute the
  // week, and the per-second timer tick must not invalidate these filters).
  const todayKey = useMemo(() => dateKey(new Date()), []);
  const week = useMemo(() => weekBounds(new Date()), []);

  const scheduled = useMemo(
    () => items.filter(j => groupOf(j) === 'upcoming'),
    [items],
  );
  const todayJobs = useMemo(
    () => scheduled.filter(j => j.scheduledDate === todayKey),
    [scheduled, todayKey],
  );
  // This Week: anything scheduled within the current Mon–Sun window (today
  // included), plus not-yet-dated jobs so they're never hidden.
  const weekJobs = useMemo(
    () =>
      scheduled.filter(
        j =>
          !j.scheduledDate ||
          (j.scheduledDate >= week.start && j.scheduledDate <= week.end),
      ),
    [scheduled, week],
  );
  const liveActive = useMemo(
    () => items.filter(j => j.status === 'active'),
    [items],
  );
  const livePaused = useMemo(
    () => items.filter(j => j.status === 'paused'),
    [items],
  );
  const done = useMemo(() => items.filter(j => groupOf(j) === 'done'), [items]);

  // Fetch segments for the jobs shown in the Live tab and fold them into a map.
  const liveIds = useMemo(
    () => [...liveActive, ...livePaused].map(j => j.id),
    [liveActive, livePaused],
  );
  const liveIdsKey = [...liveActive, ...livePaused]
    .map(j => `${j.id}:${j.status}:${j.updatedAt ?? ''}`)
    .join(',');
  useEffect(() => {
    if (!liveIds.length) {
      setSegMeta(new Map());
      return;
    }
    let active = true;
    Promise.all(
      liveIds.map(id =>
        fetchJobSegments(id)
          .then(segs => [id, segs] as const)
          .catch(() => [id, [] as JobSegment[]] as const),
      ),
    ).then(results => {
      if (active) setSegMeta(new Map(results));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveIdsKey]);

  // Tick once a second only while at least one job is actually active.
  useEffect(() => {
    if (!liveActive.length) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [liveActive.length]);

  const metaFor = (job: Job) => {
    const segs = segMeta.get(job.id);
    if (!segs?.length) return { elapsed: '00:00:00', day: 1 };
    const { hours } = segmentsElapsedHours(segs, now);
    const days = new Set(segs.map(s => s.jobDayId).filter(Boolean)).size;
    return { elapsed: formatElapsed(hours * 3_600_000), day: Math.max(1, days) };
  };

  const tabs = useMemo<JobTabItem[]>(
    () => [
      { key: 'today', label: 'Today', icon: 'today-outline', count: todayJobs.length },
      { key: 'week', label: 'This Week', icon: 'calendar-outline', count: weekJobs.length },
      { key: 'live', label: 'Live', icon: 'play-circle-outline', count: liveActive.length },
      { key: 'resume', label: 'Resume', icon: 'pause-circle-outline', count: livePaused.length },
      { key: 'done', label: 'Done', icon: 'checkmark-done-outline', count: done.length },
    ],
    [todayJobs.length, weekJobs.length, liveActive.length, livePaused.length, done.length],
  );

  const showTimer = activeTab === 'live' || activeTab === 'resume';
  const isDone = activeTab === 'done';

  const sections = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return buildDateSections(todayJobs);
      case 'week':
        return buildDateSections(weekJobs);
      case 'live':
        return liveSections(liveActive, []);
      case 'resume':
        return liveSections([], livePaused);
      case 'done':
        return buildDateSections(done);
      default:
        return [];
    }
  }, [activeTab, todayJobs, weekJobs, liveActive, livePaused, done]);

  const openDetail = (job: Job) =>
    navigation.navigate('JobDetail', { jobId: job.id });

  const openChat = (job: Job) =>
    navigation.navigate('JobChat', { jobId: job.id });

  const onCreate = () => navigation.navigate('StartJob');

  const emptyLabel =
    status === 'loading'
      ? 'Loading jobs…'
      : status === 'failed'
        ? 'Could not load jobs'
        : `No ${EMPTY_LABEL[activeTab]}`;

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.eyebrow}>
          {`${(user?.name ?? user?.email ?? 'Jobs').toUpperCase()}   ·   ${RANGE.toUpperCase()}`}
        </Text>
        <Text style={styles.title}>Jobs</Text>
        <View style={styles.tabs}>
          <JobTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
        </View>
      </View>

      {pending > 0 ? (
        <View style={styles.offlineWrap}>
          <Pressable style={styles.offlineCard} onPress={() => flushNow()}>
            <View style={styles.offlineIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color={colors.white}
              />
            </View>
            <View style={styles.offlineBody}>
              <Text style={styles.offlineTitle}>Working offline</Text>
              <Text style={styles.offlineSub} numberOfLines={1}>
                {`${pending} item${pending === 1 ? '' : 's'} queued · auto-syncs when signal returns`}
              </Text>
            </View>
            <Text style={styles.offlineAction}>Details</Text>
          </Pressable>
        </View>
      ) : null}

      <SectionList<Job>
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) =>
          showTimer ? (
            <LiveJobItem
              job={item}
              {...metaFor(item)}
              onPress={() => openDetail(item)}
              onChat={() => openChat(item)}
            />
          ) : isDone ? (
            <CompletedJobItem
              job={item}
              weekday={weekdayLabel(item.scheduledDate)}
              onPress={() => openDetail(item)}
            />
          ) : (
            <JobListItem
              job={item}
              onPress={() => openDetail(item)}
              onStart={() => openDetail(item)}
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <JobSectionHeader
            label={
              showTimer
                ? `${section.title} · ${section.data.length}`
                : section.title
            }
            divider={
              !showTimer &&
              !isDone &&
              sections.findIndex(s => s.title === section.title) > 0
            }
          />
        )}
        ListHeaderComponent={
          activeTab === 'live' && liveActive.length > 0 ? (
            <View style={styles.banner}>
              <LiveNowBanner
                client={liveActive[0].customerName ?? 'Job'}
                region={liveActive[0].customerAddress ?? ''}
                {...metaFor(liveActive[0])}
                assignee="just you"
                count={liveActive.length}
              />
            </View>
          ) : undefined
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyLabel}</Text>
          </View>
        }
      />

      <Button
        label="Start a new job"
        leftIcon="add"
        onPress={onCreate}
        style={[styles.fab, { bottom: insets.bottom - 10 }]}
      />
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 8,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.textMuted,
    },
    eyebrow: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
    },
    title: titleStyles,
    tabs: { marginTop: 14 },
    banner: { paddingTop: 16, paddingBottom: 4 },
    offlineWrap: { paddingHorizontal: 20, paddingTop: 12 },
    offlineCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    offlineIcon: {
      width: 34,
      height: 34,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    offlineBody: { flex: 1, gap: 2 },
    offlineTitle: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    offlineSub: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },
    offlineAction: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 120,
      backgroundColor: theme.colors.surface,
      flexGrow: 1,
    },
    empty: { paddingTop: 64, alignItems: 'center' },
    emptyText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textMuted,
      textTransform: 'capitalize',
    },
    fab: {
      position: 'absolute',
      right: 16,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 22,
      shadowColor: theme.colors.black,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  });

export default JobsScreen;
