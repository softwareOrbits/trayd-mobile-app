import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Props = {
  listening: boolean;
  starting?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const DictateButton = ({ listening, starting, disabled, onPress }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!listening) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  const ringStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [
      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) },
    ],
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || starting}
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop dictation' : 'Dictate note'}
      style={({ pressed }) => [
        styles.row,
        listening && styles.rowActive,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.micWrap}>
        {listening ? <Animated.View style={[styles.ring, ringStyle]} /> : null}
        <View style={[styles.mic, listening && styles.micActive]}>
          {starting ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Ionicons
              name={listening ? 'stop' : 'mic'}
              size={listening ? 16 : 20}
              color={listening ? colors.onSecondary : colors.onPrimary}
            />
          )}
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {listening ? 'Listening… tap to stop' : 'Tap to dictate'}
        </Text>
        <Text style={styles.hint}>
          {listening
            ? 'Speak normally — your words appear above.'
            : 'Speak your note instead of typing it.'}
        </Text>
      </View>
    </Pressable>
  );
};

export default DictateButton;

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.surface,
    },
    rowActive: { borderColor: theme.colors.primary },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
    micWrap: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: {
      position: 'absolute',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
    },
    mic: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    micActive: { backgroundColor: theme.colors.secondary },
    copy: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    hint: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },
  });
