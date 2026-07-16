import { createContext, useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '@/types';
import NotificationsScreen from '@/screens/onboarding/NotificationsScreen';
import LocationScreen from '@/screens/onboarding/LocationScreen';
import ProfilePhotoScreen from '@/screens/onboarding/ProfilePhotoScreen';
import WelcomeDoneScreen from '@/screens/onboarding/WelcomeDoneScreen';

const PrimingCompleteContext = createContext<() => void>(() => {});

/** Ends the priming flow and hands the user to the main app. */
export const usePrimingComplete = () => useContext(PrimingCompleteContext);

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Shown once per user, after sign-in, before the main app. Each screen explains
 * why a permission is wanted and then triggers the real OS prompt — Apple wants
 * the context, and a bare dialog on launch risks a 5.1.1 rejection.
 */
const OnboardingStack = ({ onComplete }: { onComplete: () => void }) => (
  <PrimingCompleteContext.Provider value={onComplete}>
    <Stack.Navigator
      initialRouteName="OnboardNotifications"
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen name="OnboardNotifications" component={NotificationsScreen} />
      <Stack.Screen name="OnboardLocation" component={LocationScreen} />
      <Stack.Screen name="OnboardPhoto" component={ProfilePhotoScreen} />
      <Stack.Screen name="OnboardDone" component={WelcomeDoneScreen} />
    </Stack.Navigator>
  </PrimingCompleteContext.Provider>
);

export default OnboardingStack;
