import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/types';
import LoginScreen from '@/screens/auth/LoginScreen';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';
import VerifyIdentityScreen from '@/screens/auth/VerifyIdentityScreen';
import CreatePasswordScreen from '@/screens/auth/CreatePasswordScreen';
import InviteCodeScreen from '@/screens/auth/InviteCodeScreen';
import ConfirmInviteScreen from '@/screens/auth/ConfirmInviteScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="VerifyIdentity" component={VerifyIdentityScreen} />
    <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
    <Stack.Screen name="InviteCode" component={InviteCodeScreen} />
    <Stack.Screen name="ConfirmInvite" component={ConfirmInviteScreen} />
  </Stack.Navigator>
);

export default AuthStack;
