import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { titleStyles } from '@/theme/constants';

export const makeJobsStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    header: {
      paddingHorizontal: 20,
      backgroundColor: theme.colors.background,
    },
    eyebrow: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
    },
    title: titleStyles,
    tabs: { marginTop: 14, marginHorizontal: -20 },
    banner: { paddingTop: 16, paddingBottom: 4 },
    offlineWrap: { paddingHorizontal: 20, paddingTop: 12 },
    offlineCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.warning,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    offlineIcon: {
      width: 34,
      height: 34,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    offlineBody: { flex: 1, gap: 2 },
    offlineTitle: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    offlineSub: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },
    offlineAction: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 120,
      backgroundColor: theme.colors.surface,
      flexGrow: 1,
    },
    empty: { paddingTop: 64, alignItems: 'center' },
    emptyText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textMuted,
      textTransform: 'capitalize',
    },
    fab: {
      position: 'absolute',
      right: 16,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 22,
      shadowColor: theme.colors.black,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  });
