import { supabase } from './supabase';
import { base64ToUint8Array } from '@/utils/base64';

const PROFILE_BUCKET = 'profile-photos';

export type MemberProfile = {
  id: string;
  fullName: string | null;
  email: string | null;
  roleName: string | null;
  companyName: string | null;
  businessId: string | null;
  photoPath: string | null;
};

const pickOne = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

/**
 * Loads the signed-in user's `business_members` row with the embedded
 * business name and job role. Relies on the `business_members_select_own`
 * RLS policy (scoped by the `business_id` JWT claim).
 */
export async function fetchMyMember(): Promise<MemberProfile> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('business_members')
    .select(
      'id, full_name, email, profile_photo_path, business_id, businesses(trading_name), job_roles(name)',
    )
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("We couldn't find your membership.");

  const business = pickOne<{ trading_name: string | null }>(
    data.businesses as never,
  );
  const role = pickOne<{ name: string | null }>(data.job_roles as never);

  return {
    id: data.id,
    fullName: data.full_name ?? null,
    email: data.email ?? null,
    roleName: role?.name ?? null,
    companyName: business?.trading_name ?? null,
    businessId: data.business_id ?? null,
    photoPath: data.profile_photo_path ?? null,
  };
}

const extFromType = (type?: string | null) => {
  if (type?.includes('png')) return 'png';
  if (type?.includes('webp')) return 'webp';
  return 'jpg';
};

/**
 * Uploads a picked image (base64) to the private `profile-photos` bucket under
 * the caller's own folder, then persists the path on their member row via the
 * `set_my_profile_photo` RPC (business_members UPDATE is owner-only otherwise).
 * Returns the stored object path.
 */
export async function uploadProfilePhoto(asset: {
  base64: string;
  type?: string | null;
}): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error('Not authenticated');
  }

  const path = `${userData.user.id}/profile.${extFromType(asset.type)}`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(path, base64ToUint8Array(asset.base64), {
      contentType: asset.type ?? 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { error: rpcError } = await supabase.rpc('set_my_profile_photo', {
    p_path: path,
  });
  if (rpcError) throw new Error(rpcError.message);

  return path;
}

export type NextJob = { id: string; title: string; meta: string };

const humanize = (value: string | null) =>
  value
    ? value.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Job';

const formatJobMeta = (date: string | null, time: string | null) =>
  [date, time ? time.slice(0, 5) : null].filter(Boolean).join(' · ');

/**
 * Best-effort: the member's soonest non-completed assigned job, for the
 * "You're in" screen. Returns null if there are none (e.g. a brand-new hire).
 */
export async function fetchMyNextJob(
  memberId: string,
): Promise<NextJob | null> {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('jobs(id, job_type, status, scheduled_date, scheduled_start_time)')
    .eq('business_member_id', memberId)
    .limit(25);

  if (error || !data) return null;

  const jobs = data
    .map(r =>
      pickOne<{
        id: string;
        job_type: string | null;
        status: string | null;
        scheduled_date: string | null;
        scheduled_start_time: string | null;
      }>(r.jobs as never),
    )
    .filter((j): j is NonNullable<typeof j> => !!j && j.status !== 'completed')
    .sort((a, b) =>
      (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''),
    );

  const next = jobs[0];
  if (!next) return null;
  return {
    id: next.id,
    title: humanize(next.job_type),
    meta: formatJobMeta(next.scheduled_date, next.scheduled_start_time),
  };
}
