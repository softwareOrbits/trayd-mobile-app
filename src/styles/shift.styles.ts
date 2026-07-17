import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeShiftStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: 20,
      gap: 12,
    },
    eyebrow: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
    },
    title: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    body: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
      lineHeight: 22,
    },
    primaryBtn: {
      marginTop: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.md,
      paddingVertical: 16,
      alignItems: 'center',
    },
    btnBusy: {
      opacity: 0.6,
    },
    primaryText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.onPrimary,
    },
    secondaryBtn: {
      borderRadius: theme.radii.md,
      paddingVertical: 16,
      alignItems: 'center',
    },
    secondaryText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
  });

export default makeShiftStyles;
