import { NavigationContainer } from '@react-navigation/native';
import { useAppSelector } from '@/store/hooks';
import { LightTheme } from '@/theme/navigation';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

const AppNavigator = () => {
  const isLoggedIn = useAppSelector(state => state.auth.isLoggedIn);

  return (
    <NavigationContainer theme={LightTheme}>
      {isLoggedIn ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
