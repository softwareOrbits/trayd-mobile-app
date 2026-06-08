import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Avatar, Button } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type CustomerCardProps = {
  name: string;
  address?: string;
  meta?: string;
  highlighted?: boolean;
  onUse?: () => void;
  onPress?: () => void;
};

export const CustomerCard = ({
  name,
  address,
  meta,
  highlighted,
  onUse,
  onPress,
}: CustomerCardProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // "Nearest" variant — highlighted card with a Use button.
  if (onUse) {
    return (
      <View style={[styles.card, highlighted && styles.cardHi]}>
        <View style={styles.headRow}>
          <Avatar name={name} size={40} />
          <View style={styles.textCol}>
            <Text style={styles.name}>{name}</Text>
            {address ? (
              <Text style={styles.sub} numberOfLines={1}>
                {address}
              </Text>
            ) : null}
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          </View>
        </View>
        <Button label="Use this customer" fullWidth onPress={onUse} />
      </View>
    );
  }

  // "Recent" variant — pressable row with chevron.
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar name={name} size={36} />
      <View style={styles.textCol}>
        <Text style={styles.name}>{name}</Text>
        {meta ? (
          <Text style={styles.sub} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 14,
    },
    cardHi: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.warningBg,
    },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.borderMuted,
    },
    textCol: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    sub: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    meta: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
  });

export default CustomerCard;
