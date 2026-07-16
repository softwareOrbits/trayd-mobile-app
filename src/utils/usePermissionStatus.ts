import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  checkAllPermissions,
  ensurePermission,
  type PermissionKind,
  type PermissionSnapshot,
} from './permissions';

/**
 * Live permission states. Re-reads on focus and when the app returns from the
 * background, so toggling a switch in Settings is reflected on return without
 * a restart.
 */
export const usePermissionStatus = () => {
  const [status, setStatus] = useState<PermissionSnapshot | null>(null);

  const refresh = useCallback(() => {
    checkAllPermissions().then(setStatus);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const sub = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      });
      return () => sub.remove();
    }, [refresh]),
  );

  const fix = useCallback(
    async (kind: PermissionKind) => {
      await ensurePermission(kind);
      refresh();
    },
    [refresh],
  );

  const missing = status
    ? (Object.keys(status) as PermissionKind[]).filter(
        k => status[k] === 'denied' || status[k] === 'blocked',
      )
    : [];

  return { status, missing, refresh, fix };
};
