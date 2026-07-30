import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { Task } from '@/types';
import TaskAvatar from './TaskAvatar';
import {
  deadlineTopLabel,
  irishToday,
  isOverdue,
  locationLabel,
  vehicleLabel,
} from './tasks.helpers';

type Props = {
  task: Task;
  onPress: () => void;
};

export const TaskListItem = ({ task, onPress }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const overdue = isOverdue(task);
  const complete = task.status === 'complete';
  const dueToday = task.deadlineDate === irishToday();
  const fleet = vehicleLabel(task);
  const location = locationLabel(task);
  const assignedBy = task.creator?.name ?? 'your team';
  const staff = task.creator ? !task.creator.isOwner : false;

  const borderColor = overdue
    ? colors.error
    : complete
      ? colors.green
      : dueToday
        ? colors.warning
        : colors.borderMuted;

  const topColor = overdue
    ? colors.error
    : dueToday && !complete
      ? colors.warning
      : colors.textMuted;
  const topText = overdue ? `Overdue · ${deadlineTopLabel(task)}` : deadlineTopLabel(task);

  return (
    <Pressable style={[styles.row, { borderColor }]} onPress={onPress}>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.timing, { color: topColor }]} numberOfLines={1}>
            {topText}
          </Text>
          <View style={styles.topRight}>
            {fleet ? (
              <View style={styles.fleetChip}>
                <Text style={styles.fleetText}>FLEET</Text>
              </View>
            ) : null}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.placeholder}
            />
          </View>
        </View>

        <Text
          style={[styles.title, complete && styles.titleDone]}
          numberOfLines={1}
        >
          {task.title}
        </Text>

        {task.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.assignedBy}>
            <TaskAvatar name={assignedBy} size={26} />
            <Text style={styles.assignedText} numberOfLines={1}>
              {`Assigned by ${assignedBy}`}
            </Text>
            {staff ? (
              <View style={styles.staffChip}>
                <Text style={styles.staffText}>STAFF</Text>
              </View>
            ) : null}
          </View>

          {location ? (
            <View style={styles.location}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1.5,
    },
    body: { flex: 1, padding: 16, gap: 8 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    timing: {
      flex: 1,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.4,
    },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fleetChip: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    fleetText: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
    },
    title: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    titleDone: {
      textDecorationLine: 'line-through',
      color: theme.colors.textMuted,
    },
    desc: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
      lineHeight: 19,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 2,
    },
    assignedBy: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    assignedText: {
      flexShrink: 1,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
    },
    staffChip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    staffText: {
      fontSize: 9,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
    },
    location: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    locationText: {
      maxWidth: 110,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
  });

export default TaskListItem;
