import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, TextLink } from '@/components/ui';
import { ensureLocationPermission } from '@/utils/location';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeOnboardingLocationStyles } from '@/styles/onboardingLocation.styles';
import type { AuthStackParamList } from '@/types';
import { usePrimingComplete } from '@/navigation/OnboardingStack';
import OnboardingScaffold from './OnboardingScaffold';

const LocationScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeOnboardingLocationStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [asking, setAsking] = useState(false);
  const skipAll = usePrimingComplete();
  const next = () => navigation.navigate('OnboardPhoto');

  const requestLocation = async () => {
    if (asking) return;
    setAsking(true);
    try {
      // ensure, not request: once the OS has stopped prompting, a bare request
      // returns `blocked` with no dialog and the tap looks like it did nothing.
      await ensureLocationPermission();
    } finally {
      setAsking(false);
      next();
    }
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
          <Button
            label="Allow location"
            fullWidth
            loading={asking}
            onPress={requestLocation}
          />
          <TextLink label="Maybe later" onPress={next} />
          <TextLink label="Skip all setup" onPress={skipAll} />
        </>
      }
    />
  );
};

export default LocationScreen;
