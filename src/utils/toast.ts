import Toast from 'react-native-toast-message';

export const toastError = (e: unknown, fallback: string) =>
  Toast.show({
    type: 'error',
    text1: e instanceof Error ? e.message : fallback,
  });

export const toastSuccess = (text1: string) =>
  Toast.show({ type: 'success', text1 });
