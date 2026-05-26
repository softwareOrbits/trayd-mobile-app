import { StyleSheet, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import type { DividerProps } from '@/types';

export const Divider = ({ inset = 0, style }: DividerProps) => {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.divider, { marginLeft: inset }, style]} />;
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    divider: {
      height: 1,
      backgroundColor: theme.colors.borderMuted,
    },
  });

export default Divider;
