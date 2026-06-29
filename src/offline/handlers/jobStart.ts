import {
  DuplicateCustomerError,
  startJob,
  type StartJobPayload,
} from '@/services/jobs';
import { store } from '@/store';
import { fetchJobs } from '@/store/jobsSlice';
import { removePendingJob } from '@/store/pendingJobsSlice';

import { classifyOutcome } from '../errors';
import { setIdRemap } from '../idRemap';
import type { FlushOutcome, Handler, MutationKind } from '../types';

export type JobStartPayload = {
  tempJobId: string;
  customerId?: string;
  newCustomer?: StartJobPayload['newCustomer'];
  jobType: StartJobPayload['jobType'];
  memberIds: string[];
  gps?: StartJobPayload['gps'];
  startedAt?: string;
};

const commit = (
  p: JobStartPayload,
  customerId: string | undefined,
  newCustomer: StartJobPayload['newCustomer'] | undefined,
): Promise<string> =>
  startJob({
    customerId,
    newCustomer,
    jobType: p.jobType,
    memberIds: p.memberIds,
    gps: p.gps,
    startedAt: p.startedAt,
  });

const finalize = async (tempJobId: string, realId: string): Promise<void> => {
  await setIdRemap(tempJobId, realId);
  try {
    const jobs = await store.dispatch(fetchJobs()).unwrap();
    if (jobs.some(j => j.id === realId)) {
      store.dispatch(removePendingJob(tempJobId));
    }
  } catch {
    return;
  }
};

const start = async (p: JobStartPayload): Promise<FlushOutcome> => {
  try {
    const realId = await commit(p, p.customerId, p.newCustomer);
    await finalize(p.tempJobId, realId);
    return 'done';
  } catch (e) {
    if (e instanceof DuplicateCustomerError) {
      try {
        const realId = await commit(p, e.existingId, undefined);
        await finalize(p.tempJobId, realId);
        return 'done';
      } catch (e2) {
        return classifyOutcome(e2);
      }
    }
    return classifyOutcome(e);
  }
};

export const jobStartHandlers: Record<
  Extract<MutationKind, 'job.start'>,
  Handler
> = {
  'job.start': p => start(p as JobStartPayload),
};
