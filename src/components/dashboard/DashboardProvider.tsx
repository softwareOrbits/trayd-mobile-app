import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  fetchDashboard,
  loadCachedDashboard,
  type DashboardData,
} from '@/services/dashboard';
import { useOnline } from '@/offline';

type DashboardValue = {
  data: DashboardData | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const DashboardContext = createContext<DashboardValue>({
  data: null,
  loading: false,
  refresh: async () => {},
});

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const online = useOnline();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchDashboard());
    } catch {
      // Offline with no cache yet, or the RPC failed — keep whatever we have
      // rather than blanking the tiles.
      const cached = await loadCachedDashboard();
      if (cached) setData(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  // Paint the last known dashboard immediately so an offline open isn't a wall
  // of "—" while the doomed fetch times out.
  useEffect(() => {
    let active = true;
    loadCachedDashboard()
      .then(cached => {
        if (active && cached) setData(prev => prev ?? cached);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Signal came back — pull fresh numbers over the cached ones.
  useEffect(() => {
    if (online) refresh();
  }, [online, refresh]);

  const value = useMemo(
    () => ({ data, loading, refresh }),
    [data, loading, refresh],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);

export default DashboardProvider;
