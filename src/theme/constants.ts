import { type TextStyle } from 'react-native';
import { typography } from '.';
import { lightColors } from './colors';
import { fonts } from './fonts';

export const titleStyles: TextStyle = {
  fontSize: typography.size.xxl,
  fontFamily: fonts.bold,
  color: lightColors.black,
};

export const subtitleStyles: TextStyle = {
  fontSize: typography.size.sm,
  fontFamily: fonts.regular,
  color: lightColors.textMuted,
  textAlign: 'center',
  marginTop: 6,
  paddingHorizontal: 24,
};

export const linkTextStyles: TextStyle = {
  fontSize: typography.size.md,
  fontFamily: fonts.semibold,
  color: lightColors.black,
  textDecorationLine: 'underline',
};
