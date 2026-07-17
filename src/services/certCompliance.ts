import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchCertificationTypes,
  fetchMyCertifications,
  type MemberCertification,
} from './certifications';
import { isOnline } from '@/offline/connectivity';

const CACHE_KEY = 'certs:compliance:v1';

export type CertBlockReason = 'missing' | 'no_document' | 'expired';

export type CertBlocker = {
  typeId: string;
  typeName: string;
  reason: CertBlockReason;
  expiresOn: string | null;
};

export type CertExpiringSoon = {
  typeId: string;
  typeName: string;
  expiresOn: string | null;
};

export type CertCompliance = {
  canWork: boolean;
  blockers: CertBlocker[];
  expiringSoon: CertExpiringSoon[];
  checkedAt: string;
};

export const COMPLIANT: CertCompliance = {
  canWork: true,
  blockers: [],
  expiringSoon: [],
  checkedAt: '',
};

/**
 * Expiry outranks a missing document: an out-of-date cert reads as "expired"
 * even if the lad never uploaded the file, because renewing it is the thing
 * that actually unblocks him.
 */
const blockerFor = (
  typeId: string,
  typeName: string,
  cert: MemberCertification | undefined,
): CertBlocker | null => {
  if (!cert) return { typeId, typeName, reason: 'missing', expiresOn: null };
  if (cert.status === 'expired')
    return { typeId, typeName, reason: 'expired', expiresOn: cert.expiresOn };
  if (!cert.documentPath)
    return {
      typeId,
      typeName,
      reason: 'no_document',
      expiresOn: cert.expiresOn,
    };
  return null;
};

export async function loadCachedCompliance(): Promise<CertCompliance | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CertCompliance) : null;
  } catch {
    return null;
  }
}

export async function fetchCertCompliance(): Promise<CertCompliance> {
  if (!isOnline()) {
    return (await loadCachedCompliance()) ?? COMPLIANT;
  }

  const [types, mine] = await Promise.all([
    fetchCertificationTypes(),
    fetchMyCertifications(),
  ]);

  const mandatory = types.filter(t => t.isMandatory);
  const blockers: CertBlocker[] = [];
  const expiringSoon: CertExpiringSoon[] = [];

  for (const type of mandatory) {
    const cert = mine.find(c => c.typeId === type.id);
    const blocker = blockerFor(type.id, type.name, cert);
    if (blocker) {
      blockers.push(blocker);
    } else if (cert?.status === 'expiring') {
      expiringSoon.push({
        typeId: type.id,
        typeName: type.name,
        expiresOn: cert.expiresOn,
      });
    }
  }

  const compliance: CertCompliance = {
    canWork: blockers.length === 0,
    blockers,
    expiringSoon,
    checkedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(compliance)).catch(
    () => {},
  );
  return compliance;
}

export async function clearComplianceCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
}
