import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { ONB } from './onboarding.styles';

export const makeConfirmInviteStyles = (theme: Theme) =>
  StyleSheet.create({
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { flexGrow: 1 },
    cardWrap: { paddingTop: 24, paddingHorizontal: 22 },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 20,
      paddingHorizontal: 22,
    },
    consentBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentBoxOn: { backgroundColor: ONB.amber },
    consentBoxOff: {
      backgroundColor: ONB.paper,
      borderWidth: 1.5,
      borderColor: ONB.line2,
    },
    consentText: {
      flex: 1,
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: ONB.navy,
    },
  });
