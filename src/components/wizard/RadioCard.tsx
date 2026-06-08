import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';

type RadioCardProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
};

export const RadioCard = ({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: RadioCardProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected ? styles.cardOn : styles.cardOff]}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={colors.onPrimary} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, selected && styles.titleOn]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, selected && styles.subtitleOn]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected ? styles.radioOn : styles.radioOff]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: theme.radii.md,
      borderWidth: 1.5,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    cardOn: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    cardOff: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderMuted,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textCol: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    titleOn: { color: theme.colors.onSecondary },
    subtitle: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },
    subtitleOn: { color: 'rgba(255,255,255,0.7)' },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: {
      borderColor: theme.colors.onSecondary,
      backgroundColor: 'transparent',
    },
    radioOff: { borderColor: theme.colors.borderMuted },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
  });

export default RadioCard;
