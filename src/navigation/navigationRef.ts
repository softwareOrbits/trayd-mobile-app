import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from '@/types';
import type { NotificationTarget } from '@/services/notifications';
import { fetchLeaveRequestById } from '@/services/leave';

export const navigationRef = createNavigationContainerRef<MainStackParamList>();

let pendingTarget: NotificationTarget | undefined;

const openLeaveTab = () => navigationRef.navigate('Tabs', { screen: 'Leave' });

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
    } else if (target?.screen === 'LeaveRequestDetail') {
      openLeaveRequest(target.leaveId);
    } else if (target?.screen === 'Leave') {
      openLeaveTab();
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
