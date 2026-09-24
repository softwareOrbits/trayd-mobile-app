import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { ONB } from './onboarding.styles';

const CODE_LENGTH = 8;
const SCREEN_PADDING = 22;
const BOX_GAP = 6;
const BOX_WIDTH = 38;
const OTP_WIDTH = BOX_WIDTH * CODE_LENGTH + BOX_GAP * (CODE_LENGTH - 1);

export const makeInviteCodeStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { flexGrow: 1 },
    form: { marginTop: 28, paddingHorizontal: SCREEN_PADDING },
    otpContainer: { width: OTP_WIDTH, alignSelf: 'center' },
    otpBox: {
      width: BOX_WIDTH,
      height: 56,
      marginHorizontal: BOX_GAP / 2,
      flexGrow: 0,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: ONB.cardLine,
      backgroundColor: ONB.paper,
      shadowColor: '#0E1A2D',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    otpBoxFocused: { borderColor: ONB.navy },
    otpText: {
      color: ONB.navy,
      fontSize: 22,
      fontFamily: theme.fonts.monoBold,
      textAlign: 'center',
      includeFontPadding: false,
    },
    helpRow: { marginTop: 18, alignItems: 'center' },
  });
