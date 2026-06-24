import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeChangePasswordStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    topSpacer: { width: 22 },
    content: { paddingHorizontal: 20, paddingTop: 8, gap: 18 },
    subtitle: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    field: { gap: 8 },
    label: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    showBtn: { position: 'absolute', right: 14, top: 16 },
    showText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
    footer: { paddingHorizontal: 20, paddingTop: 12 },
  });
