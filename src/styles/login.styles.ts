import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';
import { linkTextStyles, subtitleStyles, titleStyles } from '@/theme/constants';

export const makeLoginStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: 24 },
    banner: { marginBottom: 8 },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 86, height: 63, marginBottom: 16 },
    title: titleStyles,
    subtitle: subtitleStyles,
    form: { marginTop: 28, gap: 16 },
    forgotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    forgotText: { ...linkTextStyles, color: theme.colors.primary },
    footer: { marginTop: 'auto', gap: 18, alignItems: 'center' },
    joinButton: { paddingVertical: 4 },
    joinText: linkTextStyles,
  });
