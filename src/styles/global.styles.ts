import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeGlobalStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    screenSurface: { flex: 1, backgroundColor: theme.colors.surface },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    gap8: { gap: 8 },
    gap12: { gap: 12 },
    gap16: { gap: 16 },

    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      gap: 12,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    divider: { height: 1, backgroundColor: theme.colors.divider },

    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 16,
    },

    eyebrow: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    monoMeta: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },
    emptyText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },

    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    tagChip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagChipText: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
    },

    iconBox: {
      width: 34,
      height: 34,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: 20,
      gap: 14,
    },
    modalTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
  });
