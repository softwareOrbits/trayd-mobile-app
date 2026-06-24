import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const makeOnboardingNotificationsStyles = (theme: Theme) =>
  StyleSheet.create({
    iconBox: {
      width: 88,
      height: 88,
      borderRadius: 22,
      backgroundColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 18,
      right: 20,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: theme.colors.error,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: theme.colors.white,
      fontSize: 10,
      fontFamily: theme.fonts.bold,
    },
  });
