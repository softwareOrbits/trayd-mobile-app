import { Image, StyleSheet, Text, View } from 'react-native';

import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { avatarToneFor } from '@/utils/avatarColor';
import { initialsOf } from '@/utils/name';
import { useMemberPhoto } from '@/services/memberPhotos';

type Props = { name: string | null; size?: number; memberId?: string | null };

export const TaskAvatar = ({ name, size = 28, memberId }: Props) => {
  const styles = useThemedStyles(makeStyles);
  const tone = avatarToneFor(name);
  const photoUrl = useMemberPhoto({ name, memberId });
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg }}
      />
    );
  }
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
