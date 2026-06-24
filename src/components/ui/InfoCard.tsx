import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';

export type InfoCardTone = 'default' | 'note' | 'success' | 'danger';

export const InfoCard = ({
  icon,
  title,
  description,
  tone = 'default',
  action,
  onPress,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  tone?: InfoCardTone;
  action?: string;
  onPress?: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const tones = {
    default: { bg: colors.surface, border: colors.borderMuted, fg: colors.primary },
    note: { bg: colors.warningBg, border: colors.warning, fg: colors.warning },
    success: { bg: '#E5F0E9', border: colors.green, fg: colors.green },
    danger: { bg: '#FBE4E4', border: colors.error, fg: colors.error },
  }[tone];

  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[styles.card, { backgroundColor: tones.bg, borderColor: tones.border }]}
    >
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: tones.fg }]}>
          <Ionicons name={icon} size={18} color={colors.white} />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {action ? <Text style={[styles.action, { color: tones.fg }]}>{action}</Text> : null}
    </Wrapper>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: theme.radii.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    description: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      lineHeight: 17,
    },
    action: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
  });

export default InfoCard;
