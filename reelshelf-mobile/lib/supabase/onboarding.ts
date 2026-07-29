import { supabase } from './client';

/** Fails open (treated as already-completed) on any error — a DB hiccup
 *  should never trap a real, already-signed-in user behind a broken gate. */
export async function fetchOnboardingCompleted(userId: string): Promise<boolean> {
  if (!supabase) return true;
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return true;
  return data.onboarding_completed ?? true;
}

export async function completeOnboarding(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('profiles')
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq('id', userId);
}
