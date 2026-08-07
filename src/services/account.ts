import { supabase } from './supabase';

export async function reauthenticate(
  email: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('That password isn’t right.');
}

export async function deactivateMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('deactivate_my_account');
  if (error) throw new Error(error.message);
}

const DELETE_BUSINESS_ERROR: Record<string, string> = {
  not_primary_owner: 'Only the account owner can delete the business.',
  name_mismatch: 'The name you typed does not match. Deletion cancelled.',
  missing_confirm_name: 'Please type your business name to confirm.',
  not_authenticated: 'Please sign in again.',
  business_not_found: 'This business was already deleted.',
};

export async function deleteMyBusiness(confirmName: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-my-business', {
    body: { confirm_name: confirmName.trim() },
  });
  if (error) {
    const detail = await (
      error as { context?: { json?: () => Promise<{ error?: string } | null> } }
    ).context
      ?.json?.()
      .catch(() => null);
    const code = detail?.error ?? error.message;
    throw new Error(DELETE_BUSINESS_ERROR[code] ?? code ?? 'Something went wrong.');
  }
}
