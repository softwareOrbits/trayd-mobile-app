import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { subtitleStyles, titleStyles } from '@/theme/constants';

export const makeResetPasswordStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: 24 },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 56, height: 44, marginBottom: 16 },
    title: titleStyles,
    subtitle: subtitleStyles,
    form: { marginTop: 28, gap: 16 },
    footer: { marginTop: 'auto' },
  });
