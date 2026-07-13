import {
  confirmJobMaterials,
  finishJob,
  pauseJob,
  resumeJob,
  updateJobStatus,
} from '@/services/jobs';

import { classifyOutcome, isLifecycleAlreadyApplied } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';
import type { JobStatus } from '@/types';

export type LifecyclePayload = {
  jobId: string;
  atIso?: string;
  summary?: string | null;
  totalHours?: number | null;
  /** End-day / Continue tomorrow: replay as the crew-level pause_job. */
  crew?: boolean;
};

export type StatusPayload = { jobId: string; status: JobStatus; atIso?: string };

export type ConfirmMaterialsPayload = { jobId: string };

const outcomeFor = (
  kind: 'pause' | 'resume' | 'finish',
  e: unknown,
): FlushOutcome => {
  if (isLifecycleAlreadyApplied(kind, e)) return 'done';
  return classifyOutcome(e);
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
    await updateJobStatus(p.jobId, p.status, p.atIso);
    return 'done';
  } catch (e) {
    return classifyOutcome(e);
  }
};

const runConfirm = async (p: ConfirmMaterialsPayload): Promise<FlushOutcome> => {
  try {
    await confirmJobMaterials(p.jobId);
    return 'done';
  } catch (e) {
    return classifyOutcome(e);
  }
};

export const jobLifecycleHandlers: Record<
  Extract<
    MutationKind,
    `job.${'pause' | 'resume' | 'finish' | 'status' | 'confirmMaterials'}`
  >,
  Handler
> = {
  'job.pause': p =>
    run('pause', () =>
      pauseJob((p as LifecyclePayload).jobId, (p as LifecyclePayload).atIso, {
        crew: (p as LifecyclePayload).crew === true,
      }),
    ),
  'job.resume': p =>
    run('resume', () =>
      resumeJob((p as LifecyclePayload).jobId, (p as LifecyclePayload).atIso, {
        crew: (p as LifecyclePayload).crew === true,
      }),
    ),
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
  'job.confirmMaterials': p => runConfirm(p as ConfirmMaterialsPayload),
};
