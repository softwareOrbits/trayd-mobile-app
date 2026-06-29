import Toast from 'react-native-toast-message';

import { isOfflineLimitExceeded } from './connectivity';

export function offlineActionBlocked(): boolean {
  if (!isOfflineLimitExceeded()) return false;
  Toast.show({
    type: 'error',
    text1: 'You’ve been offline too long',
    text2: 'Reconnect to sync your changes before making more.',
  });
  return true;
}
