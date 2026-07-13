import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export const useCollapsibleOnScroll = (threshold = 12) => {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;
      if (y <= 4) setCollapsed(false);
      else if (dy > threshold) setCollapsed(true);
      else if (dy < -threshold) setCollapsed(false);
    },
    [threshold],
  );

  return { collapsed, onScroll };
};

export default useCollapsibleOnScroll;
