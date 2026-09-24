import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeOnboardingScaffoldStyles = (_theme: Theme) =>
  StyleSheet.create({
    content: { flexGrow: 1 },
  });
