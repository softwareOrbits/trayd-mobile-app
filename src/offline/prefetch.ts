import { InteractionManager } from 'react-native';

import { searchCustomers } from '@/services/customers';
import { searchMaterials } from '@/services/materials';
import { fetchActiveRoster } from '@/services/member';
import {
  fetchJobDays,
  fetchJobDetail,
  fetchJobMaterials,
  fetchJobNotes,
  fetchJobRoster,
  fetchJobSegments,
} from '@/services/jobs';
import { saveJobCache, type JobBundle } from '@/services/jobCache';
import { store } from '@/store';
import { fetchJobs } from '@/store/jobsSlice';

import { isOnline } from './connectivity';
import { flushNow } from './syncEngine';

const JOB_PREFETCH_LIMIT = 20;
const JOB_PREFETCH_CONCURRENCY = 3;

let running = false;

export async function prefetchJobBundle(jobId: string): Promise<void> {
  if (!isOnline()) return;
  const [detail, materials, notes, segments, days, crew] = await Promise.all([
    fetchJobDetail(jobId).catch(() => null),
    fetchJobMaterials(jobId).catch(() => null),
    fetchJobNotes(jobId).catch(() => null),
    fetchJobSegments(jobId).catch(() => null),
    fetchJobDays(jobId).catch(() => null),
    fetchJobRoster(jobId).catch(() => null),
  ]);

  const bundle: JobBundle = {};
  if (detail) bundle.detail = detail;
  if (materials) bundle.materials = materials;
  if (notes) bundle.notes = notes;
  if (segments) bundle.segments = segments;
  if (days) bundle.days = days;
  if (crew) bundle.crew = crew;
  if (Object.keys(bundle).length) await saveJobCache(jobId, bundle);
}

async function prefetchJobBundles(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += JOB_PREFETCH_CONCURRENCY) {
    if (!isOnline()) return;
    await Promise.allSettled(
      ids.slice(i, i + JOB_PREFETCH_CONCURRENCY).map(prefetchJobBundle),
    );
  }
}

async function run(): Promise<void> {
  await flushNow().catch(() => {});

  const [jobsResult] = await Promise.allSettled([
    store.dispatch(fetchJobs()).unwrap(),
    fetchActiveRoster(),
    searchCustomers(),
    searchMaterials(),
  ]);

  if (jobsResult.status === 'fulfilled' && isOnline()) {
    await prefetchJobBundles(
      jobsResult.value.slice(0, JOB_PREFETCH_LIMIT).map(j => j.id),
    );
  }
}

export function warmCaches(): void {
  if (running || !isOnline()) return;
  running = true;
  InteractionManager.runAfterInteractions(() => {
    run().finally(() => {
      running = false;
    });
  });
}
