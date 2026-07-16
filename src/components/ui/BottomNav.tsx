import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { BottomNavProps, NavItem } from '@/types';

/**
 * Two states, driven by scroll:
 *  - at rest: full width, every tab icon-over-label.
 *  - collapsed: inactive tabs drop to bare icons and the selected label swings
 *    inline, so the bar loses both height and width.
 * Five inline labels can't fit a phone's width, hence stacked at rest.
 *
 * Animated with Reanimated rather than LayoutAnimation, which is unreliable on
 * the New Architecture and made the collapse snap.
 */
const ICON = 22;
const BAR_PAD_TOP = 11;
const BAR_PAD_BOTTOM = 8;
const BAR_HEIGHT = 58;
const DURATION = 220;

const transition = LinearTransition.duration(DURATION);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const useBottomNavHeight = () => {
  const insets = useSafeAreaInsets();
  // Always the at-rest height: this reserves scroll padding, and shrinking it
  // mid-scroll would shift the very content being scrolled.
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

  const renderItem = (item: NavItem, isActive: boolean) => {
    const showLabel = collapsed ? isActive : true;
    // Active sits on a navy pill when inline, on the bare bar when stacked.
    const tint = !isActive
      ? colors.textMuted
      : collapsed
        ? colors.white
        : colors.secondary;
    const icon = isActive ? item.activeIcon ?? item.icon : item.icon;

    return (
      <AnimatedPressable
        key={item.key}
        onPress={() => onChange(item.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={item.label}
        layout={transition}
        style={styles.item}
      >
        {/* Indicator marks the active tab only while stacked. Inline, the pill
            already does that job and the two together read as clutter. */}
        {isActive && !collapsed ? <View style={styles.indicator} /> : null}
        <Animated.View
          layout={transition}
          style={[
            collapsed ? styles.contentInline : styles.contentStacked,
            collapsed && isActive && styles.contentInlineActive,
          ]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={ICON} color={tint} />
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
          </View>
          {showLabel ? (
            <Animated.Text
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(120)}
              style={[styles.label, { color: tint }]}
              numberOfLines={1}
            >
              {item.label}
            </Animated.Text>
          ) : null}
        </Animated.View>
      </AnimatedPressable>
    );
  };

  return (
    <View
      style={[
        styles.root,
        collapsed ? styles.rootCollapsed : styles.rootRest,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <Animated.View
        layout={transition}
        style={[styles.bar, collapsed ? styles.barCollapsed : styles.barRest]}
      >
        {items.map(item => renderItem(item, item.key === activeKey))}
      </Animated.View>
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
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
    },
    // Stretch fills the width; centre lets the bar size to its content, which
    // is what actually narrows it once the labels go.
    rootRest: { alignItems: 'stretch' },
    rootCollapsed: { alignItems: 'center' },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      maxWidth: '100%',
      backgroundColor: theme.colors.surface,
      // Over-large on purpose: RN clamps to half the height, so the bar stays a
      // pill at both the tall and short states.
      borderRadius: 30,
      paddingHorizontal: 6,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    // The extra top padding only exists to hold the indicator, so collapsed —
    // which has none — gives it back instead of sitting on dead space.
    // space-evenly, not flex:1 columns: equal columns make short labels ("Jobs")
    // look marooned and long ones ("Calendar") look crowded, since the gap you
    // see is the slack left over inside each column.
    barRest: {
      justifyContent: 'space-evenly',
      paddingTop: BAR_PAD_TOP,
      paddingBottom: BAR_PAD_BOTTOM,
    },
    barCollapsed: {
      justifyContent: 'center',
      paddingTop: 5,
      paddingBottom: 5,
    },
    // Barely any horizontal padding: five columns share the width and "Calendar"
    // is the widest label — padding here is what truncates it.
    // Sized to its content so the bar can space the tabs evenly between them.
    item: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 4,
    },
    // Absolute so it never adds to the row height; -7 keeps it inside the bar's
    // top padding, which it must not exceed or it clips on the bar's edge.
    indicator: {
      position: 'absolute',
      top: -7,
      width: 24,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    contentStacked: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
    },
    contentInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 19,
    },
    contentInlineActive: { backgroundColor: theme.colors.secondary },
    iconWrap: {
      width: ICON,
      height: ICON,
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
      fontSize: 11,
      fontFamily: theme.fonts.semibold,
    },
  });

export default BottomNav;
