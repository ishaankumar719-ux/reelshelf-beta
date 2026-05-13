import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Service role client — bypasses RLS, server-side only.
// Never import this in client components or expose to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !serviceKey) return null

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
