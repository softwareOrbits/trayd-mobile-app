import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Avatar } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type CheckboxRowProps = {
  name: string;
  role?: string;
  selected: boolean;
  onPress: () => void;
};

export const CheckboxRow = ({
  name,
  role,
  selected,
  onPress,
}: CheckboxRowProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected ? styles.rowOn : styles.rowOff]}
    >
      <Avatar name={name} size={36} />
      <View style={styles.textCol}>
        <Text style={[styles.name, selected && styles.nameOn]}>{name}</Text>
        {role ? (
          <Text style={[styles.role, selected && styles.roleOn]}>{role}</Text>
        ) : null}
      </View>
      <View style={[styles.box, selected ? styles.boxOn : styles.boxOff]}>
        {selected ? (
          <Ionicons name="checkmark" size={15} color={colors.onPrimary} />
        ) : null}
      </View>
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    rowOn: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    rowOff: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderMuted,
    },
    textCol: { flex: 1, gap: 1 },
    name: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    nameOn: { color: theme.colors.onSecondary },
    role: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },
    roleOn: { color: 'rgba(255,255,255,0.7)' },
    box: {
      width: 24,
      height: 24,
      borderRadius: theme.radii.sm,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxOn: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    boxOff: { borderColor: theme.colors.borderMuted },
  });

export default CheckboxRow;
