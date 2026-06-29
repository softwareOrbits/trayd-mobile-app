import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeStartJobStyles = (theme: Theme) =>
  StyleSheet.create({
    gap16: { gap: 16 },
    gap12: { gap: 12 },
    sectionLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
      marginBottom: 8,
    },
    hintText: {
      marginTop: 10,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    matchCard: {
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      padding: 14,
      gap: 8,
    },
    matchLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.textMuted,
    },
    noteBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      padding: 12,
      marginTop: 4,
    },
    noteText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 19,
    },
    noteStrong: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.semibold,
    },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    photoThumb: {
      width: 104,
      height: 104,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceMuted,
    },
    photoRemove: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      elevation: 6,
    },
    photoAddTile: {
      width: 104,
      height: 104,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      borderStyle: 'dashed',
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    photoImg: {
      width: '100%',
      height: '100%',
      borderRadius: theme.radii.lg,
    },
    photoText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.medium,
    },
    suggestBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      marginTop: -8,
    },
    suggestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    suggestDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    suggestText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
    },
    listLoader: { alignSelf: 'center', marginVertical: 20 },
    skipBtn: { alignSelf: 'center', paddingVertical: 4 },
    skipText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
      textDecorationLine: 'underline',
    },
  });
