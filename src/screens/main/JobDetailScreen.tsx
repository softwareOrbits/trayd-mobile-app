import {
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
import { StatusBadge, ReviewBadge, LiveStateBadge } from '@/components/jobs';
import {
  ActionGrid,
  Callout,
  DayRow,
  EmployerNote,
  InfoRow,
  LineItemRow,
  PausedCard,
  PhotoStrip,
  RosterChips,
  Section,
  TimerCard,
} from '@/components/jobDetail';
import { useAppSelector } from '@/store/hooks';
import { jobDetailMock } from '@/data/jobDetails';
import { demoJobs } from '@/data/demoJobs';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { MainStackParamList } from '@/types';

const JobDetailScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'JobDetail'>>();

  const storeJob = useAppSelector(state =>
    state.jobs.items.find(j => j.id === params.jobId),
  );
  const job = storeJob ?? demoJobs.find(j => j.id === params.jobId);

  const preview = () =>
    Toast.show({ type: 'info', text1: 'Preview — not wired up yet.' });
  const comingSoon = () =>
    Toast.show({ type: 'info', text1: 'Coming soon.' });

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
        {job ? `${job.client} — ${job.region}` : 'Job'}
      </Text>
      <Pressable style={styles.iconBtn} onPress={preview} hitSlop={8}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </Pressable>
    </View>
  );

  if (!job) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.missing}>
          <Text style={styles.missingText}>This job is no longer available.</Text>
        </View>
      </View>
    );
  }

  const mock = jobDetailMock(job);
  const { state } = mock;

  const badge =
    state === 'active' ? (
      <LiveStateBadge state="active" />
    ) : state === 'awaiting_review' ? (
      <ReviewBadge review="awaiting_review" />
    ) : state === 'approved' ? (
      <ReviewBadge review="approved" />
    ) : (
      <StatusBadge status={state === 'paused' ? 'paused' : 'scheduled'} />
    );

  const body = () => {
    switch (state) {
      case 'scheduled':
        return (
          <>
            <View style={styles.block}>
              <Callout variant="note" icon="alert-circle">
                <Text style={styles.calloutText}>
                  <Text style={styles.calloutStrong}>Note from Sile: </Text>
                  {mock.note}
                </Text>
              </Callout>
            </View>
            <Section title="Schedule">
              {mock.schedule!.map((e, i) => (
                <InfoRow
                  key={e.label}
                  entry={e}
                  last={i === mock.schedule!.length - 1}
                />
              ))}
            </Section>
            <Section title="Roster — on site" card={false}>
              <RosterChips members={mock.roster} />
              <Text style={styles.mutedNote}>{mock.rosterEditableNote}</Text>
            </Section>
          </>
        );

      case 'active':
        return (
          <>
            <View style={styles.block}>
              <TimerCard time={mock.timer!} onEdit={preview} />
            </View>
            <Section title="Roster" card={false}>
              <RosterChips members={mock.roster} />
            </Section>
            <Section title="Logged so far" action="Edit" onAction={preview}>
              {mock.loggedItems!.map((it, i) => (
                <LineItemRow
                  key={it.name}
                  item={it}
                  last={i === mock.loggedItems!.length - 1}
                />
              ))}
            </Section>
            <Section
              title={`Photos · ${mock.photos!.length}`}
              action="Add"
              onAction={comingSoon}
              card={false}
            >
              <PhotoStrip photos={mock.photos!} />
            </Section>
            <View style={styles.block}>
              <EmployerNote
                time={mock.employerNote!.time}
                text={mock.employerNote!.text}
              />
            </View>
            <View style={styles.block}>
              <ActionGrid
                items={[
                  { icon: 'camera-outline', label: 'Add photo', onPress: comingSoon },
                  { icon: 'receipt-outline', label: 'Add receipt', onPress: comingSoon },
                  { icon: 'cube-outline', label: 'Van stock', onPress: comingSoon },
                  { icon: 'create-outline', label: 'Add note', onPress: comingSoon },
                ]}
              />
            </View>
          </>
        );

      case 'paused':
        return (
          <>
            <View style={styles.block}>
              <PausedCard since={mock.pausedSince!} summary={mock.pausedSummary!} />
            </View>
            <Section title="Days so far">
              {mock.days!.map((d, i) => (
                <DayRow key={d.label} day={d} last={i === mock.days!.length - 1} />
              ))}
            </Section>
            <Section title="Logged so far">
              {mock.loggedItems!.map((it, i) => (
                <LineItemRow
                  key={it.name}
                  item={it}
                  last={i === mock.loggedItems!.length - 1}
                />
              ))}
            </Section>
          </>
        );

      case 'awaiting_review':
        return (
          <>
            <View style={styles.block}>
              <Callout variant="info" icon="lock-closed-outline">
                <Text style={styles.calloutMuted}>{mock.readOnlyNote}</Text>
              </Callout>
            </View>
            <Section title="Submitted">
              {mock.submitted!.map((e, i) => (
                <InfoRow
                  key={e.label}
                  entry={e}
                  last={i === mock.submitted!.length - 1}
                />
              ))}
            </Section>
            <Section title="Summary">
              <Text style={styles.cardText}>{mock.summary}</Text>
            </Section>
          </>
        );

      case 'approved':
        return (
          <>
            <View style={styles.block}>
              <Callout variant="success" icon="checkmark">
                <Text style={styles.calloutStrong}>{mock.approvalLine}</Text>
                <Text style={styles.calloutMuted}>{mock.approvalAt}</Text>
              </Callout>
            </View>
            <Section title="Final totals">
              {mock.finalTotals!.map((e, i) => (
                <InfoRow
                  key={e.label}
                  entry={e}
                  last={i === mock.finalTotals!.length - 1}
                />
              ))}
            </Section>
            <Text style={styles.footnote}>{mock.approvedFootnote}</Text>
          </>
        );
    }
  };

  const footer = () => {
    switch (state) {
      case 'scheduled':
        return (
          <Button label="Start job" leftIcon="play" fullWidth onPress={preview} />
        );
      case 'active':
        return (
          <View style={styles.footerStack}>
            <Button label="Finish job" fullWidth onPress={preview} />
            <Button
              label="Continue tomorrow"
              variant="outlined"
              color="secondary"
              fullWidth
              onPress={preview}
            />
          </View>
        );
      case 'paused':
        return (
          <View style={styles.footerStack}>
            <Button label="Resume job" leftIcon="play" fullWidth onPress={preview} />
            <Button
              label="Mark complete"
              variant="outlined"
              color="secondary"
              fullWidth
              onPress={preview}
            />
          </View>
        );
      case 'awaiting_review':
        return <Text style={styles.waitingText}>Submitted to Sile · waiting</Text>;
      case 'approved':
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
            {job.postcode} · {mock.distanceKm} km
          </Text>
        </View>
        <Text style={styles.title}>
          {job.client} — {job.region}
        </Text>
        <Text style={styles.subtitle}>
          {job.service} · {mock.daySuffix}
        </Text>

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
    missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    missingText: { color: theme.colors.textMuted },

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
      marginTop: 2,
    },
    mutedNote: {
      marginTop: 12,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    cardText: {
      paddingVertical: 14,
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 20,
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
