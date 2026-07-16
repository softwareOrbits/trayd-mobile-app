import { Fragment, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { StatusPill } from '@/components/ui';
import type { DashboardJob } from '@/services/dashboard';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';
import { JOB_TYPE_LABEL, type MainStackParamList } from '@/types';
import { useDashboard } from './DashboardProvider';

type JobTone = 'live' | 'next' | 'task';

const todayLabel = (d: Date) => {
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
  const dayMonth = d
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toUpperCase();
  return `TODAY · ${weekday} ${dayMonth}`;
};

const localityOf = (addr: string | null) => {
  if (!addr) return '';
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[1] : '';
};

/** Cumulative time worked, coarse enough to fit the row: 3d 4h · 4h 20m · 45m. */
const formatWorked = (hours: number) => {
  const mins = Math.max(0, Math.round(hours * 60));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};

const statusWord = (status: DashboardJob['status']) =>
  status === 'active' ? 'running' : status === 'paused' ? 'paused' : 'scheduled';

/**
 * A running job's hours keep accruing between fetches — advance the RPC's value
 * locally so the row doesn't sit frozen until the next refresh.
 */
const elapsedOf = (job: DashboardJob, sinceMs: number, now: number) =>
  job.myRunning
    ? job.myHours + Math.max(0, (now - sinceMs) / 3_600_000)
    : job.myHours;

export const TodayJobs = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { data } = useDashboard();

  const jobs = useMemo(() => data?.today ?? [], [data]);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stamp = Date.now();
    setFetchedAt(stamp);
    setNow(stamp);
  }, [data]);

  const anyRunning = jobs.some(j => j.myRunning);
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [anyRunning]);

  const pillFor = (tone: JobTone) => {
    if (tone === 'live') return { bg: colors.primary, fg: colors.onPrimary };
    if (tone === 'next') return { bg: colors.secondary, fg: colors.white };
    return { bg: colors.surfaceMuted, fg: colors.textMuted };
  };

  const accentFor = (tone: JobTone) =>
    tone === 'live'
      ? colors.primary
      : tone === 'next'
      ? colors.secondary
      : colors.borderMuted;

  const items = jobs.map(job => {
    const live = job.status === 'active' || job.status === 'paused';
    const name = job.customerName ?? JOB_TYPE_LABEL[job.jobType];
    const locality = localityOf(job.customerAddress);
    return {
      key: job.jobId,
      // A live job's running clock is worth more than its eircode; a scheduled
      // one shows where it is instead of when it was booked.
      time: live ? formatWorked(elapsedOf(job, fetchedAt, now)) : null,
      eircode: live ? null : job.customerEircode?.trim() || null,
      status: live ? (job.status === 'paused' ? 'paused' : 'live') : 'next',
      tone: (live ? 'live' : 'next') as JobTone,
      title: locality ? `${name} — ${locality}` : name,
      sub: `${JOB_TYPE_LABEL[job.jobType]} · ${statusWord(job.status)}`,
    };
  });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionHeadLabel}>{todayLabel(new Date())}</Text>
        <Text style={styles.sectionHeadMeta}>
          {items.length} job{items.length === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={[styles.card, styles.listCard]}>
        {items.length === 0 ? (
          <View style={styles.jobRow}>
            <View
              style={[styles.jobAccentBar, { backgroundColor: colors.borderMuted }]}
            />
            <View style={styles.jobRowContent}>
              <View style={styles.rowBody}>
                <Text style={styles.jobTitle}>No jobs today</Text>
                <Text style={styles.rowSub}>
                  Nothing scheduled — enjoy the quiet.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          items.map((item, index) => {
            const pill = pillFor(item.tone);
            return (
              <Fragment key={item.key}>
                {index > 0 ? <View style={styles.jobDivider} /> : null}
                <Pressable
                  style={styles.jobRow}
                  onPress={() =>
                    navigation.navigate('JobDetail', { jobId: item.key })
                  }
                >
                  <View
                    style={[
                      styles.jobAccentBar,
                      { backgroundColor: accentFor(item.tone) },
                    ]}
                  />
                  <View style={styles.jobRowContent}>
                    <View style={styles.jobTimeCol}>
                      {item.time ? (
                        <Text style={styles.jobTime} numberOfLines={1}>
                          {item.time}
                        </Text>
                      ) : null}
                      {item.eircode ? (
                        <Text style={styles.jobEircode} numberOfLines={1}>
                          {item.eircode}
                        </Text>
                      ) : null}
                      <StatusPill label={item.status} bg={pill.bg} fg={pill.fg} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.jobTitle}>{item.title}</Text>
                      <Text style={styles.rowSub}>{item.sub}</Text>
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
          })
        )}
      </View>
    </View>
  );
};

export default TodayJobs;
