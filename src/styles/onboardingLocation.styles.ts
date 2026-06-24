import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeOnboardingLocationStyles = (theme: Theme) =>
  StyleSheet.create({
    iconBox: {
      width: 88,
      height: 88,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bold: {
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
    },
  });
