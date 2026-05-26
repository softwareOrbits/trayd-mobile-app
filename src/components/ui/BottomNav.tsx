import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { BottomNavProps } from '@/types';

export const BottomNav = ({ items, activeKey, onChange }: BottomNavProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map(item => {
        const isActive = item.key === activeKey;
        const tint = isActive ? colors.secondary : colors.textMuted;
        const icon = isActive ? item.activeIcon ?? item.icon : item.icon;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.item}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={24} color={tint} />
              {item.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[styles.label, { color: tint }, isActive ? styles.labelActive : null]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderMuted,
      paddingTop: 10,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    iconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    badge: {
      position: 'absolute',
      top: -5,
      right: -9,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontFamily: theme.fonts.bold,
    },
    label: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.medium,
    },
    labelActive: { fontFamily: theme.fonts.semibold },
  });

export default BottomNav;
