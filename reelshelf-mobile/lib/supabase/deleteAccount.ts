// Calls the deployed `delete-account` Edge Function (supabase/functions/delete-account),
// which re-verifies the caller's password server-side before doing anything, then
// cleans up Storage (avatar + image attachments) and deletes the auth user, which
// cascades across every user-owned table. The client-side signInWithPassword call
// below is a second, redundant layer (also refreshes the local session) — the
// function does NOT trust it and re-checks the password itself.
import { supabase } from './client';

export async function deleteOwnAccount(email: string, password: string): Promise<{ error: string | null }> {
  const client = supabase;
  if (!client) return { error: 'Supabase is not configured' };

  const { error: reauthError } = await client.auth.signInWithPassword({ email, password });
  if (reauthError) return { error: 'Incorrect password.' };

  const { data, error } = await client.functions.invoke('delete-account', {
    body: { password },
  });
  if (error) return { error: error.message ?? 'Account deletion failed.' };
  if (data?.error) return { error: data.error as string };

  return { error: null };
}
