import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

export const LoadingScreen = () => {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Animated.Image
        entering={FadeIn.duration(500)}
        source={require('@assets/images/loader_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.secondary,
    },
    logo: { width: 335, height: 243, marginBottom: 18 },
  });

export default LoadingScreen;
