import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Avatar, Button } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { JobItemProps } from '@/types';
import StatusBadge from './StatusBadge';
import JobTypeTag from './JobTypeTag';

export const JobListItem = ({
  job,
  onPress,
  onLongPress,
  onStart,
}: JobItemProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      <Avatar name={job.customerName ?? 'J'} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {job.customerName ?? 'Customer'}
          </Text>
          <View style={styles.trailing}>
            <Text style={styles.time}>
              {job.scheduledStartTime?.slice(0, 5) ?? ''}
            </Text>
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
          <StatusBadge status={job.status} />
          <JobTypeTag type={job.jobType} />
          {job.jobNumber ? (
            <Text style={styles.jobNo}>{job.jobNumber}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Start Job"
            variant="filled"
            color="secondary"
            size="sm"
            onPress={onStart}
            style={styles.actionStart}
            textStyle={styles.actionStartLabel}
          />
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
      backgroundColor: theme.colors.surface,
    },
    body: { flex: 1, gap: 5, },
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
    time: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.mono,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    jobNo: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    actionStart: {
      minWidth: 120,
      backgroundColor: theme.colors.secondary,
    },
    actionStartLabel: {
      color: theme.colors.primary,
    },
  });

export default JobListItem;
