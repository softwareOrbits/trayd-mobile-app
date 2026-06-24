import { finishJob, pauseJob, resumeJob, updateJobStatus } from '@/services/jobs';

import { isLifecycleAlreadyApplied, isNetworkError } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';
import type { JobStatus } from '@/types';

export type LifecyclePayload = {
  jobId: string;
  atIso?: string;
  summary?: string | null;
  totalHours?: number | null;
};

export type StatusPayload = { jobId: string; status: JobStatus };

const outcomeFor = (
  kind: 'pause' | 'resume' | 'finish',
  e: unknown,
): FlushOutcome => {
  if (isLifecycleAlreadyApplied(kind, e)) return 'done';
  if (isNetworkError(e)) return 'retry';
  return 'drop';
};

const run = async (
  kind: 'pause' | 'resume' | 'finish',
  fn: () => Promise<unknown>,
): Promise<FlushOutcome> => {
  try {
    await fn();
    return 'done';
  } catch (e) {
    return outcomeFor(kind, e);
  }
};

const runStatus = async (p: StatusPayload): Promise<FlushOutcome> => {
  try {
    await updateJobStatus(p.jobId, p.status);
    return 'done';
  } catch (e) {
    return isNetworkError(e) ? 'retry' : 'drop';
  }
};

export const jobLifecycleHandlers: Record<
  Extract<MutationKind, `job.${'pause' | 'resume' | 'finish' | 'status'}`>,
  Handler
> = {
  'job.pause': p =>
    run('pause', () => pauseJob((p as LifecyclePayload).jobId, (p as LifecyclePayload).atIso)),
  'job.resume': p =>
    run('resume', () => resumeJob((p as LifecyclePayload).jobId, (p as LifecyclePayload).atIso)),
  'job.finish': p =>
    run('finish', () =>
      finishJob({
        jobId: (p as LifecyclePayload).jobId,
        summary: (p as LifecyclePayload).summary ?? null,
        totalHours: (p as LifecyclePayload).totalHours ?? null,
        atIso: (p as LifecyclePayload).atIso,
      }),
    ),
  'job.status': p => runStatus(p as StatusPayload),
};
