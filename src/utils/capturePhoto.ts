import { Alert, InteractionManager } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type PhotoQuality,
} from 'react-native-image-picker';
import Toast from 'react-native-toast-message';

import { ensurePermission, promptOpenSettings } from './permissions';

export type CapturedPhoto = {
  uri: string;
  base64: string;
  type?: string | null;
};

export type PhotoOptions = {
  quality?: PhotoQuality;
  maxSize?: number;
  cameraType?: 'front' | 'back';
};

const settleTransitions = () =>
  new Promise<void>(resolve =>
    InteractionManager.runAfterInteractions(() => resolve()),
  );

const toPhotos = (
  res: ImagePickerResponse,
  fallbackError: string,
  kind: 'camera' | 'photos',
): CapturedPhoto[] => {
  if (res.didCancel) return [];
  // The picker can still bounce on permission even after our own check (e.g.
  // revoked while backgrounded) — send the user to Settings, don't just toast.
  if (res.errorCode === 'permission') {
    promptOpenSettings(kind);
    return [];
  }
  if (res.errorCode) {
    Toast.show({ type: 'error', text1: res.errorMessage ?? fallbackError });
    return [];
  }
  return (res.assets ?? [])
    .filter(a => a.uri && a.base64)
    .map(a => ({ uri: a.uri as string, base64: a.base64 as string, type: a.type }));
};

export async function capturePhoto(
  opts?: PhotoOptions,
): Promise<CapturedPhoto | null> {
  if (!(await ensurePermission('camera'))) return null;
  // Let the screen's navigation/modal animation finish before launching the
  // camera — opening it mid-transition is what makes it jerk on open.
  await settleTransitions();
  const res = await launchCamera({
    mediaType: 'photo',
    quality: opts?.quality ?? 0.7,
    maxWidth: opts?.maxSize ?? 1600,
    maxHeight: opts?.maxSize ?? 1600,
    includeBase64: true,
    cameraType: opts?.cameraType ?? 'back',
  });
  return toPhotos(res, 'Camera error.', 'camera')[0] ?? null;
}

export async function pickPhotos(
  opts?: PhotoOptions & { selectionLimit?: number },
): Promise<CapturedPhoto[]> {
  if (!(await ensurePermission('photos'))) return [];
  await settleTransitions();
  const res = await launchImageLibrary({
    mediaType: 'photo',
    quality: opts?.quality ?? 0.7,
    maxWidth: opts?.maxSize ?? 1600,
    maxHeight: opts?.maxSize ?? 1600,
    includeBase64: true,
    selectionLimit: opts?.selectionLimit ?? 1,
  });
  return toPhotos(res, 'Could not open your photos.', 'photos');
}

function choosePhotoSource(): Promise<'camera' | 'library' | null> {
  return new Promise(resolve => {
    Alert.alert(
      'Add photo',
      undefined,
      [
        { text: 'Take photo', onPress: () => resolve('camera') },
        { text: 'Choose from gallery', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export async function acquirePhotos(
  opts?: PhotoOptions & { selectionLimit?: number },
): Promise<CapturedPhoto[]> {
  const source = await choosePhotoSource();
  if (source === 'camera') {
    const photo = await capturePhoto(opts);
    return photo ? [photo] : [];
  }
  if (source === 'library') return pickPhotos(opts);
  return [];
}
