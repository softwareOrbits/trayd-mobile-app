import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';

export const IconPill = ({
  label,
  icon,
  selected = false,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tint = selected ? colors.onSecondary : colors.text;
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[styles.pill, selected && styles.pillOn]}
    >
      {icon ? <Ionicons name={icon} size={14} color={tint} /> : null}
      <Text style={[styles.text, { color: tint }]}>{label}</Text>
    </Wrapper>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    pillOn: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    text: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
  });

export default IconPill;
