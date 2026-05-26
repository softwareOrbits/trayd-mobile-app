import { useEffect, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '@/components/ui';
import {
  CompletedJobItem,
  JobListItem,
  JobSectionHeader,
  JobTabs,
  LiveJobItem,
  LiveNowBanner,
} from '@/components/jobs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createJob, deleteJob, fetchJobs, updateJob } from '@/store/jobsSlice';
import { type Theme } from '@/theme';
import { titleStyles } from '@/theme/constants';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { liveMetaFor } from '@/utils/liveMeta';
import type {
  Job,
  JobStatus,
  JobTabItem,
  JobTabKey,
  MainStackParamList,
} from '@/types';

const RANGE = 'This week';

const TAB_STATUSES: Record<JobTabKey, JobStatus[]> = {
  upcoming: ['scheduled', 'quote'],
  live: ['live', 'paused'],
  completed: ['completed'],
};

const NEXT_STATUS: Record<JobStatus, JobStatus> = {
  scheduled: 'live',
  quote: 'live',
  live: 'paused',
  paused: 'live',
  completed: 'scheduled',
};

const formatSectionLabel = (date: string) => {
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
  return formatted;
};

const buildSections = (jobs: Job[], tab: JobTabKey) => {
  const filtered = jobs.filter(job => TAB_STATUSES[tab].includes(job.status));
  const byDate = new Map<string, Job[]>();
  filtered.forEach(job => {
    const bucket = byDate.get(job.scheduledDate) ?? [];
    bucket.push(job);
    byDate.set(job.scheduledDate, bucket);
  });
  return [...byDate.keys()]
    .sort()
    .map(date => ({ title: formatSectionLabel(date), data: byDate.get(date) ?? [] }));
};

const weekdayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });

const weekStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

const isoWeek = (date: Date) => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return (
    1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
  );
};

const completedSectionLabel = (date: string) => {
  const value = new Date(`${date}T00:00:00`);
  const diffWeeks = Math.round(
    (weekStart(new Date()).getTime() - weekStart(value).getTime()) /
      (7 * 86400000),
  );
  if (diffWeeks <= 0) return 'This week';
  if (diffWeeks === 1) return `Last week · Wk ${isoWeek(value)}`;
  return `Wk ${isoWeek(value)}`;
};

const buildCompletedSections = (jobs: Job[]) => {
  const completed = jobs
    .filter(job => job.status === 'completed')
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  const byWeek = new Map<string, Job[]>();
  completed.forEach(job => {
    const label = completedSectionLabel(job.scheduledDate);
    const bucket = byWeek.get(label) ?? [];
    bucket.push(job);
    byWeek.set(label, bucket);
  });
  return [...byWeek.entries()].map(([title, data]) => ({ title, data }));
};

const JobsScreen = () => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const dispatch = useAppDispatch();
  const items = useAppSelector(state => state.jobs.items);
  const status = useAppSelector(state => state.jobs.status);
  const user = useAppSelector(state => state.auth.user);
  const [activeTab, setActiveTab] = useState<JobTabKey>('upcoming');

  useEffect(() => {
    dispatch(fetchJobs());
  }, [dispatch]);

  const tabs = useMemo<JobTabItem[]>(
    () => [
      {
        key: 'upcoming',
        label: 'Upcoming',
        count: items.filter(j => TAB_STATUSES.upcoming.includes(j.status)).length,
      },
      {
        key: 'live',
        label: 'Live',
        count: items.filter(j => TAB_STATUSES.live.includes(j.status)).length,
      },
      {
        key: 'completed',
        label: 'Completed',
        count: items.filter(j => j.status === 'completed').length,
      },
    ],
    [items],
  );

  const isLive = activeTab === 'live';
  const isCompleted = activeTab === 'completed';

  const liveActive = useMemo(
    () => items.filter(j => j.status === 'live'),
    [items],
  );
  const livePaused = useMemo(
    () => items.filter(j => j.status === 'paused'),
    [items],
  );

  const sections = useMemo(() => {
    if (isLive) {
      return [
        { title: 'Live', data: liveActive },
        { title: 'Paused', data: livePaused },
      ].filter(section => section.data.length > 0);
    }
    if (isCompleted) {
      return buildCompletedSections(items);
    }
    return buildSections(items, activeTab);
  }, [isLive, isCompleted, liveActive, livePaused, items, activeTab]);

  const onCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    dispatch(
      createJob({
        client: 'New client',
        region: 'Limerick',
        postcode: 'V94 0000',
        service: 'New job',
        status: 'scheduled',
        time: '09:00',
        scheduledDate: today,
      }),
    );
  };

  const onAdvance = (job: Job) =>
    dispatch(updateJob({ id: job.id, changes: { status: NEXT_STATUS[job.status] } }));

  const openChat = (job: Job) =>
    navigation.navigate('JobChat', { jobId: job.id });

  const onRemove = (job: Job) =>
    Alert.alert('Delete job', `Remove "${job.client} — ${job.service}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => dispatch(deleteJob(job.id)),
      },
    ]);

  const emptyLabel =
    status === 'loading'
      ? 'Loading jobs…'
      : status === 'failed'
        ? 'Could not load jobs'
        : `No ${activeTab} jobs`;

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

      <SectionList<Job>
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) =>
          isLive ? (
            <LiveJobItem
              job={item}
              {...liveMetaFor(item.id)}
              onPress={() => onAdvance(item)}
              onChat={() => openChat(item)}
            />
          ) : isCompleted ? (
            <CompletedJobItem
              job={item}
              weekday={weekdayLabel(item.scheduledDate)}
              onPress={() => onRemove(item)}
            />
          ) : (
            <JobListItem
              job={item}
              onPress={() => onAdvance(item)}
              onLongPress={() => onRemove(item)}
              onChat={() => openChat(item)}
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <JobSectionHeader
            label={
              isLive ? `${section.title} · ${section.data.length}` : section.title
            }
          />
        )}
        ListHeaderComponent={
          isLive && liveActive.length > 0 ? (
            <View style={styles.banner}>
              <LiveNowBanner
                client={liveActive[0].client}
                region={liveActive[0].region}
                {...liveMetaFor(liveActive[0].id)}
                assignee="just you"
                count={liveActive.length}
              />
            </View>
          ) : undefined
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
