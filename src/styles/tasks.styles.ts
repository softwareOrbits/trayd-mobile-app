import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeTasksStyles = (theme: Theme) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    list: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 12,
      flexGrow: 1,
      backgroundColor: theme.colors.surface,
    },
    completedContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      flexGrow: 1,
      backgroundColor: theme.colors.surface,
    },
    periodPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'stretch',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.surface,
    },
    periodText: {
      flex: 1,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    periodCount: {
      marginTop: 12,
      marginBottom: 4,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    dayHeader: {
      marginTop: 18,
      marginBottom: 8,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    doneCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
    },
    doneDivider: {
      height: 1,
      backgroundColor: theme.colors.borderMuted,
    },
    doneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
    },
    doneBody: { flex: 1, gap: 3 },
    doneWhen: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.3,
      color: theme.colors.green,
    },
    doneTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    doneTitle: {
      flexShrink: 1,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
      textDecorationLine: 'line-through',
    },
    doneFleet: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.warningBg,
    },
    doneFleetText: {
      fontSize: 9,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.5,
      color: theme.colors.warning,
    },
    doneSub: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: 32,
      gap: 10,
    },
    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    emptyText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export default makeTasksStyles;
