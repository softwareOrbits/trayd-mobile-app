import { PermissionsAndroid, Platform } from 'react-native';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';

import { supabase } from './supabase';
import { store } from '@/store';
import { fetchUnread } from '@/store/notificationsSlice';
import { openNotificationTarget } from '@/navigation/navigationRef';
import { emitShiftPush, isShiftPush } from './shiftBus';
import { getJwtClaims } from '@/utils/jwt';
import { haptics } from '@/utils/haptics';

function jobIdFrom(
  msg: FirebaseMessagingTypes.RemoteMessage | null,
): string | null {
  const data = (msg?.data ?? {}) as Record<string, unknown>;
  const raw =
    data.job_id ?? data.jobId ?? data.related_entity_id ?? data.entity_id;
  return typeof raw === 'string' && raw ? raw : null;
}

async function currentSessionId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const claims = getJwtClaims(data.session?.access_token);
  return (claims?.session_id as string | undefined) ?? null;
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      if (Number(Platform.Version) >= 33) {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return res === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

async function upsertToken(token: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const sessionId = await currentSessionId();
  if (!sessionId) return;

  const { error } = await supabase.from('user_sessions').upsert(
    {
      user_id: user.id,
      session_id: sessionId,
      fcm_token: token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    },
    { onConflict: 'session_id' },
  );
  if (error) {
    console.warn('push: token upsert failed', error.message);
    return;
  }

  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('fcm_token', token)
    .neq('session_id', sessionId);
}

let listeners: Array<() => void> = [];

export async function registerPush(): Promise<void> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    if (!listeners.length) {
      listeners.push(
        messaging().onTokenRefresh(token => {
          upsertToken(token).catch(() => {});
        }),
        messaging().onMessage(msg => {
          store.dispatch(fetchUnread());
          if (isShiftPush(msg.data as Record<string, unknown>)) emitShiftPush();
          const n = msg.notification;
          if (!n) return;
          Toast.show({
            type: 'info',
            text1: n.title ?? 'Trayd',
            text2: n.body ?? undefined,
            onPress: () => {
              haptics.tap();
              Toast.hide();
              openNotificationTarget(jobIdFrom(msg));
            },
          });
        }),
        messaging().onNotificationOpenedApp(msg => {
          haptics.tap();
          if (isShiftPush(msg.data as Record<string, unknown>)) emitShiftPush();
          openNotificationTarget(jobIdFrom(msg));
        }),
      );
      messaging()
        .getInitialNotification()
        .then(msg => {
          if (msg) openNotificationTarget(jobIdFrom(msg));
        })
        .catch(() => {});
    }

    const token = await messaging().getToken();
    if (token) await upsertToken(token);
  } catch (e) {
    console.warn('push: registerPush failed', e);
  }
}

export function teardownPush(): void {
  for (const off of listeners) off();
  listeners = [];
}

export async function unregisterPush(): Promise<void> {
  try {
    await supabase.rpc('clear_session');
  } catch (e) {
    console.warn('push: clear_session failed', e);
  }
  teardownPush();
}
