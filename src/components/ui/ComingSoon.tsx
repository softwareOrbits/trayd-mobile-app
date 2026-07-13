import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';

type ComingSoonProps = {
  title: string;
  icon: IconName;
  message?: string;
  action?: ReactNode;
};

export const ComingSoon = ({ title, icon, message, action }: ComingSoonProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>TRAYD</Text>
        <Text style={styles.eyebrow}>COMING SOON</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={30} color={colors.textMuted} />
        </View>
        <Text style={styles.bodyTitle}>{title} is on the way.</Text>
        <Text style={styles.bodyText}>
          {message ?? "We're building this out. Check back soon."}
        </Text>
      </View>
      {action}
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    logo: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      letterSpacing: 1.5,
      color: theme.colors.secondary,
    },
    eyebrow: {
      marginTop: 12,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.4,
      color: theme.colors.textMuted,
    },
    title: {
      marginTop: 2,
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    bodyTitle: {
      marginTop: 18,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    bodyText: {
      marginTop: 8,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export default ComingSoon;
