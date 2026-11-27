import { useCallback, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';

import { isOnline } from '@/offline/connectivity';
import { useTheme } from '@/theme';

export const usePullRefresh = (load: () => unknown) => {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const onRefresh = useCallback(async () => {
    if (!isOnline()) {
      Toast.show({
        type: 'info',
        text1: 'You’re offline.',
        text2: 'Showing saved data.',
      });
    }
    setRefreshing(true);
    try {
      await loadRef.current();
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.secondary}
      colors={[colors.primary]}
    />
  );
};
