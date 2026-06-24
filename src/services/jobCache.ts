import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  JobCrewMember,
  JobDay,
  JobMaterial,
  JobNote,
  JobSegment,
} from '@/services/jobs';
import type { JobDetail } from '@/types';

export type JobBundle = {
  detail?: JobDetail;
  segments?: JobSegment[];
  materials?: JobMaterial[];
  days?: JobDay[];
  notes?: JobNote[];
  crew?: JobCrewMember[];
  rates?: [string, number][];
  vat?: number;
};

const KEY = (jobId: string) => `jobcache:${jobId}`;

export async function loadJobCache(jobId: string): Promise<JobBundle | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY(jobId));
    return raw ? (JSON.parse(raw) as JobBundle) : null;
  } catch {
    return null;
  }
}

export async function saveJobCache(
  jobId: string,
  partial: JobBundle,
): Promise<void> {
  try {
    const prev = (await loadJobCache(jobId)) ?? {};
    await AsyncStorage.setItem(KEY(jobId), JSON.stringify({ ...prev, ...partial }));
  } catch {
    return;
  }
}
