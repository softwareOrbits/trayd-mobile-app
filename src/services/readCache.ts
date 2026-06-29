import AsyncStorage from '@react-native-async-storage/async-storage';

import { isNetworkError } from '@/offline/errors';

const PREFIX = 'readcache:';

export async function seedRead<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    return;
  }
}

export async function readCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Wraps a read so its last successful result is cached by `key` and served back
 * when the device is offline. Online behaviour is unchanged — the cache is only
 * consulted when the fetch fails with a connectivity error.
 */
export async function offlineRead<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const value = await fetcher();
    seedRead(key, value).catch(() => {});
    return value;
  } catch (e) {
    if (isNetworkError(e)) {
      const cached = await readCached<T>(key);
      if (cached !== null) return cached;
    }
    throw e;
  }
}
