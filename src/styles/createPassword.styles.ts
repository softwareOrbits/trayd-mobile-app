import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeCreatePasswordStyles = (_theme: Theme) =>
  StyleSheet.create({
    content: { flexGrow: 1 },
    form: { marginTop: 28, paddingHorizontal: 22, gap: 16 },
    checklist: { marginTop: 4, gap: 8 },
  });
