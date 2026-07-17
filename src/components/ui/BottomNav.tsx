import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { BottomNavProps, NavItem } from '@/types';

const BAR_HEIGHT = 68;
const SIDE_REST = 16;
const SIDE_COLLAPSED = 44;
const DURATION = 220;

export const useBottomNavHeight = () => {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, 16);
};

export const BottomNav = ({
  items,
  activeKey,
  collapsed = false,
  onChange,
}: BottomNavProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const rootStyle = useAnimatedStyle(() => ({
    paddingHorizontal: withTiming(collapsed ? SIDE_COLLAPSED : SIDE_REST, {
      duration: DURATION,
    }),
  }));

  const renderItem = (item: NavItem, isActive: boolean) => {
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
        {isActive ? <View style={styles.activeIndicator} /> : null}
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
  };

  return (
    <Animated.View
      style={[
        styles.root,
        rootStyle,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.bar}>
        {items.map(item => renderItem(item, item.key === activeKey))}
      </View>
    </Animated.View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'visible',
      backgroundColor: 'transparent',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      overflow: 'visible',
      backgroundColor: theme.colors.surface,
      borderRadius: 28,
      paddingTop: 12,
      paddingBottom: 12,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 6,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    activeIndicator: {
      position: 'absolute',
      top: -12,
      width: 28,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    iconWrap: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
