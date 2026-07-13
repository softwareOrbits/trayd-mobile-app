import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE = 56;
const ICON = 24;
const GAP = 4;
const TRAIL = 22;

type FloatingActionButtonProps = {
  label: string;
  icon: IconName;
  onPress?: () => void;
  collapsed?: boolean;
  tone?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export const FloatingActionButton = ({
  label,
  icon,
  onPress,
  collapsed = false,
  tone = 'primary',
  style,
}: FloatingActionButtonProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [textWidth, setTextWidth] = useState(0);
  const scale = useSharedValue(1);

  const bg = tone === 'primary' ? colors.primary : colors.secondary;
  const fg = tone === 'primary' ? colors.onPrimary : colors.onSecondary;

  const expandedWidth = textWidth > 0 ? GAP + textWidth + TRAIL : 0;

  const labelStyle = useAnimatedStyle(() => {
    const open = collapsed ? 0 : 1;
    return {
      width: withTiming(open * expandedWidth, { duration: 200 }),
      opacity: withTiming(open, { duration: 150 }),
    };
  });

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      <View pointerEvents="none" style={styles.measure}>
        <Text
          style={styles.label}
          numberOfLines={1}
          onLayout={e => setTextWidth(Math.ceil(e.nativeEvent.layout.width))}
        >
          {label}
        </Text>
      </View>

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 130 });
        }}
        style={[styles.pill, { backgroundColor: bg }, pressStyle]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={ICON} color={fg} />
        </View>
        <Animated.View style={[styles.labelWrap, labelStyle]}>
          <View style={styles.labelInner}>
            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      alignItems: 'flex-end',
    },
    measure: {
      position: 'absolute',
      top: 0,
      right: 0,
      opacity: 0,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: SIZE,
      borderRadius: SIZE / 2,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    iconWrap: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelWrap: {
      justifyContent: 'center',
      overflow: 'hidden',
    },
    labelInner: {
      paddingLeft: GAP,
      paddingRight: TRAIL,
    },
    label: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
    },
  });

export default FloatingActionButton;
