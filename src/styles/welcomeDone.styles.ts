import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { ONB } from './onboarding.styles';

export const makeWelcomeDoneStyles = (theme: Theme) =>
  StyleSheet.create({
    jobCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 24,
      marginHorizontal: 22,
      backgroundColor: ONB.paper,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: ONB.cardLine,
      paddingVertical: 14,
      paddingHorizontal: 16,
      shadowColor: '#0E1A2D',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    jobBadge: {
      width: 38,
      height: 38,
      borderRadius: 9,
      backgroundColor: ONB.amber,
      alignItems: 'center',
      justifyContent: 'center',
    },
    jobBadgeText: {
      color: ONB.navy,
      fontSize: 12,
      fontFamily: theme.fonts.monoBold,
      includeFontPadding: false,
    },
    jobInfo: { flex: 1, minWidth: 0, gap: 2 },
    jobTitle: {
      color: ONB.navy,
      fontSize: 13,
      fontFamily: theme.fonts.bold,
    },
    jobMeta: {
      color: ONB.muted,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
    },
  });
