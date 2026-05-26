import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Avatar, Button } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { JobItemProps } from '@/types';
import StatusBadge from './StatusBadge';

export const JobListItem = ({
  job,
  onPress,
  onLongPress,
  onChat,
  onTimer,
}: JobItemProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable style={styles.row} onPress={onPress} onLongPress={onLongPress}>
      <Avatar name={job.client} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {`${job.client} — ${job.region}`}
          </Text>
          <View style={styles.trailing}>
            <Text style={styles.time}>{job.time}</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.placeholder}
            />
          </View>
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {`${job.postcode} · ${job.service}`}
        </Text>

        <View style={styles.metaRow}>
          <StatusBadge status={job.status} />
          {job.coAssignedBy ? (
            <Text style={styles.coAssign} numberOfLines={1}>
              {`· co-assigned by ${job.coAssignedBy}`}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Chat"
            leftIcon="chatbubble-ellipses-outline"
            variant="outlined"
            color="secondary"
            size="sm"
            onPress={onChat}
            style={styles.actionChat}
          />
          <Button
            label="Timer"
            leftIcon="timer-outline"
            variant="outlined"
            color="secondary"
            size="sm"
            onPress={onTimer}
            style={styles.action}
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
      borderBottomWidth: 0.2,
      borderBottomColor: theme.colors.border,
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
    coAssign: {
      flexShrink: 1,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    action: {
      minWidth: 96,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
      backgroundColor: theme.colors.surface,
    },
    actionChat: {
      minWidth: 96,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
      backgroundColor: theme.colors.background,
    },
  });

export default JobListItem;
