import { isOnline } from './connectivity';
import { classifyOutcome, errorMessage } from './errors';
import { handlers } from './handlers';
import { loadIdRemap, resolveId } from './idRemap';
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

export function flushNow(force = false): Promise<number> {
  if (inFlight) return inFlight;
  inFlight = runFlush(force).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

const jobKeyOf = (m: QueuedMutation): string | null => {
  const p = m.payload as { tempJobId?: unknown; jobId?: unknown };
  if (p && typeof p.tempJobId === 'string') return p.tempJobId;
  if (p && typeof p.jobId === 'string') return p.jobId;
  return null;
};

async function runFlush(force = false): Promise<number> {
  if (!force && !isOnline()) return 0;

  await loadIdRemap();

  const queue = await readQueue();
  if (!queue.length) {
    setSnapshot({ pending: 0 });
    return 0;
  }

  setSnapshot({ syncing: true, lastError: null });

  const stillQueued: QueuedMutation[] = [];
  const dead: QueuedMutation[] = [];
  const blocked = new Set<string>();
  let processed = 0;
  let lastError: string | null = null;

  for (const m of queue) {
    const key = jobKeyOf(m);
    if (key && blocked.has(key)) {
      stillQueued.push(m);
      continue;
    }

    const payload = m.payload as { jobId?: unknown };
    if (payload && typeof payload.jobId === 'string') {
      payload.jobId = resolveId(payload.jobId);
    }
    const handler = handlers[m.kind];

    let outcome: 'done' | 'retry' | 'drop';
    if (!handler) {
      outcome = 'drop';
    } else {
      try {
        outcome = await handler(m.payload);
      } catch (e) {
        lastError = errorMessage(e);
        outcome = classifyOutcome(e);
      }
    }

    if (outcome === 'done') {
      processed += 1;
      continue;
    }
    if (outcome === 'drop') {
      dead.push({ ...m, status: 'failed', lastError: lastError ?? 'Rejected' });
      continue;
    }

    m.attempts += 1;
    if (m.attempts >= MAX_ATTEMPTS) {
      dead.push({ ...m, status: 'failed', lastError: lastError ?? 'Gave up after retries' });
    } else {
      stillQueued.push(m);
      if (key) blocked.add(key);
    }
  }

  await replaceQueue(stillQueued);
  await appendDeadLetter(dead);

  setSnapshot({
    syncing: false,
    pending: stillQueued.length,
    lastError: dead.length ? dead[dead.length - 1].lastError ?? lastError : lastError,
  });
  return processed;
}
