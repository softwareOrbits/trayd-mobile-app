import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { GOOGLE_MAPS_API_KEY } from '@env';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Props = {
  query: string;
  onPress?: () => void;
  height?: number;
};

export const LocationMap = ({ query, onPress, height = 150 }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [failed, setFailed] = useState(false);

  if (!query || !GOOGLE_MAPS_API_KEY || failed) return null;

  const marker = `color:0xE89B2D|${encodeURIComponent(query)}`;
  const url =
    'https://maps.googleapis.com/maps/api/staticmap' +
    `?center=${encodeURIComponent(query)}` +
    '&zoom=15&size=640x320&scale=2' +
    `&markers=${marker}` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.wrap, { height }]}
      accessibilityRole="imagebutton"
      accessibilityLabel="Open job location in Maps"
    >
      <Image
        source={{ uri: url }}
        style={styles.img}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
      <View style={styles.overlay}>
        <Ionicons name="navigate" size={13} color={colors.primary} />
        <Text style={styles.overlayText}>Open in Maps</Text>
      </View>
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      width: '100%',
      borderRadius: theme.radii.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceMuted,
    },
    img: { width: '100%', height: '100%' },
    overlay: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    overlayText: {
      color: theme.colors.onSecondary,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
    },
  });

export default LocationMap;
