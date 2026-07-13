/**
 * Compatibility shim.
 *
 * The offline queue now lives in `@/offline` as a generic mutation layer. This
 * module is kept only so the screens that already import the old lifecycle API
 * keep working unchanged. New code should import from `@/offline` directly.
 *
 * @deprecated Use `enqueue` / `flushNow` / `useSync` from `@/offline`.
 */
import { enqueue, flushNow } from '@/offline';
import { readQueue } from '@/offline';

export type QueuedAction = {
  id: string;
  jobId: string;
  kind: 'pause' | 'resume' | 'finish';
  atIso: string;
  summary?: string | null;
  totalHours?: number | null;
  /** End-day / Continue tomorrow — replays as the crew-level pause_job. */
  crew?: boolean;
};

export function enqueueAction(action: QueuedAction): Promise<void> {
  return enqueue({
    id: action.id,
    kind: `job.${action.kind}`,
    createdAt: action.atIso,
    payload: {
      jobId: action.jobId,
      atIso: action.atIso,
      summary: action.summary ?? null,
      totalHours: action.totalHours ?? null,
      crew: action.crew === true,
    },
  });
}

export function queueFinish(input: {
  jobId: string;
  summary: string | null;
  totalHours: number | null;
  atIso: string;
}): Promise<void> {
  return enqueueAction({
    id: `${input.jobId}:finish:${input.atIso}`,
    jobId: input.jobId,
    kind: 'finish',
    atIso: input.atIso,
    summary: input.summary,
    totalHours: input.totalHours,
  });
}

export async function hasQueuedActions(jobId?: string): Promise<boolean> {
  const items = await readQueue();
  const lifecycle = items.filter(i => i.kind.startsWith('job.'));
  if (!jobId) return lifecycle.length > 0;
  return lifecycle.some(
    i => (i.payload as { jobId?: string })?.jobId === jobId,
  );
}

export function flushOutbox(): Promise<number> {
  return flushNow();
}
