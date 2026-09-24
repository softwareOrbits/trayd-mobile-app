import { useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  AmberButton,
  HeroLocation,
  OnbLink,
  useOnbStyles,
} from '@/components/onboarding';
import { ensureLocationPermission } from '@/utils/location';
import type { AuthStackParamList } from '@/types';
import { usePrimingComplete } from '@/navigation/OnboardingStack';
import OnboardingScaffold from './OnboardingScaffold';

const LocationScreen = () => {
  const onb = useOnbStyles();
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
      icon={<HeroLocation />}
      title="Auto clock-in on site"
      subtitle={
        <>
          {'Trayd uses your location '}
          <Text style={onb.subStrong}>only when you&apos;re on a job site</Text>
          {', so hours hit your timesheet without you logging them.'}
        </>
      }
      footer={
        <>
          <AmberButton
            label="Allow location"
            loading={asking}
            onPress={requestLocation}
          />
          <OnbLink label="Maybe later" onPress={next} />
          <OnbLink label="Skip all setup" onPress={skipAll} />
        </>
      }
    />
  );
};

export default LocationScreen;
