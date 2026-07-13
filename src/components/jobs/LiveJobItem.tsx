import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Avatar, Button } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { LiveJobItemProps } from '@/types';
import LiveStateBadge from './LiveStateBadge';
import TimerPill from './TimerPill';
import JobTypeTag from './JobTypeTag';

/** Who's on the clock, in words — a bare count made you do the arithmetic. */
const crewLabel = (onSite: number, myWorking: boolean) => {
  const others = onSite - (myWorking ? 1 : 0);
  if (others > 0) return 'crew working';
  if (myWorking) return 'just you';
  return 'nobody on site';
};

export const LiveJobItem = ({
  job,
  elapsed,
  day,
  myState,
  onSite,
  onPress,
  onChat,
  onTimer,
}: LiveJobItemProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const paused = job.status === 'paused';
  // Two facts, two elements: the badge is the CREW's state (ACTIVE / PAUSED),
  // the timer pill is MINE. The pill already shows my elapsed time, so it also
  // carries my status — "Paused · 05:32:11" against an ACTIVE badge is the case
  // where the lads are still on site but my own clock has stopped.
  const myWorking = myState === 'working';

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar name={job.customerName ?? 'J'} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {job.customerName ?? 'Customer'}
          </Text>
          <View style={styles.trailing}>
            <Text style={styles.relative}>{paused ? 'Yest' : 'Now'}</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.placeholder}
            />
          </View>
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {job.customerAddress ?? '—'}
        </Text>

        <View style={styles.metaRow}>
          <LiveStateBadge state={paused ? 'paused' : 'active'} />
          <JobTypeTag type={job.jobType} />
          <Text style={styles.day} numberOfLines={1}>
            {`· day ${day} · ${crewLabel(onSite, myWorking)}`}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Chat"
            leftIcon="chatbubble-ellipses-outline"
            variant="outlined"
            color="secondary"
            size="sm"
            onPress={onChat}
            style={styles.chat}
          />
          <TimerPill time={elapsed} onPress={onTimer} paused={!myWorking} />
        </View>
      </View>
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 16,
      borderBottomWidth: 0.2,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    body: { flex: 1, gap: 5 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: {
      flex: 1,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    trailing: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    relative: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textMuted,
    },
    subtitle: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    day: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 6,
    },
    chat: {
      minWidth: 96,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
      backgroundColor: theme.colors.background,
    },
  });

export default LiveJobItem;
