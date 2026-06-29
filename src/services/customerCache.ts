import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Customer } from './customers';

const KEY = 'customercache:list';
const MAX = 300;

export async function loadCustomerCache(): Promise<Customer[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Customer[]) : [];
  } catch {
    return [];
  }
}

export async function mergeCustomerCache(list: Customer[]): Promise<void> {
  if (!list.length) return;
  try {
    const byId = new Map((await loadCustomerCache()).map(c => [c.id, c]));
    for (const c of list) byId.set(c.id, c);
    const merged = Array.from(byId.values())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    return;
  }
}

export function filterCachedCustomers(
  list: Customer[],
  term?: string,
): Customer[] {
  const t = term?.trim().toLowerCase();
  const matched = t
    ? list.filter(
        c =>
          c.name.toLowerCase().includes(t) ||
          (c.phone ?? '').toLowerCase().includes(t),
      )
    : list;
  return matched.slice(0, 15);
}
