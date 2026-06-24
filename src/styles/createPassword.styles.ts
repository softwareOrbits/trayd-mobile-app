import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { subtitleStyles, titleStyles } from '@/theme/constants';

export const makeCreatePasswordStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: 24 },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 56, height: 44, marginBottom: 16 },
    title: titleStyles,
    subtitle: subtitleStyles,
    subtitleStrong: {
      color: theme.colors.text,
      fontFamily: theme.fonts.semibold,
    },
    form: { marginTop: 28, gap: 14 },
    strengthBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    strengthBar: { flex: 1, flexDirection: 'row', gap: 6 },
    strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: {
      color: theme.colors.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    checklist: { gap: 10, marginTop: 4 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkText: { fontSize: theme.typography.size.sm },
    footer: { marginTop: 'auto' },
  });
