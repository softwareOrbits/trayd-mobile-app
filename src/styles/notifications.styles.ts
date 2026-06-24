import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const makeNotificationsStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
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
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    bell: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    emptyText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
