import { supabase } from './supabase';
import { distanceMeters, type GpsPoint } from '@/utils/location';
import { isNetworkError } from '@/offline/errors';
import { isOnline } from '@/offline/connectivity';
import {
  filterCachedCustomers,
  loadCustomerCache,
  mergeCustomerCache,
} from './customerCache';

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  eircode: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  createdAt: string;
};

export type SimilarityReason = 'phone_exact' | 'phone_partial' | 'name_match';

/** One row from the `find_similar_customers` RPC. */
export type CandidateCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  eircode: string;
  similarityReason: SimilarityReason;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  eircode: string | null;
  gps_lat: number | string | null;
  gps_lng: number | string | null;
  created_at: string;
};

const num = (v: number | string | null) =>
  v == null ? null : typeof v === 'string' ? parseFloat(v) : v;

const mapCustomer = (r: CustomerRow): Customer => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email,
  address: r.address,
  eircode: r.eircode,
  gpsLat: num(r.gps_lat),
  gpsLng: num(r.gps_lng),
  createdAt: r.created_at,
});

const CUSTOMER_COLS =
  'id, name, phone, email, address, eircode, gps_lat, gps_lng, created_at';

/**
 * Customers for the Start Job wizard's step 1 — most recent first,
 * optionally filtered by name/phone.
 */
export async function searchCustomers(query?: string): Promise<Customer[]> {
  const term = query?.trim().replace(/[,()]/g, '');
  if (!isOnline()) {
    const cachedHits = filterCachedCustomers(await loadCustomerCache(), term);
    if (cachedHits.length) return cachedHits;
  }
  try {
    let q = supabase
      .from('customers')
      .select(CUSTOMER_COLS)
      .order('created_at', { ascending: false })
      .limit(15);
    if (term) {
      q = q.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const out = ((data ?? []) as CustomerRow[]).map(mapCustomer);
    mergeCustomerCache(out).catch(() => {});
    return out;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    return filterCachedCustomers(await loadCustomerCache(), term);
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_COLS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapCustomer(data as CustomerRow) : null;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    return (await loadCustomerCache()).find(c => c.id === id) ?? null;
  }
}

/**
 * Best-effort: pin the job's customer at the given coordinates (used after
 * start_job when the address came from Google Places). Never overwrites an
 * existing pin and never throws.
 */
export async function pinCustomerGps(
  jobId: string,
  gps: GpsPoint,
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('customer_id')
      .eq('id', jobId)
      .single();
    if (error || !data?.customer_id) return;
    await supabase
      .from('customers')
      .update({ gps_lat: gps.lat, gps_lng: gps.lng })
      .eq('id', data.customer_id)
      .is('gps_lat', null);
  } catch (e) {
    console.warn('pinCustomerGps:', e instanceof Error ? e.message : e);
  }
}

export type NearestCustomer = {
  customer: Customer;
  distanceM: number;
  priorJobs: number;
};

/**
 * Closest customer to the given point, by haversine over customers that have
 * GPS pins (stamped by `start_job`). Returns null when none are within
 * `maxMeters`.
 */
export async function findNearestCustomer(
  gps: GpsPoint,
  maxMeters = 10_000,
): Promise<NearestCustomer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_COLS)
    .not('gps_lat', 'is', null)
    .not('gps_lng', 'is', null)
    .limit(200);
  if (error) throw new Error(error.message);

  let best: { customer: Customer; distanceM: number } | null = null;
  for (const row of (data ?? []) as CustomerRow[]) {
    const customer = mapCustomer(row);
    if (customer.gpsLat == null || customer.gpsLng == null) continue;
    const d = distanceMeters(gps, {
      lat: customer.gpsLat,
      lng: customer.gpsLng,
    });
    if (d <= maxMeters && (!best || d < best.distanceM)) {
      best = { customer, distanceM: d };
    }
  }
  if (!best) return null;

  const { count } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', best.customer.id);

  return { ...best, priorJobs: count ?? 0 };
}

type SimilarRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  eircode: string;
  similarity_reason: SimilarityReason;
};

/** Duplicate check before creating a new customer (steps 1 → 2). */
export async function findSimilarCustomers(
  phone?: string,
  name?: string,
): Promise<CandidateCustomer[]> {
  const { data, error } = await supabase.rpc('find_similar_customers', {
    p_phone: phone || null,
    p_name: name || null,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as SimilarRow[]).map(r => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    eircode: r.eircode,
    similarityReason: r.similarity_reason,
  }));
}
