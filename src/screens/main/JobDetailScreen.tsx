import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { Button } from '@/components/ui';
import { StatusBadge, LiveStateBadge } from '@/components/jobs';
import { Callout, InfoRow, Section } from '@/components/jobDetail';
import { fetchJobDetail, updateJobStatus } from '@/services/jobs';
import { detailStateFor } from '@/data/jobDetails';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import {
  JOB_TYPE_LABEL,
  type JobDetail,
  type JobStatus,
  type MainStackParamList,
} from '@/types';

const fmtDate = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : null);

const joinDot = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ');

const money = (n: number) => `€${n.toFixed(2)}`;

const JobDetailScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'JobDetail'>>();

  const dispatch = useAppDispatch();
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchJobDetail(params.jobId)
      .then(d => active && setDetail(d))
      .catch(e => active && setError(e?.message ?? 'Something went wrong.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.jobId]);

  // Real status transition (Start / Finish / Pause / Resume / Mark complete).
  const transition = async (
    next: JobStatus,
    label: string,
    goBackAfter = false,
  ) => {
    if (!detail || acting) return;
    setActing(true);
    try {
      await updateJobStatus(detail.id, next);
      dispatch(fetchJobs());
      Toast.show({ type: 'success', text1: label });
      if (goBackAfter) {
        navigation.goBack();
      } else {
        setDetail(await fetchJobDetail(detail.id));
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not update job.',
      });
    } finally {
      setActing(false);
    }
  };

  const preview = () =>
    Toast.show({ type: 'info', text1: 'Not wired up yet.' });

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable
        style={styles.iconBtn}
        onPress={() => navigation.goBack()}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={colors.secondary} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {detail?.customerName ?? 'Job'}
      </Text>
      <Pressable style={styles.iconBtn} onPress={preview} hitSlop={8}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.missingText}>
            {error ?? 'This job is no longer available.'}
          </Text>
        </View>
      </View>
    );
  }

  const state = detailStateFor(detail.status);
  const scheduledFor = joinDot(
    fmtDate(detail.scheduledDate),
    fmtTime(detail.scheduledStartTime),
  );
  const placeholder = (
    <Text style={styles.placeholder}>
      Logged items, photos &amp; crew appear here once work starts.
    </Text>
  );

  const badge =
    state === 'active' ? (
      <LiveStateBadge state="active" />
    ) : (
      <StatusBadge status={detail.status} />
    );

  // Shared "details" rows used by most states.
  const detailsRows = [
    scheduledFor ? { label: 'Scheduled', value: scheduledFor } : null,
    { label: 'Type', value: JOB_TYPE_LABEL[detail.jobType] },
    detail.customerPhone
      ? { label: 'Customer phone', value: detail.customerPhone }
      : null,
    detail.primaryMemberName
      ? {
          label: 'Assigned to',
          value: joinDot(detail.primaryMemberName, detail.primaryMemberRole),
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const body = () => {
    switch (state) {
      case 'awaiting_review':
        return (
          <>
            <View style={styles.block}>
              <Callout variant="info" icon="lock-closed-outline">
                <Text style={styles.calloutMuted}>
                  Read-only — you&apos;ll get a push when it&apos;s approved.
                </Text>
              </Callout>
            </View>
            <Section title="Submitted">
              {[
                detail.totalHours != null
                  ? { label: 'Total hours', value: `${detail.totalHours}h` }
                  : null,
                { label: 'Materials total', value: money(detail.invoiceTotal) },
                detail.customerName
                  ? { label: 'Customer', value: detail.customerName }
                  : null,
              ]
                .filter(Boolean)
                .map((e, i, a) => (
                  <InfoRow key={e!.label} entry={e!} last={i === a.length - 1} />
                ))}
            </Section>
            {detail.summary ? (
              <Section title="Summary">
                <Text style={styles.cardText}>{detail.summary}</Text>
              </Section>
            ) : null}
          </>
        );

      case 'approved':
        return (
          <>
            <View style={styles.block}>
              <Callout variant="success" icon="checkmark">
                <Text style={styles.calloutStrong}>
                  {detail.status === 'paid'
                    ? 'This job is paid.'
                    : detail.status === 'downloaded'
                    ? 'Invoice downloaded.'
                    : 'This job is approved.'}
                </Text>
              </Callout>
            </View>
            <Section title="Final totals">
              {[
                detail.totalHours != null
                  ? { label: 'Total hours', value: `${detail.totalHours}h` }
                  : null,
                { label: 'Invoice total', value: money(detail.invoiceTotal) },
              ]
                .filter(Boolean)
                .map((e, i, a) => (
                  <InfoRow key={e!.label} entry={e!} last={i === a.length - 1} />
                ))}
            </Section>
            <Text style={styles.footnote}>
              The invoice itself stays with your employer. Payment status
              isn&apos;t shown here.
            </Text>
          </>
        );

      case 'cancelled':
        return (
          <View style={styles.block}>
            <Callout variant="note" icon="close-circle-outline">
              <Text style={styles.calloutStrong}>This job was cancelled.</Text>
            </Callout>
          </View>
        );

      // scheduled / active / paused share the same top-half layout
      default:
        return (
          <>
            {detail.employerNote ? (
              <View style={styles.block}>
                <Callout variant="note" icon="alert-circle">
                  <Text style={styles.calloutText}>
                    <Text style={styles.calloutStrong}>
                      Note from {detail.createdByName ?? 'your employer'}:{' '}
                    </Text>
                    {detail.employerNote}
                  </Text>
                </Callout>
              </View>
            ) : null}
            {state !== 'scheduled' ? (
              <View style={styles.block}>
                <Callout variant="info" icon="time-outline">
                  <Text style={styles.calloutMuted}>
                    {state === 'paused' ? 'Job is paused.' : 'Job is in progress.'}
                  </Text>
                </Callout>
              </View>
            ) : null}
            <Section title="Details">
              {detailsRows.map((e, i) => (
                <InfoRow
                  key={e.label}
                  entry={e}
                  last={i === detailsRows.length - 1}
                />
              ))}
            </Section>
            {placeholder}
          </>
        );
    }
  };

  const footer = () => {
    switch (state) {
      case 'scheduled':
        return (
          <Button
            label="Start job"
            leftIcon="play"
            fullWidth
            loading={acting}
            onPress={() => transition('active', 'Job started.')}
          />
        );
      case 'active':
        return (
          <View style={styles.footerStack}>
            <Button
              label="Finish job"
              fullWidth
              loading={acting}
              onPress={() =>
                transition('awaiting_review', 'Submitted for review.', true)
              }
            />
            <Button
              label="Continue tomorrow"
              variant="outlined"
              color="secondary"
              fullWidth
              disabled={acting}
              onPress={() => transition('paused', 'Job paused.')}
            />
          </View>
        );
      case 'paused':
        return (
          <View style={styles.footerStack}>
            <Button
              label="Resume job"
              leftIcon="play"
              fullWidth
              loading={acting}
              onPress={() => transition('active', 'Job resumed.')}
            />
            <Button
              label="Mark complete"
              variant="outlined"
              color="secondary"
              fullWidth
              disabled={acting}
              onPress={() =>
                transition('awaiting_review', 'Submitted for review.', true)
              }
            />
          </View>
        );
      case 'awaiting_review':
        return (
          <Text style={styles.waitingText}>Submitted · waiting for approval</Text>
        );
      default:
        return (
          <Button
            label="Back to jobs"
            variant="outlined"
            color="secondary"
            fullWidth
            onPress={() => navigation.goBack()}
          />
        );
    }
  };

  return (
    <View style={styles.flex}>
      {header}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          {badge}
          <Text style={styles.metaText}>
            {joinDot(detail.jobNumber, JOB_TYPE_LABEL[detail.jobType])}
          </Text>
        </View>
        <Text style={styles.title}>{detail.customerName ?? 'Customer'}</Text>
        {detail.customerAddress ? (
          <Text style={styles.subtitle}>{detail.customerAddress}</Text>
        ) : null}

        {body()}

        <View style={styles.footer}>{footer()}</View>
      </ScrollView>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.textMuted,
      backgroundColor: theme.colors.background,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    missingText: { color: theme.colors.textMuted, textAlign: 'center' },

    content: { paddingHorizontal: 20, paddingTop: 16, flexGrow: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },
    title: {
      marginTop: 8,
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    subtitle: {
      marginTop: 2,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },

    block: { marginTop: 18 },
    calloutText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },
    calloutStrong: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      fontSize: theme.typography.size.sm,
    },
    calloutMuted: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    cardText: {
      paddingVertical: 14,
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },
    placeholder: {
      marginTop: 18,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      fontStyle: 'italic',
    },
    footnote: {
      marginTop: 16,
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    waitingText: {
      textAlign: 'center',
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
      paddingVertical: 12,
    },
    footer: { marginTop: 'auto', paddingTop: 24 },
    footerStack: { gap: 12 },
  });

export default JobDetailScreen;
