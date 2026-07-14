import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { FloatingActionButton, useBottomNavHeight } from '@/components/ui';
import {
  CompletedDateFilter,
  CompletedJobItem,
  JobListItem,
  JobSectionHeader,
  JobTabs,
  LiveJobItem,
  LiveNowBanner,
} from '@/components/jobs';
import { useOnline, useSync } from '@/offline';
import { getMappedId } from '@/offline/idRemap';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { useCollapsibleOnScroll } from '@/utils/useCollapsibleOnScroll';
import { formatElapsed } from '@/utils/liveMeta';
import {
  fetchJobSegments,
  segmentsElapsedHours,
  type JobSegment,
} from '@/services/jobs';
import { loadJobCache, saveJobCache } from '@/services/jobCache';
import { fetchActiveRoster, getMyMemberRef } from '@/services/member';
import {
  type Job,
  type JobTabItem,
  type JobTabKey,
  type MainStackParamList,
  type MainTabParamList,
  type MyJobState,
} from '@/types';
import { makeJobsStyles } from '@/styles/jobs.styles';
import {
  EMPTY_LABEL,
  groupOf,
  buildDateSections,
  liveSections,
  weekdayLabel,
} from '@/components/jobs/jobsScreen.helpers';

const JobsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeJobsStyles);
  const insets = useSafeAreaInsets();
  const navHeight = useBottomNavHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Jobs'>>();
  const dispatch = useAppDispatch();
  const serverItems = useAppSelector(state => state.jobs.items);
  const pendingItems = useAppSelector(state => state.pendingJobs.items);
  const items = useMemo(() => {
    const serverIds = new Set(serverItems.map(j => j.id));
    const visiblePending = pendingItems.filter(p => {
      if (serverIds.has(p.id)) return false;
      const realId = getMappedId(p.id);
      return !(realId && serverIds.has(realId));
    });
    return [...visiblePending, ...serverItems];
  }, [serverItems, pendingItems]);
  const status = useAppSelector(state => state.jobs.status);
  const user = useAppSelector(state => state.auth.user);
  const isOwner = useAppSelector(state => state.auth.isOwner);
  const { pending, flushNow } = useSync();
  const online = useOnline();
  const [topTab, setTopTab] = useState<'jobs' | 'tasks'>('jobs');
  const [activeTab, setActiveTab] = useState<JobTabKey>(
    route.params?.initialTab ?? 'scheduled',
  );
  const [refreshing, setRefreshing] = useState(false);
  const [doneFrom, setDoneFrom] = useState<string | null>(null);
  const [doneTo, setDoneTo] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const { collapsed, onScroll } = useCollapsibleOnScroll();

  // A time edit changes segments but not the job row, so the segment key below
  // never moves — refetch on focus so an edit made on the detail screen lands.
  const [refreshTick, setRefreshTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRefreshTick(t => t + 1);
    }, []),
  );

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
  }, [route.params?.initialTab]);

  // Real per-job clock from job_time_entries segments: closed hours are frozen,
  // the open segment (active jobs only) keeps ticking. Paused jobs have no open
  // segment, so their timer stops — no more mock time running in the background.
  const [segMeta, setSegMeta] = useState<Map<string, JobSegment[]>>(new Map());
  const [startMeta, setStartMeta] = useState<Map<string, string>>(new Map());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    dispatch(fetchJobs());
    fetchActiveRoster().catch(() => {});
    flushNow().catch(() => {});
  }, [dispatch, flushNow]);

  useEffect(() => {
    getMyMemberRef()
      .then(r => setMyMemberId(r.id))
      .catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    flushNow(true).catch(() => {});
    try {
      await dispatch(fetchJobs()).unwrap();
    } catch {
      // error surfaced via the slice's `status`/empty state
    } finally {
      setRefreshing(false);
    }
  };

  const scheduled = useMemo(
    () => items.filter(j => groupOf(j) === 'upcoming'),
    [items],
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
  const doneDates = useMemo(
    () => done.map(j => j.scheduledDate).filter((d): d is string => d != null),
    [done],
  );
  const doneFiltered = useMemo(() => {
    if (!doneFrom && !doneTo) return done;
    const lo = doneFrom && doneTo && doneFrom > doneTo ? doneTo : doneFrom;
    const hi = doneFrom && doneTo && doneFrom > doneTo ? doneFrom : doneTo;
    return done.filter(j => {
      const d = j.scheduledDate;
      return d != null && (!lo || d >= lo) && (!hi || d <= hi);
    });
  }, [done, doneFrom, doneTo]);

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
      setStartMeta(new Map());
      return;
    }
    let active = true;
    Promise.all(
      liveIds.map(async id => {
        const fetched = online
          ? await fetchJobSegments(id).catch(() => null)
          : null;
        const cached = await loadJobCache(id);
        if (fetched) saveJobCache(id, { segments: fetched });
        const segs = fetched ?? cached?.segments ?? [];
        return { id, segs, startedAt: cached?.detail?.startedAt ?? null };
      }),
    ).then(results => {
      if (!active) return;
      setSegMeta(new Map(results.map(r => [r.id, r.segs] as const)));
      setStartMeta(
        new Map(
          results.flatMap(r =>
            r.startedAt ? [[r.id, r.startedAt] as const] : [],
          ),
        ),
      );
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveIdsKey, online, refreshTick]);

  // Tick once a second only while at least one job is actually active.
  useEffect(() => {
    if (!liveActive.length) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [liveActive.length]);

  const metaFor = (job: Job) => {
    const all = segMeta.get(job.id);
    const segs =
      myMemberId && all ? all.filter(s => s.memberId === myMemberId) : all;
    if (segs?.length) {
      const { hours } = segmentsElapsedHours(segs, now);
      const days = new Set(segs.map(s => s.jobDayId).filter(Boolean)).size;
      return { elapsed: formatElapsed(hours * 3_600_000), day: Math.max(1, days) };
    }
    const startedAt = startMeta.get(job.id);
    if (job.status === 'active' && startedAt) {
      return {
        elapsed: formatElapsed(now - new Date(startedAt).getTime()),
        day: 1,
      };
    }
    return { elapsed: '00:00:00', day: 1 };
  };

  /** Distinct members with an open segment — who is actually on the clock now. */
  const onSiteFor = (job: Job): number => {
    const all = segMeta.get(job.id);
    if (!all?.length) return job.status === 'paused' ? 0 : 1;
    return new Set(
      all.filter(s => s.finishTime == null).map(s => s.memberId),
    ).size;
  };

  // My clock on this job, derived from my own segments — not jobs.status, which
  // describes the crew. I can be paused on a job the crew is still working.
  const myStateFor = (job: Job): MyJobState => {
    const all = segMeta.get(job.id);
    if (!myMemberId || !all?.length) {
      return job.status === 'paused' ? 'paused' : 'working';
    }
    const mine = all.filter(s => s.memberId === myMemberId);
    if (!mine.length) return 'not_started';
    return mine.some(s => s.finishTime == null) ? 'working' : 'paused';
  };

  const tabs = useMemo<JobTabItem[]>(
    () => [
      { key: 'scheduled', label: 'Scheduled', icon: 'calendar-outline', count: scheduled.length },
      { key: 'live', label: 'Live', icon: 'play-circle-outline', count: liveActive.length },
      { key: 'resume', label: 'Resume', icon: 'pause-circle-outline', count: livePaused.length },
      { key: 'done', label: 'Done', icon: 'checkmark-done-outline', count: doneFiltered.length },
    ],
    [scheduled.length, liveActive.length, livePaused.length, doneFiltered.length],
  );

  const showTimer = activeTab === 'live' || activeTab === 'resume';
  const isDone = activeTab === 'done';

  const goToAdjacentTab = (dir: number) =>
    setActiveTab(prev => {
      const order = tabs.map(t => t.key);
      const next = order.indexOf(prev) + dir;
      return next < 0 || next >= order.length ? prev : order[next];
    });

  const swipeTabs = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onEnd(e => {
          if (e.translationX <= -50 || e.velocityX <= -500) {
            runOnJS(goToAdjacentTab)(1);
          } else if (e.translationX >= 50 || e.velocityX >= 500) {
            runOnJS(goToAdjacentTab)(-1);
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabs],
  );

  const sections = useMemo(() => {
    switch (activeTab) {
      case 'scheduled':
        return buildDateSections(scheduled);
      case 'live':
        return liveSections(liveActive, []);
      case 'resume':
        return liveSections([], livePaused);
      case 'done':
        return buildDateSections(doneFiltered);
      default:
        return [];
    }
  }, [activeTab, scheduled, liveActive, livePaused, doneFiltered]);

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
          {(user?.name ?? user?.email ?? 'Jobs').toUpperCase()}
        </Text>
        <Text style={styles.title}>Jobs</Text>
        <View style={styles.segment}>
          {(['jobs', 'tasks'] as const).map(key => {
            const isActive = topTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTopTab(key)}
                style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
              >
                <Text
                  style={[styles.segmentText, isActive && styles.segmentTextActive]}
                >
                  {key === 'jobs' ? 'Jobs' : 'Tasks'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {topTab === 'jobs' ? (
          <View style={styles.tabs}>
            <JobTabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
          </View>
        ) : null}
      </View>

      {topTab === 'jobs' && pending > 0 ? (
        <View style={styles.offlineWrap}>
          <Pressable style={styles.offlineCard} onPress={() => flushNow(true)}>
            <View style={styles.offlineIcon}>
              <Ionicons
                name={online ? 'sync-outline' : 'cloud-offline-outline'}
                size={18}
                color={colors.white}
              />
            </View>
            <View style={styles.offlineBody}>
              <Text style={styles.offlineTitle}>
                {online ? 'Syncing…' : 'Working offline'}
              </Text>
              <Text style={styles.offlineSub} numberOfLines={1}>
                {online
                  ? `${pending} item${pending === 1 ? '' : 's'} uploading…`
                  : `${pending} item${
                      pending === 1 ? '' : 's'
                    } queued · auto-syncs when signal returns`}
              </Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {topTab === 'jobs' ? (
        <GestureDetector gesture={swipeTabs}>
        <SectionList<Job>
        sections={sections}
        extraData={showTimer ? now : null}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={item => item.id}
        renderItem={({ item }) =>
          showTimer ? (
            <LiveJobItem
              job={item}
              {...metaFor(item)}
              myState={myStateFor(item)}
              onSite={onSiteFor(item)}
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
          ) : activeTab === 'done' ? (
            <CompletedDateFilter
              from={doneFrom}
              to={doneTo}
              count={doneFiltered.length}
              jobDates={doneDates}
              onChange={(f, t) => {
                setDoneFrom(f);
                setDoneTo(t);
              }}
            />
          ) : undefined
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingBottom: navHeight + 24 }]}
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
        </GestureDetector>
      ) : (
        <View style={styles.tasksBody}>
          <View style={styles.tasksIcon}>
            <Ionicons name="checkbox-outline" size={30} color={colors.textMuted} />
          </View>
          <Text style={styles.tasksTitle}>Tasks are on the way.</Text>
          <Text style={styles.tasksText}>
            We're building this out. You'll be able to track and tick off your
            tasks here soon.
          </Text>
        </View>
      )}

      {topTab === 'jobs' && isOwner ? (
        <FloatingActionButton
          label="Start a new job"
          icon="add"
          onPress={onCreate}
          collapsed={collapsed}
          style={{ bottom: navHeight + 16 }}
        />
      ) : null}
    </View>
  );
};

export default JobsScreen;
