import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import { avatarToneFor } from '@/utils/avatarColor';
import type { AvatarProps } from '@/types';

export const Avatar = ({ name, size = 40, style }: AvatarProps) => {
  const styles = useThemedStyles(makeStyles);
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();
  const tone = avatarToneFor(name);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone.bg,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4, color: tone.fg }]}>
        {initial}
      </Text>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontFamily: theme.fonts.bold,
    },
  });

export default Avatar;
