import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import { isNetworkError } from '@/offline/errors';
import { isOnline } from '@/offline/connectivity';

/** One row from the business's `materials` catalog. */
export type CatalogMaterial = {
  id: string;
  name: string;
  unit: string | null;
  category: string | null;
  costPrice: number;
  sellPrice: number;
};

const CATALOG_KEY = 'materialscache:v1';
const CATALOG_MAX = 500;

async function loadCatalog(): Promise<CatalogMaterial[]> {
  try {
    const raw = await AsyncStorage.getItem(CATALOG_KEY);
    return raw ? (JSON.parse(raw) as CatalogMaterial[]) : [];
  } catch {
    return [];
  }
}

async function mergeCatalog(list: CatalogMaterial[]): Promise<void> {
  if (!list.length) return;
  try {
    const byId = new Map((await loadCatalog()).map(m => [m.id, m]));
    for (const m of list) byId.set(m.id, m);
    const merged = Array.from(byId.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, CATALOG_MAX);
    await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(merged));
  } catch {
    return;
  }
}

type MaterialRow = {
  id: string;
  name: string;
  unit: string | null;
  category: string | null;
  cost_price: number | string | null;
  sell_price: number | string | null;
};

const num = (v: number | string | null) =>
  v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v;

// Cache catalog searches per normalised term so re-typing the same query (or
// reopening the picker) doesn't re-hit the DB. Cleared on app restart.
const searchCache = new Map<string, CatalogMaterial[]>();
const cacheKey = (query?: string) =>
  (query?.trim().replace(/[,()]/g, '') ?? '').toLowerCase();

/** Synchronous cache peek — lets callers skip the spinner/debounce on a hit. */
export function peekMaterials(query?: string): CatalogMaterial[] | undefined {
  return searchCache.get(cacheKey(query));
}

export async function searchMaterials(
  query?: string,
): Promise<CatalogMaterial[]> {
  const term = query?.trim().replace(/[,()]/g, '') ?? '';
  const key = cacheKey(query);
  const cached = searchCache.get(key);
  if (cached?.length) return cached;

  if (!isOnline()) {
    const all = await loadCatalog();
    const t = term.toLowerCase();
    const offlineHits = (
      t ? all.filter(m => m.name.toLowerCase().includes(t)) : all
    ).slice(0, 50);
    if (offlineHits.length) return offlineHits;
  }

  try {
    let q = supabase
      .from('materials')
      .select('id, name, unit, category, cost_price, sell_price')
      .eq('is_system', false)
      .order('name')
      .limit(50);

    if (term) {
      q = q.ilike('name', `%${term}%`);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const out = ((data ?? []) as MaterialRow[]).map(r => ({
      id: r.id,
      name: r.name,
      unit: r.unit,
      category: r.category,
      costPrice: num(r.cost_price),
      sellPrice: num(r.sell_price),
    }));

    // Only cache non-empty results — an early call (before the session/RLS is
    // ready) can return 0 rows without error, and caching that empty list would
    // hide the catalog for the rest of the session until a fresh term is typed.
    if (out.length) {
      if (searchCache.size >= 100) {
        searchCache.delete(searchCache.keys().next().value as string);
      }
      searchCache.set(key, out);
      mergeCatalog(out).catch(() => {});
    }
    return out;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const all = await loadCatalog();
    const t = term.toLowerCase();
    return (t ? all.filter(m => m.name.toLowerCase().includes(t)) : all).slice(
      0,
      50,
    );
  }
}
