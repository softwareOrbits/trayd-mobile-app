import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { BottomNavProps, NavItem } from '@/types';

const CIRCLE = 58;
const CIRCLE_LIFT = 22;
const BAR_HEIGHT = 84;

export const useBottomNavHeight = () => {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + Math.max(insets.bottom, 16);
};

export const BottomNav = ({ items, activeKey, onChange }: BottomNavProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const renderRaised = (item: NavItem, isActive: boolean) => (
    <Pressable
      key={item.key}
      onPress={() => onChange(item.key)}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      style={styles.raisedItem}
    >
      <View style={styles.raisedCircle}>
        <Ionicons
          name={item.activeIcon ?? item.icon}
          size={26}
          color={colors.white}
        />
      </View>
      <Text
        style={[
          styles.label,
          { color: isActive ? colors.secondary : colors.textMuted },
          isActive ? styles.labelActive : null,
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );

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
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.bar}>
        {items.map(item => {
          const isActive = item.key === activeKey;
          return item.raised
            ? renderRaised(item, isActive)
            : renderItem(item, isActive);
        })}
      </View>
    </View>
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
      paddingHorizontal: 16,
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
    raisedItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    raisedCircle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      marginTop: -CIRCLE_LIFT,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      borderWidth: 4,
      borderColor: theme.colors.surface,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
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
