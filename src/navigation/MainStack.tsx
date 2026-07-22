import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/types';
import { useAppSelector } from '@/store/hooks';
import MainTabs from './MainTabs';
import ChatScreen from '@/screens/main/ChatScreen';
import JobDetailScreen from '@/screens/main/JobDetailScreen';
import AddNoteScreen from '@/screens/main/AddNoteScreen';
import AddReceiptScreen from '@/screens/main/AddReceiptScreen';
import AddJobPhotoScreen from '@/screens/main/AddJobPhotoScreen';
import WrapUpJobScreen from '@/screens/main/WrapUpJobScreen';
import EditJobScreen from '@/screens/main/EditJobScreen';
import ChangePasswordScreen from '@/screens/main/ChangePasswordScreen';
import WorkingHoursScreen from '@/screens/main/WorkingHoursScreen';
import ServiceAreaScreen from '@/screens/main/ServiceAreaScreen';
import StartJobScreen from '@/screens/startJob/StartJobScreen';
import ViewChooserScreen from '@/screens/main/ViewChooserScreen';
import EmployerWebViewScreen from '@/screens/main/EmployerWebViewScreen';
import NotificationsScreen from '@/screens/main/NotificationsScreen';
import NewLeaveRequestScreen from '@/screens/main/NewLeaveRequestScreen';
import LeaveRequestDetailScreen from '@/screens/main/LeaveRequestDetailScreen';
import TimesheetScreen from '@/screens/main/TimesheetScreen';
import CertificationsScreen from '@/screens/main/CertificationsScreen';
import CertificationDetailScreen from '@/screens/main/CertificationDetailScreen';
import AddCertificationScreen from '@/screens/main/AddCertificationScreen';
import EditCertificationScreen from '@/screens/main/EditCertificationScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * The existing native field app (crew experience). `StartJob` creates the job
 * and (optionally) the customer, so it is registered only for owners — an
 * employee has no route to reach it even via a stale deep link.
 */
const FieldStack = ({ isOwner }: { isOwner: boolean }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={MainTabs} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="JobChat" component={ChatScreen} />
    {isOwner ? (
      <Stack.Screen
        name="StartJob"
        component={StartJobScreen}
        options={{ presentation: 'modal' }}
      />
    ) : null}
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
      name="EditJob"
      component={EditJobScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="WorkingHours"
      component={WorkingHoursScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="ServiceArea"
      component={ServiceAreaScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="NewLeaveRequest"
      component={NewLeaveRequestScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="LeaveRequestDetail"
      component={LeaveRequestDetailScreen}
    />
    <Stack.Screen name="Timesheet" component={TimesheetScreen} />
    <Stack.Screen name="Certifications" component={CertificationsScreen} />
    <Stack.Screen
      name="CertificationDetail"
      component={CertificationDetailScreen}
    />
    <Stack.Screen name="AddCertification" component={AddCertificationScreen} />
    <Stack.Screen name="EditCertification" component={EditCertificationScreen} />
  </Stack.Navigator>
);

const EmployerStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Employer" component={EmployerWebViewScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
  </Stack.Navigator>
);

/**
 * Post-login gate. Owners pick their experience each session; everyone else
 * (employees) drops straight into the field app exactly as before — the chooser
 * and employer WebView are never reached for non-owners.
 */
const MainStack = () => {
  const selectedView = useAppSelector(s => s.auth.selectedView);
  const isOwner = useAppSelector(s => s.auth.isOwner);

  if (isOwner && selectedView === null) return <ViewChooserScreen />;
  if (isOwner && selectedView === 'employer') return <EmployerStack />;
  return <FieldStack isOwner={isOwner} />;
};

export default MainStack;
