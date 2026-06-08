import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Avatar } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { CompletedJobItemProps } from '@/types';
import StatusBadge from './StatusBadge';
import JobTypeTag from './JobTypeTag';

export const CompletedJobItem = ({
  job,
  weekday,
  onPress,
}: CompletedJobItemProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar name={job.customerName ?? 'J'} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {job.customerName ?? 'Customer'}
          </Text>
          <View style={styles.trailing}>
            <Text style={styles.weekday}>{weekday}</Text>
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
    body: { flex: 1, gap: 6 },
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
    weekday: {
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
  });

export default CompletedJobItem;
