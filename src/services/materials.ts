import { supabase } from './supabase';

/** One row from the business's `materials` catalog. */
export type CatalogMaterial = {
  id: string;
  name: string;
  unit: string | null;
  category: string | null;
  costPrice: number;
  sellPrice: number;
};

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
  if (cached) return cached;

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

  if (searchCache.size >= 100) {
    searchCache.delete(searchCache.keys().next().value as string);
  }
  searchCache.set(key, out);
  return out;
}
