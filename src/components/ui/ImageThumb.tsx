import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

export const ImageThumb = ({
  uri,
  label,
  size = 104,
  onPress,
  onRemove,
  disabled,
}: {
  uri?: string;
  label?: string;
  size?: number;
  onPress?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const body = (
    <View style={[styles.thumb, { width: size, height: size }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.img} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
      {onRemove ? (
        <Pressable
          style={styles.remove}
          onPress={onRemove}
          hitSlop={12}
          disabled={disabled}
        >
          <Ionicons name="close" size={15} color={colors.white} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled}>
        {body}
      </Pressable>
    );
  }
  return body;
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    thumb: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    img: {
      width: '100%',
      height: '100%',
      borderRadius: theme.radii.lg,
    },
    label: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
    },
    remove: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      elevation: 6,
    },
  });

export default ImageThumb;
