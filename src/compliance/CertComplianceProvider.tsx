import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useAppSelector } from '@/store/hooks';
import {
  COMPLIANT,
  fetchCertCompliance,
  loadCachedCompliance,
  type CertCompliance,
} from '@/services/certCompliance';

type CertComplianceValue = {
  compliance: CertCompliance;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CertComplianceContext = createContext<CertComplianceValue>({
  compliance: COMPLIANT,
  loading: false,
  refresh: async () => {},
});

export const CertComplianceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const isLoggedIn = useAppSelector(s => s.auth.isLoggedIn);
  const [compliance, setCompliance] = useState<CertCompliance>(COMPLIANT);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      setCompliance(await fetchCertCompliance());
    } catch {
      const cached = await loadCachedCompliance();
      if (cached) setCompliance(cached);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setCompliance(COMPLIANT);
      return;
    }
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [isLoggedIn, refresh]);

  const value = useMemo(
    () => ({ compliance, loading, refresh }),
    [compliance, loading, refresh],
  );

  return (
    <CertComplianceContext.Provider value={value}>
      {children}
    </CertComplianceContext.Provider>
  );
};

export const useCertCompliance = () => useContext(CertComplianceContext);

export default CertComplianceProvider;
