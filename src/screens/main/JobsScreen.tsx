import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

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
import { fetchJobs } from '@/store/jobsSlice';
import { type Theme } from '@/theme';
import { titleStyles } from '@/theme/constants';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { liveMetaFor } from '@/utils/liveMeta';
import {
  STATUS_TAB,
  type Job,
  type JobTabItem,
  type JobTabKey,
  type MainStackParamList,
} from '@/types';

const RANGE = 'This week';

const tabOf = (job: Job): JobTabKey | null => STATUS_TAB[job.status];

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

const weekdayLabel = (date: string | null) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
      })
    : '';

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

  const upcoming = useMemo(
    () => items.filter(j => tabOf(j) === 'upcoming'),
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
  const done = useMemo(() => items.filter(j => tabOf(j) === 'done'), [items]);

  const tabs = useMemo<JobTabItem[]>(
    () => [
      { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
      { key: 'live', label: 'Live', count: liveActive.length + livePaused.length },
      { key: 'done', label: 'Done', count: done.length },
    ],
    [upcoming.length, liveActive.length, livePaused.length, done.length],
  );

  const isLive = activeTab === 'live';
  const isDone = activeTab === 'done';

  const sections = useMemo(() => {
    if (isLive) {
      return [
        { title: 'Live', data: liveActive },
        { title: 'Paused', data: livePaused },
      ].filter(section => section.data.length > 0);
    }
    if (isDone) {
      return buildDateSections(done);
    }
    return buildDateSections(upcoming);
  }, [isLive, isDone, liveActive, livePaused, done, upcoming]);

  const openDetail = (job: Job) =>
    navigation.navigate('JobDetail', { jobId: job.id });

  const openChat = (job: Job) =>
    navigation.navigate('JobChat', { jobId: job.id });

  const onCreate = () =>
    Toast.show({ type: 'info', text1: 'Start a job — coming next.' });

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
                client={liveActive[0].customerName ?? 'Job'}
                region={liveActive[0].customerAddress ?? ''}
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
