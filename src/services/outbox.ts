import AsyncStorage from '@react-native-async-storage/async-storage';
import { finishJob, pauseJob, resumeJob } from './jobs';

const KEY = 'outbox:lifecycle';

export type QueuedAction = {
  id: string;
  jobId: string;
  kind: 'pause' | 'resume' | 'finish';
  atIso: string;
  summary?: string | null;
  totalHours?: number | null;
};

const read = async (): Promise<QueuedAction[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    return [];
  }
};

const write = (items: QueuedAction[]) =>
  AsyncStorage.setItem(KEY, JSON.stringify(items));

export async function enqueueAction(action: QueuedAction): Promise<void> {
  const items = await read();
  items.push(action);
  await write(items);
}

/** Backwards-compatible helper used by the wrap-up screen. */
export async function queueFinish(input: {
  jobId: string;
  summary: string | null;
  totalHours: number | null;
  atIso: string;
}): Promise<void> {
  await enqueueAction({
    id: `${input.jobId}:finish:${input.atIso}`,
    jobId: input.jobId,
    kind: 'finish',
    atIso: input.atIso,
    summary: input.summary,
    totalHours: input.totalHours,
  });
}

export async function hasQueuedActions(jobId?: string): Promise<boolean> {
  const items = await read();
  return jobId ? items.some(i => i.jobId === jobId) : items.length > 0;
}

const isNetworkError = (e: unknown) => {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout')
  );
};

const isAlreadyApplied = (kind: QueuedAction['kind'], e: unknown) => {
  const msg = e instanceof Error ? e.message : '';
  if (kind === 'pause') return msg.startsWith('Job is not running');
  if (kind === 'resume') return msg.startsWith('Job is not paused');
  return msg.startsWith('This job was already finished');
};

const replay = (a: QueuedAction) => {
  if (a.kind === 'pause') return pauseJob(a.jobId, a.atIso);
  if (a.kind === 'resume') return resumeJob(a.jobId, a.atIso);
  return finishJob({
    jobId: a.jobId,
    summary: a.summary ?? null,
    totalHours: a.totalHours ?? null,
    atIso: a.atIso,
  });
};

export async function flushOutbox(): Promise<number> {
  const items = await read();
  if (!items.length) return 0;

  let cleared = 0;
  let i = 0;
  for (; i < items.length; i++) {
    const a = items[i];
    try {
      await replay(a);
      cleared += 1;
    } catch (e) {
      if (isAlreadyApplied(a.kind, e)) {
        cleared += 1; // server already past it — drop and continue
        continue;
      }
      if (isNetworkError(e)) {
        break; // still offline — keep this and the rest for next flush
      }
      cleared += 1;
    }
  }

  await write(items.slice(i));
  return cleared;
}
