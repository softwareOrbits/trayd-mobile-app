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
  const res = await launchCamera({
    mediaType: 'photo',
    quality: opts?.quality ?? 0.8,
    maxWidth: opts?.maxSize ?? 2000,
    maxHeight: opts?.maxSize ?? 2000,
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
