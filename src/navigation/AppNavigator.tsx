import { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';

// Imported directly rather than via the `@/components/ui` barrel: that barrel
// pulls in the nav-aware components, which cycles back through this module and
// leaves the import undefined at evaluation time.
import LoadingScreen from '@/components/LoadingScreen';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshAccessViews } from '@/store/authSlice';
import {
  hasPrimedPermissions,
  markPermissionsPrimed,
} from '@/services/permissionPriming';
import { LightTheme } from '@/theme/navigation';
import { haptics } from '@/utils/haptics';
import { navigationRef, flushPendingNotificationTarget } from './navigationRef';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import OnboardingStack from './OnboardingStack';

/**
 * `primed` is null while the flag is still being read — rendering MainStack in
 * that gap would flash the dashboard before the priming screens.
 */
const usePrimingGate = (isLoggedIn: boolean, userId: string | null) => {
  const [primed, setPrimed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setPrimed(null);
      return;
    }
    let active = true;
    hasPrimedPermissions(userId).then(value => {
      if (active) setPrimed(value);
    });
    return () => {
      active = false;
    };
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (primed === false && userId) markPermissionsPrimed(userId);
  }, [primed, userId]);

  const complete = useCallback(() => setPrimed(true), []);

  return { primed, complete };
};

const useRouteChange = (onChange: () => void) => {
  const routeKey = useRef<string | undefined>(undefined);

  const sync = useCallback(() => {
    routeKey.current = navigationRef.getCurrentRoute()?.key;
  }, []);

  const onStateChange = useCallback(() => {
    const next = navigationRef.getCurrentRoute()?.key;
    if (!next || next === routeKey.current) return;
    routeKey.current = next;
    haptics.nav();
    onChange();
  }, [onChange]);

  return { sync, onStateChange };
};

const AppNavigator = () => {
  const isLoggedIn = useAppSelector(state => state.auth.isLoggedIn);
  const userId = useAppSelector(state => state.auth.user?.id ?? null);
  const { primed, complete } = usePrimingGate(isLoggedIn, userId);
  const dispatch = useAppDispatch();
  const inEmployerView = useAppSelector(
    state => state.auth.selectedView === 'employer',
  );
  const checkAccess = useCallback(() => {
    if (isLoggedIn && !inEmployerView) dispatch(refreshAccessViews());
  }, [dispatch, isLoggedIn, inEmployerView]);
  const { sync, onStateChange } = useRouteChange(checkAccess);

  // NavigationContainer needs a navigator child, so the read-the-flag gap waits
  // outside it. Cold starts are already behind the boot splash, so this is only
  // ever a blink right after signing in.
  if (isLoggedIn && primed === null) return <LoadingScreen />;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={LightTheme}
      onReady={() => {
        sync();
        flushPendingNotificationTarget();
      }}
      onStateChange={onStateChange}
    >
      {!isLoggedIn ? (
        <AuthStack />
      ) : primed ? (
        <MainStack />
      ) : (
        <OnboardingStack onComplete={complete} />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
