import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { TimerPillProps } from '@/types';

export const TimerPill = ({ time, onPress, paused }: TimerPillProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const fg = paused ? colors.textMuted : colors.onPrimary;

  return (
    <Pressable
      style={[styles.pill, paused && styles.pillPaused]}
      onPress={onPress}
      hitSlop={6}
    >
      <Ionicons
        name={paused ? 'pause' : 'time-outline'}
        size={16}
        color={fg}
      />
      <Text style={[styles.time, paused && styles.timePaused]}>
        {paused ? `Paused · ${time}` : time}
      </Text>
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
    pillPaused: {
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    time: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.monoBold,
      color: theme.colors.onPrimary,
      letterSpacing: 0.5,
    },
    timePaused: { color: theme.colors.textMuted },
  });

export default TimerPill;
