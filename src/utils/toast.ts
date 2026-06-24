import Toast from 'react-native-toast-message';

import { isNetworkError } from './errors';

export const toastError = (e: unknown, fallback: string) => {
  if (isNetworkError(e)) return;
  Toast.show({
    type: 'error',
    text1: e instanceof Error ? e.message : fallback,
  });
};

export const toastSuccess = (text1: string) =>
  Toast.show({ type: 'success', text1 });
