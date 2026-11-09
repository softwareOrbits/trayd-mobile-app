import { Platform } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import type { HapticOptions } from 'react-native-haptic-feedback';

const options: HapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: true,
};

const android = Platform.OS === 'android';

export const haptics = {
  tap: () => trigger(android ? 'effectClick' : 'impactLight', options),
  press: () => trigger(android ? 'effectHeavyClick' : 'impactMedium', options),
  select: () => trigger(android ? 'effectTick' : 'selection', options),
  nav: () => trigger(android ? 'effectHeavyClick' : 'impactHeavy', options),
  success: () => trigger('notificationSuccess', options),
  warning: () => trigger('notificationWarning', options),
  error: () => trigger('notificationError', options),
};
