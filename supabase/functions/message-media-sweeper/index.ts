// Removes message-media uploads that never became a message (the sender
// discarded them, closed the app mid-send, or the post never happened).
// Runs hourly from pg_cron; see supabase/migrations/20261123_message_media_sweeper_schedule.sql.
//
// Only files that no message uses AND that are older than the minimum age
// (24 hours by default, never under 10 minutes) are removed, so an upload a
// person is about to retry is never touched.
import { createClient } from "npm:@supabase/supabase-js@2"

const BUCKET = "message-media"

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  })

  // Only the scheduled job knows this: it reads the same value from the
  // database vault (message_media_sweeper_secret).
  const given = req.headers.get("x-sweeper-secret") ?? ""
  const { data: allowed } = given
    ? await admin.rpc("message_media_sweeper_check", { p_secret: given })
    : { data: false }
  if (allowed !== true) return new Response("forbidden", { status: 403 })

  let minAgeMinutes = 24 * 60
  try {
    const body = await req.json()
    if (typeof body?.min_age_minutes === "number") minAgeMinutes = Math.max(10, Math.floor(body.min_age_minutes))
  } catch {
    // no body: defaults
  }

  const { data: names, error } = await admin.rpc("message_media_orphans", {
    p_min_age: `${minAgeMinutes} minutes`,
    p_limit: 500,
  })
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })

  const list = (names ?? []) as string[]
  let removed = 0
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100)
    const { data, error: removeError } = await admin.storage.from(BUCKET).remove(chunk)
    if (removeError) return Response.json({ ok: false, removed, error: removeError.message }, { status: 500 })
    removed += data?.length ?? 0
  }
  return Response.json({ ok: true, removed, names: list })
})
