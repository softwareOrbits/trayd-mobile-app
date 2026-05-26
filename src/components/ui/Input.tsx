import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { InputProps } from '@/types';

export const Input = ({
  label,
  error,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...rest
}: InputProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        <TextInput
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            rightIcon ? styles.inputWithIcon : null,
            error ? styles.inputError : null,
            style,
          ]}
          {...rest}
        />
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
    inputError: { borderColor: theme.colors.error },
    rightIcon: { position: 'absolute', right: 14 },
    error: { color: theme.colors.error, fontSize: theme.typography.size.xs },
  });

export default Input;
