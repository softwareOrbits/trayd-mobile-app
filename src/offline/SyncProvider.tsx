import { type ReactNode, useEffect } from 'react';
import { AppState } from 'react-native';

import { subscribeConnectivity } from './connectivity';
import { flushNow, refreshPending } from './syncEngine';

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    refreshPending();
    flushNow().catch(() => {});

    const unsubscribeNet = subscribeConnectivity(online => {
      if (online) flushNow().catch(() => {});
    });

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') flushNow().catch(() => {});
    });

    return () => {
      unsubscribeNet();
      sub.remove();
    };
  }, []);

  return <>{children}</>;
};

export default SyncProvider;
