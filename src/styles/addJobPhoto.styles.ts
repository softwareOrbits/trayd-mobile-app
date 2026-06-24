import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const makeAddJobPhotoStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    cancel: {
      width: 70,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    counter: {
      width: 70,
      textAlign: 'right',
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },

    content: { flex: 1 },
    contentInner: { paddingHorizontal: 20, paddingBottom: 24 },
    phaseRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
      marginBottom: 16,
    },
    phaseSection: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
      marginBottom: 10,
    },
    phasePill: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingVertical: 10,
    },
    phasePillOn: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    phaseText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
    phaseTextOn: { color: theme.colors.onPrimary },

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

    footer: { paddingHorizontal: 20, paddingTop: 12 },
  });
