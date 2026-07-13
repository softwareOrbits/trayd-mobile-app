import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

export type StatusTone = 'success' | 'danger' | 'warning' | 'neutral' | 'info';

export const StatusPill = ({
  label,
  tone = 'neutral',
  bg,
  fg,
}: {
  label: string;
  tone?: StatusTone;
  bg?: string;
  fg?: string;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const tones: Record<StatusTone, { bg: string; fg: string }> = {
    success: { bg: '#E5F0E9', fg: colors.green },
    danger: { bg: '#FBE4E4', fg: colors.error },
    warning: { bg: colors.warningBg, fg: colors.warning },
    info: { bg: colors.surface, fg: colors.textMuted },
    neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
  };
  const t = tones[tone] ?? tones.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: bg ?? t.bg }]}>
      <Text numberOfLines={1} style={[styles.text, { color: fg ?? t.fg }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radii.sm,
    },
    text: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.6,
    },
  });

export default StatusPill;
