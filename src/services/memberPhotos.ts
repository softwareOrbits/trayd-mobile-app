import { useEffect, useState } from 'react';

import { supabase } from './supabase';

const PROFILE_BUCKET = 'profile-photos';
const SIGNED_TTL_SECONDS = 3600;
const LIST_TTL_MS = 5 * 60_000;

type MemberPhotoRow = { id: string; name: string | null; stored: string };

const signedCache = new Map<string, { url: string; expires: number }>();
const listeners = new Set<() => void>();
let listCache: { rows: MemberPhotoRow[]; at: number } | null = null;
let listPromise: Promise<MemberPhotoRow[]> | null = null;

const normalise = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export async function resolvePhotoUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  const hit = signedCache.get(stored);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .createSignedUrl(stored, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  signedCache.set(stored, {
    url: data.signedUrl,
    expires: Date.now() + (SIGNED_TTL_SECONDS - 120) * 1000,
  });
  return data.signedUrl;
}

async function loadMemberPhotos(): Promise<MemberPhotoRow[]> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) return listCache.rows;
  if (listPromise) return listPromise;
  listPromise = (async () => {
    const { data, error } = await supabase
      .from('business_members')
      .select('id, full_name, profile_photo_path')
      .not('profile_photo_path', 'is', null);
    if (error) return listCache?.rows ?? [];
    const rows = (data ?? [])
      .filter(r => r.profile_photo_path)
      .map(r => ({
        id: r.id as string,
        name: (r.full_name as string | null) ?? null,
        stored: r.profile_photo_path as string,
      }));
    listCache = { rows, at: Date.now() };
    return rows;
  })();
  try {
    return await listPromise;
  } finally {
    listPromise = null;
  }
}

async function findStored(
  name: string | null | undefined,
  memberId: string | null | undefined,
): Promise<string | null> {
  if (!name && !memberId) return null;
  const rows = await loadMemberPhotos();
  if (memberId) {
    const byId = rows.find(r => r.id === memberId);
    if (byId) return byId.stored;
  }
  if (name) {
    const key = normalise(name);
    const byName = rows.find(r => r.name && normalise(r.name) === key);
    if (byName) return byName.stored;
  }
  return null;
}

export function invalidateMemberPhotos(): void {
  listCache = null;
  signedCache.clear();
  listeners.forEach(fn => fn());
}

export function useMemberPhoto({
  name,
  memberId,
  stored,
  lookup = true,
}: {
  name?: string | null;
  memberId?: string | null;
  stored?: string | null;
  lookup?: boolean;
}): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const source = stored ?? (lookup ? await findStored(name, memberId) : null);
      const resolved = await resolvePhotoUrl(source);
      if (active) setUrl(resolved);
    })().catch(() => {
      if (active) setUrl(null);
    });
    return () => {
      active = false;
    };
  }, [name, memberId, stored, lookup, version]);

  return url;
}
