import Toast from 'react-native-toast-message';

import { toastConfig } from './toastConfig';

/**
 * Render this as the last child of any modally-presented screen or <Modal>.
 * Native modal presentation sits above the root <Toast /> in App.tsx, so a
 * toast fired from a modal would otherwise appear *behind* it. A Toast mounted
 * inside the modal becomes the active render target and shows on top.
 */
export const AppToast = () => <Toast topOffset={100} config={toastConfig} />;

export default AppToast;
