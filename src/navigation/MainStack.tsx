import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/types';
import MainTabs from './MainTabs';
import ChatScreen from '@/screens/main/ChatScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={MainTabs} />
    <Stack.Screen name="JobChat" component={ChatScreen} />
  </Stack.Navigator>
);

export default MainStack;
