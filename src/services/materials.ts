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

export async function searchMaterials(
  query?: string,
): Promise<CatalogMaterial[]> {
  let q = supabase
    .from('materials')
    .select('id, name, unit, category, cost_price, sell_price')
    .order('name')
    .limit(50);

  const term = query?.trim().replace(/[,()]/g, '');
  if (term) {
    q = q.ilike('name', `%${term}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as MaterialRow[]).map(r => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    category: r.category,
    costPrice: num(r.cost_price),
    sellPrice: num(r.sell_price),
  }));
}
