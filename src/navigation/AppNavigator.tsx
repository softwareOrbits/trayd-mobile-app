import { NavigationContainer } from '@react-navigation/native';
import { useAppSelector } from '@/store/hooks';
import { LightTheme } from '@/theme/navigation';
import { navigationRef, flushPendingNotificationTarget } from './navigationRef';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

const AppNavigator = () => {
  const isLoggedIn = useAppSelector(state => state.auth.isLoggedIn);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={LightTheme}
      onReady={flushPendingNotificationTarget}
    >
      {isLoggedIn ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
