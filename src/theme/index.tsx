import { createContext, useContext, type ReactNode } from 'react';
import { lightColors, palette, type AppColors } from './colors';
import { fonts, type AppFonts } from './fonts';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  size: { xs: 12, sm: 13, md: 15, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export type Theme = {
  colors: AppColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  fonts: AppFonts;
};

export const theme: Theme = {
  colors: lightColors,
  spacing,
  radii,
  typography,
  fonts,
};

const ThemeContext = createContext<Theme>(theme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);

export { palette, lightColors, fonts };
export type { AppColors, AppFonts };
