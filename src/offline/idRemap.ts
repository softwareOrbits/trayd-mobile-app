import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'offline:idremap:v1';

let map: Record<string, string> = {};
let loaded = false;

export async function loadIdRemap(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) map = JSON.parse(raw) as Record<string, string>;
  } catch {
    map = {};
  }
}

export function resolveId(id: string): string {
  return map[id] ?? id;
}

export function getMappedId(tempId: string): string | undefined {
  return map[tempId];
}

export async function setIdRemap(tempId: string, realId: string): Promise<void> {
  map[tempId] = realId;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    return;
  }
}
