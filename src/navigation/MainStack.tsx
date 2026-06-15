import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/types';
import MainTabs from './MainTabs';
import ChatScreen from '@/screens/main/ChatScreen';
import JobDetailScreen from '@/screens/main/JobDetailScreen';
import AddNoteScreen from '@/screens/main/AddNoteScreen';
import AddReceiptScreen from '@/screens/main/AddReceiptScreen';
import AddJobPhotoScreen from '@/screens/main/AddJobPhotoScreen';
import WrapUpJobScreen from '@/screens/main/WrapUpJobScreen';
import ChangePasswordScreen from '@/screens/main/ChangePasswordScreen';
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
    <Stack.Screen
      name="AddNote"
      component={AddNoteScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="AddReceipt"
      component={AddReceiptScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="AddJobPhoto"
      component={AddJobPhotoScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="WrapUpJob"
      component={WrapUpJobScreen}
      options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
    />
    <Stack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
);

export default MainStack;
