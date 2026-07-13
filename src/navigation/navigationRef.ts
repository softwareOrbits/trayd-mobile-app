import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from '@/types';

export const navigationRef = createNavigationContainerRef<MainStackParamList>();

let pendingJobId: string | null | undefined;

export function openNotificationTarget(jobId: string | null): void {
  if (!navigationRef.isReady()) {
    pendingJobId = jobId;
    return;
  }
  try {
    if (jobId) {
      navigationRef.navigate('JobDetail', { jobId });
    } else {
      navigationRef.navigate('Tabs', { screen: 'Notifications' });
    }
  } catch {
    pendingJobId = jobId;
  }
}

export function flushPendingNotificationTarget(): void {
  if (pendingJobId === undefined) return;
  const jobId = pendingJobId;
  pendingJobId = undefined;
  openNotificationTarget(jobId);
}
