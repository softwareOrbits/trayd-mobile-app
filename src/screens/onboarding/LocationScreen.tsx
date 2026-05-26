import {
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, TextLink } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { AuthStackParamList } from '@/types';
import OnboardingScaffold from './OnboardingScaffold';

const LocationScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const next = () => navigation.navigate('OnboardPhoto');

  const requestLocation = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      } catch {
        // Continue onboarding regardless of the user's choice.
      }
    }
    next();
  };

  return (
    <OnboardingScaffold
      step={2}
      icon={
        <View style={styles.iconBox}>
          <Ionicons name="location" size={42} color={colors.secondary} />
        </View>
      }
      title="Auto clock-in on site"
      subtitle={
        <>
          {'Trayd uses your location '}
          <Text style={styles.bold}>only when you&apos;re on a job site</Text>
          {', so hours hit your timesheet without you logging them.'}
        </>
      }
      footer={
        <>
          <Button label="Allow location" fullWidth onPress={requestLocation} />
          <TextLink label="Maybe later" onPress={next} />
        </>
      }
    />
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    iconBox: {
      width: 88,
      height: 88,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bold: {
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
    },
  });

export default LocationScreen;
