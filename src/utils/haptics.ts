import { trigger } from 'react-native-haptic-feedback';
import type { HapticOptions } from 'react-native-haptic-feedback';

const options: HapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: true,
};

export const haptics = {
  tap: () => trigger('impactLight', options),
  press: () => trigger('impactMedium', options),
  select: () => trigger('selection', options),
  nav: () => trigger('impactHeavy', options),
  success: () => trigger('notificationSuccess', options),
  warning: () => trigger('notificationWarning', options),
  error: () => trigger('notificationError', options),
};
