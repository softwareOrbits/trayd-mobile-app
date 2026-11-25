import { supabase } from '@/services/supabase';
import {
  readTraydRole,
  resolveAccessViews,
  type AccessRoleClaim,
  type AccessViews,
} from '@/utils/accessViews';

export async function fetchAccessViews(
  accessToken: string | null,
): Promise<AccessViews | null> {
  const member = readTraydRole(accessToken);
  if (!member || member.is_primary_owner === true) return null;
  const { data, error } = await supabase.rpc('get_my_access');
  if (error) throw error;
  const payload = data as {
    role?: AccessRoleClaim | null;
    is_owner?: boolean;
  } | null;
  if (!payload?.role) return null;
  return resolveAccessViews({ is_owner: payload.is_owner === true }, payload.role);
}
