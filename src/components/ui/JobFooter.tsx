import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Props = {
  children: ReactNode;
  /** Override the gap between stacked actions. */
  gap?: number;
};

/**
 * Shared job-flow footer: a pinned white bar with a top divider that carries
 * the bottom safe-area inset. Wrap the action button(s) in it.
 */
export const JobFooter = ({ children, gap = 12 }: Props) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 16, gap }]}>
      {children}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    footer: {
      paddingHorizontal: 24,
      paddingTop: 14,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.creamBorder,
    },
  });

export default JobFooter;
