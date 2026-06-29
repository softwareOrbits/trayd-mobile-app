import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';

import { supabase } from './supabase';
import { getJwtClaims } from '@/utils/jwt';

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
          const n = msg.notification;
          if (!n) return;
          Toast.show({
            type: 'info',
            text1: n.title ?? 'Trayd',
            text2: n.body ?? undefined,
          });
        }),
      );
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
