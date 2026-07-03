import { supabase } from '@/services/supabase';

type OnboardingState = { next_step?: string | null };

/**
 * Whether the owner's business has finished onboarding. Mirrors the web's
 * `OnboardingGuard`, which treats `next_step === 'complete'` as done and would
 * otherwise redirect into the (desktop-only) setup wizard. We gate the employer
 * WebView on this so the wizard — and its Stripe Checkout step — never loads
 * inside the app. Returns false on any error (fail closed → keep card disabled).
 */
export async function fetchOnboardingComplete(): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_onboarding_state');
  if (error) return false;
  return (data as OnboardingState | null)?.next_step === 'complete';
}
