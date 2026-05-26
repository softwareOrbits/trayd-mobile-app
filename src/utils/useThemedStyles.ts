import { useMemo } from 'react';
import { useTheme, type Theme } from '@/theme';

export const useThemedStyles = <T>(factory: (theme: Theme) => T): T => {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
};

export default useThemedStyles;
