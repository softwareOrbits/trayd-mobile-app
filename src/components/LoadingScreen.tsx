import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

const MARK_WIDTH = 112;
const MARK_HEIGHT = (MARK_WIDTH * 370) / 503;
const BAR_WIDTH = 120;
const BAR_FILL_WIDTH = BAR_WIDTH * 0.4;

const SPLASH_CREAM = '#F4EFE4';
const BUILT_INK = '#7a8391';

export const LoadingScreen = ({ compact = false }: { compact?: boolean } = {}) => {
  const styles = useThemedStyles(makeStyles);
  const markIn = useRef(new Animated.Value(0)).current;
  const headlineIn = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const brand = Easing.bezier(0.2, 0.8, 0.2, 1);

    Animated.timing(markIn, {
      toValue: 1,
      duration: 700,
      easing: brand,
      useNativeDriver: true,
    }).start();

    Animated.timing(headlineIn, {
      toValue: 1,
      duration: 600,
      delay: 250,
      easing: brand,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1600,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();

    return () => loop.stop();
  }, [markIn, headlineIn, sweep]);

  const markStyle = {
    opacity: markIn,
    transform: [
      {
        scale: markIn.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
      },
    ],
  };

  const headlineStyle = {
    opacity: headlineIn,
    transform: [
      {
        translateY: headlineIn.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  const sweepStyle = {
    transform: [
      {
        translateX: sweep.interpolate({
          inputRange: [0, 1],
          outputRange: [-BAR_FILL_WIDTH, BAR_FILL_WIDTH * 3],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('@assets/images/small_logo.png')}
        style={[styles.mark, markStyle]}
        resizeMode="contain"
      />
      {compact ? null : (
        <Animated.Text style={[styles.headline, headlineStyle]}>
          You’re on the tools.{'\n'}
          <Text style={styles.headlineAccent}>We’re on the admin.</Text>
        </Animated.Text>
      )}

      <View style={compact ? styles.footCompact : styles.foot}>
        <View style={styles.bar}>
          <Animated.View style={[styles.barFill, sweepStyle]} />
        </View>
        {compact ? null : <Text style={styles.built}>BUILT IN IRELAND</Text>}
      </View>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingBottom: 60,
      backgroundColor: SPLASH_CREAM,
    },
    mark: { width: MARK_WIDTH, height: MARK_HEIGHT },
    headline: {
      marginTop: 38,
      fontSize: 30,
      lineHeight: 34.5,
      fontFamily: theme.fonts.bold,
      letterSpacing: -0.4,
      textAlign: 'center',
      color: theme.colors.secondary,
      includeFontPadding: false,
    },
    headlineAccent: { color: theme.colors.primary },
    footCompact: { marginTop: 28, alignItems: 'center' },
    foot: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 44,
      alignItems: 'center',
      gap: 16,
    },
    bar: {
      width: BAR_WIDTH,
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      backgroundColor: 'rgba(22,52,90,0.12)',
    },
    barFill: {
      width: BAR_FILL_WIDTH,
      height: '100%',
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    built: {
      fontFamily: 'GeistMono-Medium',
      fontSize: 10.5,
      letterSpacing: 1.68,
      color: BUILT_INK,
      includeFontPadding: false,
    },
  });

export default LoadingScreen;
