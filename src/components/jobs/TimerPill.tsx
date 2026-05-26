import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { TimerPillProps } from '@/types';

export const TimerPill = ({ time, onPress }: TimerPillProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable style={styles.pill} onPress={onPress} hitSlop={6}>
      <Ionicons name="time-outline" size={16} color={colors.onPrimary} />
      <Text style={styles.time}>{time}</Text>
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.primary,
    },
    time: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.monoBold,
      color: theme.colors.onPrimary,
      letterSpacing: 0.5,
    },
  });

export default TimerPill;
