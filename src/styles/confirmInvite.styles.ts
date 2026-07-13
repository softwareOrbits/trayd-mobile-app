import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { linkTextStyles, subtitleStyles, titleStyles } from '@/theme/constants';

export const makeConfirmInviteStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { flexGrow: 1, paddingHorizontal: 24 },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 86, height: 63, marginBottom: 16 },
    title: { ...titleStyles, textAlign: 'center' },
    subtitle: subtitleStyles,
    subtitleStrong: { fontFamily: theme.fonts.bold, color: theme.colors.black },
    banner: { marginTop: 28 },
    card: {
      marginTop: 28,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      gap: 12,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    rowLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
      letterSpacing: 1,
    },
    rowValue: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      flexShrink: 1,
      textAlign: 'right',
    },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 20,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.surface,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    consentBox: {
      width: 24,
      height: 24,
      borderRadius: theme.radii.sm,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentBoxOn: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    consentBoxOff: { borderColor: theme.colors.borderMuted },
    consentText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.text,
      lineHeight: 20,
    },
    footer: { marginTop: 'auto', gap: 18, alignItems: 'center' },
    signoutLink: { paddingVertical: 4 },
    signoutText: linkTextStyles,
  });
