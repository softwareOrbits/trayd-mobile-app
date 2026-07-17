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
  dismissed: boolean;
  dismiss: () => void;
  refresh: () => Promise<void>;
};

const CertComplianceContext = createContext<CertComplianceValue>({
  compliance: COMPLIANT,
  loading: false,
  dismissed: false,
  dismiss: () => {},
  refresh: async () => {},
});

const signatureOf = (c: CertCompliance) =>
  [
    ...c.blockers.map(b => `${b.typeId}:${b.reason}`),
    ...c.expiringSoon.map(e => `${e.typeId}:expiring`),
  ]
    .sort()
    .join('|');

export const CertComplianceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const isLoggedIn = useAppSelector(s => s.auth.isLoggedIn);
  const [compliance, setCompliance] = useState<CertCompliance>(COMPLIANT);
  const [loading, setLoading] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(
    null,
  );

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
      setDismissedSignature(null);
      return;
    }
    refresh();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [isLoggedIn, refresh]);

  const signature = signatureOf(compliance);
  const dismiss = useCallback(
    () => setDismissedSignature(signature),
    [signature],
  );

  const value = useMemo(
    () => ({
      compliance,
      loading,
      dismissed: dismissedSignature === signature,
      dismiss,
      refresh,
    }),
    [compliance, loading, dismissedSignature, signature, dismiss, refresh],
  );

  return (
    <CertComplianceContext.Provider value={value}>
      {children}
    </CertComplianceContext.Provider>
  );
};

export const useCertCompliance = () => useContext(CertComplianceContext);

export default CertComplianceProvider;
