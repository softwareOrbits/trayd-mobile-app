import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { InputProps } from '@/types';

export const Input = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  focusHighlight,
  containerStyle,
  labelStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  type FocusHandler = NonNullable<InputProps['onFocus']>;
  const handleFocus: FocusHandler = e => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: FocusHandler = e => {
    setFocused(false);
    onBlur?.(e);
  };
  const highlighted = !!focusHighlight && focused && !error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View style={styles.field}>
        <TextInput
          placeholderTextColor={colors.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithIcon : null,
            error ? styles.inputError : null,
            highlighted ? styles.inputFocused : null,
            style,
          ]}
          {...rest}
        />
        {leftIcon ? (
          <View style={styles.leftIcon} pointerEvents="none">
            <Ionicons
              name={leftIcon}
              size={20}
              color={highlighted ? colors.secondary : colors.textMuted}
            />
          </View>
        ) : null}
        {rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={8}
          >
            <Ionicons name={rightIcon} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: 6 },
    label: {
      color: theme.colors.black,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    field: { justifyContent: 'center' },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.inputBorder,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.black,
    },
    inputWithIcon: { paddingRight: 48 },
    inputWithLeftIcon: { paddingLeft: 46 },
    inputFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
    },
    leftIcon: { position: 'absolute', left: 15, zIndex: 1, elevation: 1 },
    inputError: { borderColor: theme.colors.error },
    rightIcon: { position: 'absolute', right: 14, zIndex: 1, elevation: 1 },
    error: { color: theme.colors.error, fontSize: theme.typography.size.xs },
  });

export default Input;
