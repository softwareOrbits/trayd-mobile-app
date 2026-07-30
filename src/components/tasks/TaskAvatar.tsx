import { StyleSheet, Text, View } from 'react-native';

import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { avatarToneFor } from '@/utils/avatarColor';
import { initialsOf } from '@/utils/name';

type Props = { name: string | null; size?: number };

export const TaskAvatar = ({ name, size = 28 }: Props) => {
  const styles = useThemedStyles(makeStyles);
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
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36, color: tone.fg }]}>
        {initialsOf(name)}
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

export default TaskAvatar;
