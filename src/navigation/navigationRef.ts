import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from '@/types';
import type { NotificationTarget } from '@/services/notifications';
import { fetchLeaveRequestById } from '@/services/leave';
import { fetchFirstJobIdToday } from '@/services/jobs';
import { store } from '@/store';

export const navigationRef = createNavigationContainerRef<MainStackParamList>();

let pendingTarget: NotificationTarget | undefined;

const openLeaveTab = () => navigationRef.navigate('Tabs', { screen: 'Leave' });

const openJobsTab = () => navigationRef.navigate('Tabs', { screen: 'Jobs' });

function openDayStart(): void {
  fetchFirstJobIdToday()
    .then(jobId => {
      if (jobId) {
        navigationRef.navigate('JobDetail', { jobId });
      } else if (store.getState().auth.isOwner) {
        navigationRef.navigate('StartJob');
      } else {
        openJobsTab();
      }
    })
    .catch(openJobsTab);
}

function openLeaveRequest(leaveId: string): void {
  fetchLeaveRequestById(leaveId)
    .then(request => {
      if (request) navigationRef.navigate('LeaveRequestDetail', { request });
      else openLeaveTab();
    })
    .catch(openLeaveTab);
}

export function openNotificationTarget(target: NotificationTarget): void {
  if (!navigationRef.isReady()) {
    pendingTarget = target;
    return;
  }
  try {
    if (target?.screen === 'JobDetail') {
      navigationRef.navigate('JobDetail', { jobId: target.jobId });
    } else if (target?.screen === 'TaskDetail') {
      navigationRef.navigate('TaskDetail', { taskId: target.taskId });
    } else if (target?.screen === 'LeaveRequestDetail') {
      openLeaveRequest(target.leaveId);
    } else if (target?.screen === 'Leave') {
      openLeaveTab();
    } else if (target?.screen === 'VanLog') {
      navigationRef.navigate('VanLog', { vehicleId: target.vehicleId });
    } else if (target?.screen === 'DayStart') {
      openDayStart();
    } else if (target?.screen === 'Certifications') {
      navigationRef.navigate('Certifications');
    } else if (target?.screen === 'Jobs') {
      openJobsTab();
    } else if (target?.screen === 'Fleet') {
      navigationRef.navigate('Tabs', { screen: 'Fleet' });
    } else if (target?.screen === 'Home') {
      navigationRef.navigate('Tabs', { screen: 'Home' });
    } else {
      navigationRef.navigate('Tabs', { screen: 'Notifications' });
    }
  } catch {
    pendingTarget = target;
  }
}

export function flushPendingNotificationTarget(): void {
  if (pendingTarget === undefined) return;
  const target = pendingTarget;
  pendingTarget = undefined;
  openNotificationTarget(target);
}
