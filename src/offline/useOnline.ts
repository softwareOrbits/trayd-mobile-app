import { useEffect, useState } from 'react';

import {
  isOfflineLimitExceeded,
  isOnline,
  subscribeConnectivity,
} from './connectivity';

export function useOnline(): boolean {
  const [online, setOnline] = useState(isOnline());
  useEffect(() => subscribeConnectivity(setOnline), []);
  return online;
}

export function useOfflineBlocked(): boolean {
  const online = useOnline();
  const [blocked, setBlocked] = useState(isOfflineLimitExceeded());
  useEffect(() => {
    if (online) {
      setBlocked(false);
      return;
    }
    const check = () => setBlocked(isOfflineLimitExceeded());
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [online]);
  return blocked;
}
