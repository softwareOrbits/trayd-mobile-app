import { type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';

export const MediaListItem = ({
  title,
  description,
  imageUri,
  icon,
  right,
  onPress,
  last,
}: {
  title: string;
  description?: string;
  imageUri?: string;
  icon?: IconName;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={[styles.row, !last && styles.divider]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : icon ? (
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {right ?? null}
    </Wrapper>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    image: {
      width: 44,
      height: 44,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    description: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      lineHeight: 17,
    },
  });

export default MediaListItem;
