import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedView } from '@/store/authSlice';
import AccessRevokedModal from '@/components/AccessRevokedModal';
import MainTabs from './MainTabs';
import ChatScreen from '@/screens/main/ChatScreen';
import JobDetailScreen from '@/screens/main/JobDetailScreen';
import TaskDetailScreen from '@/screens/main/TaskDetailScreen';
import AssignTaskScreen from '@/screens/main/AssignTaskScreen';
import VanLogScreen from '@/screens/main/VanLogScreen';
import ReportVanIssueScreen from '@/screens/main/ReportVanIssueScreen';
import AddServiceScheduleScreen from '@/screens/main/AddServiceScheduleScreen';
import AskTraydScreen from '@/screens/main/AskTraydScreen';
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

const FieldStack = ({ isOwner }: { isOwner: boolean }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Tabs" component={MainTabs} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    <Stack.Screen name="VanLog" component={VanLogScreen} />
    <Stack.Screen
      name="ReportVanIssue"
      component={ReportVanIssueScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen name="JobChat" component={ChatScreen} />
    <Stack.Screen name="AskTrayd" component={AskTraydScreen} />
    <Stack.Screen
      name="StartJob"
      component={StartJobScreen}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name="AssignTask"
      component={AssignTaskScreen}
      options={{ presentation: 'modal' }}
    />
    {isOwner ? (
      <>
        <Stack.Screen
          name="AddServiceSchedule"
          component={AddServiceScheduleScreen}
          options={{ presentation: 'modal' }}
        />
      </>
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
    <Stack.Screen
      name="EditCertification"
      component={EditCertificationScreen}
    />
  </Stack.Navigator>
);

const EmployerStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Employer" component={EmployerWebViewScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    <Stack.Screen name="VanLog" component={VanLogScreen} />
    <Stack.Screen
      name="AddServiceSchedule"
      component={AddServiceScheduleScreen}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
);

/**
 * Post-login gate. Roles with both views pick their experience each session;
 * everyone else drops straight into the one view their role has.
 */
const MainStack = () => {
  const dispatch = useAppDispatch();
  const selectedView = useAppSelector(s => s.auth.selectedView);
  const isOwner = useAppSelector(s => s.auth.isOwner);
  const employerView = useAppSelector(s => s.auth.employerView);
  const employeeView = useAppSelector(s => s.auth.employeeView);

  if (selectedView === 'employer') return <EmployerStack />;
  if (selectedView === null && employerView) {
    return employeeView ? <ViewChooserScreen /> : <EmployerStack />;
  }
  return (
    <>
      <FieldStack isOwner={isOwner} />
      {employeeView ? null : (
        <AccessRevokedModal
          text="Your role no longer includes the employee view. You can keep working in the employer view."
          actionLabel="Go to employer view"
          onAction={() => dispatch(setSelectedView('employer'))}
        />
      )}
    </>
  );
};

export default MainStack;
