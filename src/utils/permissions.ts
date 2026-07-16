import { Alert, Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  checkNotifications,
  openSettings,
  request,
  requestNotifications,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';

export type PermissionKind = 'location' | 'camera' | 'photos' | 'notifications';

/**
 * `denied` is still askable; `blocked` is not — iOS only ever shows its dialog
 * once, so a blocked permission can only be changed in Settings.
 */
export type PermissionState = 'granted' | 'denied' | 'blocked' | 'unavailable';

export const PERMISSION_LABEL: Record<PermissionKind, string> = {
  location: 'Location',
  camera: 'Camera',
  photos: 'Photos',
  notifications: 'Notifications',
};

/** Why we need it — shown on the priming screens and the Settings alert. */
export const PERMISSION_REASON: Record<PermissionKind, string> = {
  location: "Confirms you're on the job site so your hours log themselves.",
  camera: 'Photograph site work and capture material receipts.',
  photos: 'Attach existing photos and receipts to a job.',
  notifications: 'Job assignments, messages and leave decisions.',
};

const permissionFor = (
  kind: Exclude<PermissionKind, 'notifications'>,
): Permission | null => {
  if (Platform.OS === 'ios') {
    if (kind === 'location') return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    if (kind === 'camera') return PERMISSIONS.IOS.CAMERA;
    return PERMISSIONS.IOS.PHOTO_LIBRARY;
  }
  if (Platform.OS === 'android') {
    if (kind === 'location') return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
    if (kind === 'camera') return PERMISSIONS.ANDROID.CAMERA;
    // Scoped media reads landed in API 33; older devices still use storage.
    return Number(Platform.Version) >= 33
      ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
  }
  return null;
};

/** `limited` (iOS "selected photos") is usable, so it counts as granted. */
const toState = (status: PermissionStatus): PermissionState => {
  if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) return 'granted';
  if (status === RESULTS.DENIED) return 'denied';
  if (status === RESULTS.BLOCKED) return 'blocked';
  return 'unavailable';
};

export async function checkPermission(
  kind: PermissionKind,
): Promise<PermissionState> {
  try {
    if (kind === 'notifications') {
      const { status } = await checkNotifications();
      return toState(status);
    }
    const permission = permissionFor(kind);
    if (!permission) return 'unavailable';
    return toState(await check(permission));
  } catch {
    return 'unavailable';
  }
}

export async function requestPermission(
  kind: PermissionKind,
): Promise<PermissionState> {
  try {
    if (kind === 'notifications') {
      const { status } = await requestNotifications(['alert', 'sound', 'badge']);
      return toState(status);
    }
    const permission = permissionFor(kind);
    if (!permission) return 'unavailable';
    return toState(await request(permission));
  } catch {
    return 'unavailable';
  }
}

export function openPermissionSettings(): void {
  openSettings().catch(() => {});
}

/** Offers the only route back once the OS has stopped prompting. */
export function promptOpenSettings(kind: PermissionKind): void {
  Alert.alert(
    `${PERMISSION_LABEL[kind]} access is off`,
    `${PERMISSION_REASON[kind]}\n\nTurn it on in Settings to use this.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: openPermissionSettings },
    ],
  );
}

/**
 * Gate a feature behind a permission. Asks when it can, and when the OS won't
 * ask again points the user at Settings rather than failing silently — which is
 * what made the camera look frozen.
 */
export async function ensurePermission(kind: PermissionKind): Promise<boolean> {
  const current = await checkPermission(kind);
  if (current === 'granted') return true;
  if (current === 'unavailable') return false;

  if (current === 'denied') {
    const next = await requestPermission(kind);
    if (next === 'granted') return true;
    if (next !== 'blocked') return false;
  }

  promptOpenSettings(kind);
  return false;
}

export type PermissionSnapshot = Record<PermissionKind, PermissionState>;

export const PERMISSION_KINDS: PermissionKind[] = [
  'location',
  'camera',
  'photos',
  'notifications',
];

export async function checkAllPermissions(): Promise<PermissionSnapshot> {
  const states = await Promise.all(PERMISSION_KINDS.map(checkPermission));
  return PERMISSION_KINDS.reduce((acc, kind, i) => {
    acc[kind] = states[i];
    return acc;
  }, {} as PermissionSnapshot);
}
