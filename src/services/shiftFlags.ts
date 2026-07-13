import AsyncStorage from '@react-native-async-storage/async-storage';

const OVERTIME_KEY = 'shift:overtime:v1';
const REMINDED_KEY = 'shift:reminded:v1';

type DayFlags = { day: string; jobIds: string[] };

async function readFlags(key: string, day: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as DayFlags;
    if (parsed?.day !== day || !Array.isArray(parsed.jobIds)) return new Set();
    return new Set(parsed.jobIds);
  } catch {
    return new Set();
  }
}

async function addFlag(key: string, day: string, jobId: string): Promise<void> {
  const jobIds = await readFlags(key, day);
  jobIds.add(jobId);
  const next: DayFlags = { day, jobIds: [...jobIds] };
  await AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
}

export async function isOvertimeOptIn(
  jobId: string,
  day: string,
): Promise<boolean> {
  return (await readFlags(OVERTIME_KEY, day)).has(jobId);
}

export function setOvertimeOptIn(jobId: string, day: string): Promise<void> {
  return addFlag(OVERTIME_KEY, day, jobId);
}

export async function wasReminded(
  jobId: string,
  day: string,
): Promise<boolean> {
  return (await readFlags(REMINDED_KEY, day)).has(jobId);
}

export function markReminded(jobId: string, day: string): Promise<void> {
  return addFlag(REMINDED_KEY, day, jobId);
}

export async function clearShiftFlags(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(OVERTIME_KEY).catch(() => {}),
    AsyncStorage.removeItem(REMINDED_KEY).catch(() => {}),
  ]);
}
