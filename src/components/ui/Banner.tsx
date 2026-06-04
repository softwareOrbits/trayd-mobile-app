import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type BannerVariant = 'error' | 'warning';

type BannerProps = {
  variant?: BannerVariant;
  title: string;
  message?: string;
  onDismiss?: () => void;
  style?: ViewStyle;
};

export const Banner = ({
  variant = 'error',
  title,
  message,
  onDismiss,
  style,
}: BannerProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const accent = variant === 'warning' ? colors.warning : colors.error;
  const bg = variant === 'warning' ? colors.warningBg : colors.errorBg;
  const icon = variant === 'warning' ? 'warning' : 'alert-circle';

  return (
    <View
      style={[styles.container, { backgroundColor: bg, borderColor: accent }, style]}
    >
      <Ionicons name={icon} size={20} color={accent} style={styles.icon} />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    icon: { marginTop: 1 },
    textCol: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    message: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.xs,
      lineHeight: 18,
    },
    close: { marginTop: 1 },
  });

export default Banner;
