import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeWelcomeDoneStyles = (theme: Theme) =>
  StyleSheet.create({
    check: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bold: {
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
    },
    jobCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      alignSelf: 'stretch',
      marginTop: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 12,
    },
    jobBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    jobBadgeText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
    },
    jobInfo: { flex: 1, gap: 2 },
    jobTitle: {
      color: theme.colors.text,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
    },
    jobMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.sm,
    },
  });
