import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';
import { linkTextStyles, subtitleStyles, titleStyles } from '@/theme/constants';

const CODE_LENGTH = 8;
const SCREEN_PADDING = 24;
const BOX_GAP = 4;
const BOX_WIDTH = 36;
const OTP_WIDTH = (BOX_WIDTH + BOX_GAP) * CODE_LENGTH;

export const makeVerifyIdentityStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 56, height: 44, marginBottom: 16 },
    title: titleStyles,
    subtitle: subtitleStyles,
    form: { marginTop: 28 },
    otpWrap: { width: '100%', alignItems: 'center' },
    otpContainer: { width: OTP_WIDTH, alignSelf: 'center' },
    otpBox: {
      width: BOX_WIDTH,
      height: 56,
      marginHorizontal: BOX_GAP / 2,
      flexGrow: 0,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
    },
    otpBoxFocused: { borderColor: theme.colors.secondary },
    otpText: {
      color: theme.colors.text,
      fontSize: theme.typography.size.xl,
      fontFamily: theme.fonts.monoBold,
      textAlign: 'center',
      includeFontPadding: false,
    },
    helpLink: { marginTop: 16, alignSelf: 'center' },
    helpText: linkTextStyles,
    footer: { marginTop: 'auto' },
  });
