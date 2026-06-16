import { InteractionManager } from 'react-native';
import { launchCamera, type PhotoQuality } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';

export type CapturedPhoto = {
  uri: string;
  base64: string;
  type?: string | null;
};

export async function capturePhoto(opts?: {
  quality?: PhotoQuality;
  maxSize?: number;
}): Promise<CapturedPhoto | null> {
  // Let the screen's navigation/modal animation finish before launching the
  // camera — opening it mid-transition is what makes it jerk on open.
  await new Promise<void>(resolve =>
    InteractionManager.runAfterInteractions(() => resolve()),
  );
  const res = await launchCamera({
    mediaType: 'photo',
    quality: opts?.quality ?? 0.7,
    maxWidth: opts?.maxSize ?? 1600,
    maxHeight: opts?.maxSize ?? 1600,
    includeBase64: true,
  });
  if (res.didCancel) return null;
  if (res.errorCode) {
    Toast.show({ type: 'error', text1: res.errorMessage ?? 'Camera error.' });
    return null;
  }
  const asset = res.assets?.[0];
  if (!asset?.uri || !asset.base64) return null;
  return { uri: asset.uri, base64: asset.base64, type: asset.type };
}
