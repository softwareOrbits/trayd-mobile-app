import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { useDictation } from '@/utils/useDictation';

const KEYBOARD_OVERLAYS_WINDOW =
  Platform.OS === 'ios' || Number(Platform.Version) >= 35;

type Props = {
  fieldFocused: boolean;
  inject: (script: string) => void;
};

const WebDictationMic = ({ fieldFocused, inject }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const injectRef = useRef(inject);
  injectRef.current = inject;

  const dictation = useDictation('', spoken => {
    injectRef.current(
      `window.__traydDictSet && window.__traydDictSet(${JSON.stringify(spoken)}); true;`,
    );
  });
  const { listening, starting, stop } = dictation;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!fieldFocused) stop();
  }, [fieldFocused, stop]);

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

  if (!fieldFocused || (!keyboardHeight && !listening)) return null;

  const onPress = () => {
    if (!listening) inject('window.__traydDictBegin && window.__traydDictBegin(); true;');
    dictation.toggle();
  };

  const bottom = (KEYBOARD_OVERLAYS_WINDOW ? keyboardHeight : 0) + 12;

  return (
    <View pointerEvents="box-none" style={[styles.anchor, { bottom }]}>
      {listening ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) },
              ],
            },
          ]}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={starting}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop dictation' : 'Dictate into this field'}
        style={({ pressed }) => [
          styles.button,
          listening && styles.buttonActive,
          pressed && styles.pressed,
        ]}
      >
        {starting ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Ionicons
            name={listening ? 'stop' : 'mic'}
            size={listening ? 18 : 22}
            color={listening ? colors.onSecondary : colors.onPrimary}
          />
        )}
      </Pressable>
    </View>
  );
};

export default WebDictationMic;

const SIZE = 48;

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    anchor: {
      position: 'absolute',
      right: 16,
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: {
      position: 'absolute',
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      backgroundColor: theme.colors.primary,
    },
    button: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },
    buttonActive: { backgroundColor: theme.colors.secondary },
    pressed: { opacity: 0.85 },
  });
