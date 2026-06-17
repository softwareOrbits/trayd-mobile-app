import { useSyncExternalStore } from 'react';

import { flushNow, getSyncSnapshot, subscribeSync } from './syncEngine';
import type { SyncSnapshot } from './types';

export function useSync(): SyncSnapshot & { flushNow: typeof flushNow } {
  const snapshot = useSyncExternalStore(subscribeSync, getSyncSnapshot);
  return { ...snapshot, flushNow };
}
