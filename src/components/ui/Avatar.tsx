import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import type { AvatarProps } from '@/types';

export const Avatar = ({ name, size = 40, style }: AvatarProps) => {
  const styles = useThemedStyles(makeStyles);
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    text: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.secondary,
    },
  });

export default Avatar;
