import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MutationKind, QueuedMutation } from './types';

const QUEUE_KEY = 'offline:mutations:v1';
const DEAD_KEY = 'offline:deadletter:v1';

const LEGACY_KEY = 'outbox:lifecycle';

type LegacyAction = {
  id: string;
  jobId: string;
  kind: 'pause' | 'resume' | 'finish';
  atIso: string;
  summary?: string | null;
  totalHours?: number | null;
};

const parse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

async function migrateLegacy(current: QueuedMutation[]): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) return current;
  const legacy = parse<LegacyAction[]>(raw, []);
  const migrated: QueuedMutation[] = legacy.map(a => ({
    id: a.id,
    kind: `job.${a.kind}` as MutationKind,
    payload: {
      jobId: a.jobId,
      atIso: a.atIso,
      summary: a.summary ?? null,
      totalHours: a.totalHours ?? null,
    },
    createdAt: a.atIso,
    attempts: 0,
    status: 'pending',
  }));
  const known = new Set(current.map(m => m.id));
  const merged = [...current, ...migrated.filter(m => !known.has(m.id))];
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(merged));
  await AsyncStorage.removeItem(LEGACY_KEY);
  return merged;
}

let migrated = false;

export async function readQueue(): Promise<QueuedMutation[]> {
  const items = parse<QueuedMutation[]>(await AsyncStorage.getItem(QUEUE_KEY), []);
  if (!migrated) {
    migrated = true;
    return migrateLegacy(items);
  }
  return items;
}

export async function replaceQueue(items: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function appendMutation(m: QueuedMutation): Promise<void> {
  const items = await readQueue();
  if (items.some(x => x.id === m.id)) return;
  items.push(m);
  await replaceQueue(items);
}

export async function readDeadLetter(): Promise<QueuedMutation[]> {
  return parse<QueuedMutation[]>(await AsyncStorage.getItem(DEAD_KEY), []);
}

export async function appendDeadLetter(items: QueuedMutation[]): Promise<void> {
  if (!items.length) return;
  const existing = await readDeadLetter();
  await AsyncStorage.setItem(DEAD_KEY, JSON.stringify([...existing, ...items]));
}

export async function clearDeadLetter(): Promise<void> {
  await AsyncStorage.removeItem(DEAD_KEY);
}
