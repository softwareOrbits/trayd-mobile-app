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
