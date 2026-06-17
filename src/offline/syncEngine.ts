import { isOnline } from './connectivity';
import { errorMessage, isNetworkError } from './errors';
import { handlers } from './handlers';
import {
  appendDeadLetter,
  appendMutation,
  readQueue,
  replaceQueue,
} from './queue';
import type { MutationKind, QueuedMutation, SyncSnapshot } from './types';

const MAX_ATTEMPTS = 5;

let snapshot: SyncSnapshot = { pending: 0, syncing: false, lastError: null };
const listeners = new Set<() => void>();

export const getSyncSnapshot = (): SyncSnapshot => snapshot;

export const subscribeSync = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const setSnapshot = (patch: Partial<SyncSnapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(l => l());
};

export async function refreshPending(): Promise<void> {
  const items = await readQueue();
  setSnapshot({ pending: items.length });
}

export type EnqueueInput<P = unknown> = {
  id: string;
  kind: MutationKind;
  payload: P;
  createdAt?: string;
};

export async function enqueue<P>(input: EnqueueInput<P>): Promise<void> {
  await appendMutation({
    id: input.id,
    kind: input.kind,
    payload: input.payload,
    createdAt: input.createdAt ?? new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  });
  await refreshPending();
  flushNow().catch(() => {});
}

let inFlight: Promise<number> | null = null;

export function flushNow(): Promise<number> {
  if (inFlight) return inFlight;
  inFlight = runFlush().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runFlush(): Promise<number> {
  if (!isOnline()) return 0;

  const queue = await readQueue();
  if (!queue.length) {
    setSnapshot({ pending: 0 });
    return 0;
  }

  setSnapshot({ syncing: true, lastError: null });

  const remaining: QueuedMutation[] = [...queue];
  const dead: QueuedMutation[] = [];
  let processed = 0;
  let lastError: string | null = null;

  while (remaining.length) {
    const m = remaining[0];
    const handler = handlers[m.kind];

    let outcome: 'done' | 'retry' | 'drop';
    if (!handler) {
      outcome = 'drop';
    } else {
      try {
        outcome = await handler(m.payload);
      } catch (e) {
        lastError = errorMessage(e);
        outcome = isNetworkError(e) ? 'retry' : 'drop';
      }
    }

    if (outcome === 'retry') {
      m.attempts += 1;
      if (m.attempts >= MAX_ATTEMPTS) {
        remaining.shift();
        dead.push({ ...m, status: 'failed', lastError: lastError ?? 'Gave up after retries' });
        continue;
      }
      break;
    }

    remaining.shift();
    if (outcome === 'drop') {
      dead.push({ ...m, status: 'failed', lastError: lastError ?? 'Rejected' });
    } else {
      processed += 1;
    }
  }

  await replaceQueue(remaining);
  await appendDeadLetter(dead);

  setSnapshot({
    syncing: false,
    pending: remaining.length,
    lastError: dead.length ? dead[dead.length - 1].lastError ?? lastError : lastError,
  });
  return processed;
}
