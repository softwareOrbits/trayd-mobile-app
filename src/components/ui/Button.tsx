import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { haptics } from '@/utils/haptics';
import { ButtonColor, ButtonProps, ButtonVariant } from '@/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZES = {
  lg: { paddingVertical: 16, paddingHorizontal: 22, fontSize: 16, icon: 20, gap: 8, radius: 'md' },
  md: { paddingVertical: 12, paddingHorizontal: 18, fontSize: 15, icon: 18, gap: 6, radius: 'md' },
  sm: { paddingVertical: 9, paddingHorizontal: 14, fontSize: 13, icon: 16, gap: 6, radius: 'sm' },
} as const;

const resolveColors = (
  theme: Theme,
  variant: ButtonVariant,
  color: ButtonColor,
  disabled: boolean,
) => {
  const c = theme.colors;
  if (disabled) {
    if (variant === 'filled') {
      return { bg: c.disabledBg, fg: c.disabledText, border: 'transparent' };
    }
    if (variant === 'outlined') {
      return { bg: 'transparent', fg: c.disabledText, border: c.disabledBorder };
    }
    return { bg: 'transparent', fg: c.disabledText, border: 'transparent' };
  }

  const tone = color === 'primary' ? c.primary : c.secondary;
  const onTone = color === 'primary' ? c.onPrimary : c.onSecondary;

  if (variant === 'filled') {
    return { bg: tone, fg: onTone, border: 'transparent' };
  }
  if (variant === 'outlined') {
    return { bg: 'transparent', fg: tone, border: tone };
  }
  return { bg: 'transparent', fg: tone, border: 'transparent' };
};

export const Button = ({
  label,
  onPress,
  variant = 'filled',
  size = 'lg',
  color = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}: ButtonProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const sz = SIZES[size];
  const inactive = disabled || loading;
  const { bg, fg, border } = resolveColors(theme, variant, color, inactive);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fontFamily = theme.fonts.bold;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => {
        if (!inactive) {
          haptics.tap();
          scale.value = withTiming(0.97, { duration: 90 });
        }
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 130 });
      }}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'outlined' ? 1.5 : 0,
          borderRadius: theme.radii[sz.radius],
          paddingVertical: sz.paddingVertical,
          paddingHorizontal: sz.paddingHorizontal,
          gap: sz.gap,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {leftIcon ? <Ionicons name={leftIcon} size={sz.icon} color={fg} /> : null}
          <Text
            style={[
              styles.label,
              { fontSize: sz.fontSize, fontFamily, color: fg },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon ? <Ionicons name={rightIcon} size={sz.icon} color={fg} /> : null}
        </>
      )}
    </AnimatedPressable>
  );
};

export const makeStyles = (_theme: Theme) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      textAlign: 'center',
    },
  });

export default Button;
