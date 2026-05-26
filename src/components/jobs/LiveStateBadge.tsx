import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import type { LiveState, LiveStateBadgeProps } from '@/types';

const TONES: Record<
  LiveState,
  { label: string; dot: boolean; fg: keyof Theme['colors'] }
> = {
  active: { label: 'Active', dot: true, fg: 'secondary' },
  paused: { label: 'Paused', dot: false, fg: 'textMuted' },
};

export const LiveStateBadge = ({ state }: LiveStateBadgeProps) => {
  const styles = useThemedStyles(makeStyles);
  const tone = TONES[state];

  return (
    <View style={styles.badge}>
      {tone.dot ? <View style={styles.dot} /> : null}
      <Text style={[styles.text, styles[state]]}>
        {tone.label.toUpperCase()}
      </Text>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    text: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.6,
    },
    active: { color: theme.colors.secondary },
    paused: { color: theme.colors.textMuted },
  });

export default LiveStateBadge;
