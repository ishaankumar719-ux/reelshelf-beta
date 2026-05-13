import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { BETA_LAUNCH_CUTOFF } from "@/lib/supabase/badges"

const ADMIN_EMAIL = "ishaankumar719@gmail.com"

export type GrantAction =
  | "grant_single"          // Grant one badge to one user (by email)
  | "auto_founding_critic"  // Grant founding_critic to all profiles.created_at < BETA_LAUNCH_CUTOFF
  | "auto_day_one"          // Grant day_one_member to all profiles.created_at < BETA_LAUNCH_CUTOFF
  | "auto_original_eight"   // Grant original_eight to first 8 profiles by created_at

export type GrantBadgeRequest = {
  action: GrantAction
  targetEmail?: string  // required for grant_single
}

type ProfileRow = { id: string; created_at: string }
type BadgeRow   = { id: string; slug: string }

async function grantBadgesToUsers(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  badgeId: string,
  userIds: string[]
): Promise<{ granted: number; skipped: number }> {
  if (userIds.length === 0) return { granted: 0, skipped: 0 }

  // Find which users already have this badge
  const { data: existing } = await admin
    .from("user_badges")
    .select("user_id")
    .eq("badge_id", badgeId)
    .in("user_id", userIds)

  const alreadyHave = new Set((existing ?? []).map((r: { user_id: string }) => r.user_id))
  const toInsert = userIds
    .filter((uid) => !alreadyHave.has(uid))
    .map((uid) => ({
      user_id: uid,
      badge_id: badgeId,
      unlocked_at: new Date().toISOString(),
      progress_value: 0,
      showcased: false,
    }))

  if (toInsert.length > 0) {
    await admin.from("user_badges").insert(toInsert)
  }

  return { granted: toInsert.length, skipped: alreadyHave.size }
}

export async function POST(req: NextRequest) {
  // ── 1. Auth: must be admin ────────────────────────────────────────────────
  const serverClient = await createServerClient()
  if (!serverClient) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }

  const { data: { user } } = await serverClient.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ── 2. Parse request ──────────────────────────────────────────────────────
  const body = (await req.json()) as GrantBadgeRequest
  const { action, targetEmail } = body

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: "Admin client unavailable — set SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 })
  }

  // ── 3. Resolve badge slug → badge_id ─────────────────────────────────────
  async function getBadgeId(slug: string): Promise<string | null> {
    const { data } = await admin!.from("badges").select("id").eq("slug", slug).single()
    return (data as BadgeRow | null)?.id ?? null
  }

  // ── 4. Handle actions ─────────────────────────────────────────────────────

  if (action === "grant_single") {
    if (!targetEmail) {
      return NextResponse.json({ error: "targetEmail required for grant_single" }, { status: 400 })
    }

    // Look up user by email via auth.users (service role only)
    const { data: userData, error: userError } = await admin.auth.admin.listUsers()
    if (userError) {
      return NextResponse.json({ error: "Failed to list users" }, { status: 500 })
    }

    const target = userData.users.find((u) => u.email === targetEmail)
    if (!target) {
      return NextResponse.json({ error: `No user found with email ${targetEmail}` }, { status: 404 })
    }

    // Determine which legacy badge(s) to grant from body (default: all manual legacy)
    const { data: legacyBadges } = await admin
      .from("badges")
      .select("id, slug")
      .eq("category", "legacy")
      .eq("requirement_type", "manual")

    const badges = (legacyBadges ?? []) as BadgeRow[]
    const results: Record<string, { granted: number; skipped: number }> = {}

    // If a specific slug was provided in targetEmail suffix (e.g. "email|slug"), parse it
    // Otherwise the caller should specify via a `badgeSlug` field
    const bSlug = (body as Record<string, unknown>)["badgeSlug"] as string | undefined
    const toGrant = bSlug ? badges.filter((b) => b.slug === bSlug) : badges

    for (const badge of toGrant) {
      results[badge.slug] = await grantBadgesToUsers(admin, badge.id, [target.id])
    }

    return NextResponse.json({ ok: true, results })
  }

  if (action === "auto_founding_critic" || action === "auto_day_one") {
    const slug = action === "auto_founding_critic" ? "founding_critic" : "day_one_member"
    const badgeId = await getBadgeId(slug)
    if (!badgeId) return NextResponse.json({ error: `Badge '${slug}' not found` }, { status: 404 })

    // Profiles created before beta cutoff
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, created_at")
      .lt("created_at", BETA_LAUNCH_CUTOFF)

    const userIds = ((profiles ?? []) as ProfileRow[]).map((p) => p.id)
    const result = await grantBadgesToUsers(admin, badgeId, userIds)
    return NextResponse.json({ ok: true, slug, ...result })
  }

  if (action === "auto_original_eight") {
    const badgeId = await getBadgeId("original_eight")
    if (!badgeId) return NextResponse.json({ error: "Badge 'original_eight' not found" }, { status: 404 })

    // First 8 profiles by created_at
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, created_at")
      .order("created_at", { ascending: true })
      .limit(8)

    const userIds = ((profiles ?? []) as ProfileRow[]).map((p) => p.id)
    const result = await grantBadgesToUsers(admin, badgeId, userIds)
    return NextResponse.json({ ok: true, slug: "original_eight", ...result })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
