import { DefaultTheme, type Theme } from '@react-navigation/native';
import { lightColors, palette } from './colors';

export const LightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.navy,
    background: lightColors.background,
    card: lightColors.surface,
    text: lightColors.text,
    border: lightColors.borderMuted,
    notification: palette.yellow,
  },
};
