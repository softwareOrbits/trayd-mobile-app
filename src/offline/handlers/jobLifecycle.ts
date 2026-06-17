import { finishJob, pauseJob, resumeJob } from '@/services/jobs';

import { isLifecycleAlreadyApplied, isNetworkError } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';

export type LifecyclePayload = {
  jobId: string;
  atIso?: string;
  summary?: string | null;
  totalHours?: number | null;
};

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

export const jobLifecycleHandlers: Record<
  Extract<MutationKind, `job.${'pause' | 'resume' | 'finish'}`>,
  Handler<LifecyclePayload>
> = {
  'job.pause': p => run('pause', () => pauseJob(p.jobId, p.atIso)),
  'job.resume': p => run('resume', () => resumeJob(p.jobId, p.atIso)),
  'job.finish': p =>
    run('finish', () =>
      finishJob({
        jobId: p.jobId,
        summary: p.summary ?? null,
        totalHours: p.totalHours ?? null,
        atIso: p.atIso,
      }),
    ),
};
