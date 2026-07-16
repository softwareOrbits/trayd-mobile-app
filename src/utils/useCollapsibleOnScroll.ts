import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useNavCollapse } from './navCollapse';

/**
 * Collapses the bottom bar and the FAB while the user scrolls down. The state
 * is shared (see NavCollapseProvider) rather than local, so the bar can react
 * to it too — it's rendered beside the screens, not inside them.
 */
export const useCollapsibleOnScroll = (threshold = 12) => {
  const { collapsed, setCollapsed } = useNavCollapse();
  const lastY = useRef(0);

  // Shared state would otherwise carry a collapsed bar over to the next tab.
  useFocusEffect(
    useCallback(() => {
      lastY.current = 0;
      setCollapsed(false);
    }, [setCollapsed]),
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;
      if (y <= 4) setCollapsed(false);
      else if (dy > threshold) setCollapsed(true);
      else if (dy < -threshold) setCollapsed(false);
    },
    [threshold, setCollapsed],
  );

  return { collapsed, onScroll };
};

export default useCollapsibleOnScroll;
