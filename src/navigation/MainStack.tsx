import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/types';
import MainTabs from './MainTabs';
import ChatScreen from '@/screens/main/ChatScreen';
import JobDetailScreen from '@/screens/main/JobDetailScreen';
import StartJobScreen from '@/screens/startJob/StartJobScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={MainTabs} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="JobChat" component={ChatScreen} />
    <Stack.Screen
      name="StartJob"
      component={StartJobScreen}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
);

export default MainStack;
