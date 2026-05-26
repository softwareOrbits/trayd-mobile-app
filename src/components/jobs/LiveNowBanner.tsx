import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { LiveNowBannerProps } from '@/types';

export const LiveNowBanner = ({
  client,
  region,
  elapsed,
  day,
  assignee,
  count,
}: LiveNowBannerProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="timer-outline" size={22} color={colors.secondary} />
      </View>

      <View style={styles.body}>
        <View style={styles.labelRow}>
          <View style={styles.dot} />
          <Text style={styles.label}>{`LIVE NOW · ${count}`}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {`${client} — ${region}`}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {`${elapsed} · day ${day} · ${assignee}`}
        </Text>
      </View>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.secondary,
    },
    icon: {
      width: 46,
      height: 46,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    body: { flex: 1, gap: 3 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
    label: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.primary,
    },
    title: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.white,
    },
    meta: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.mono,
      color: 'rgba(255,255,255,0.7)',
    },
  });

export default LiveNowBanner;
