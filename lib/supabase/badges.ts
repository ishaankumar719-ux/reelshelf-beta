import type { SupabaseClient } from "@supabase/supabase-js"

export type BadgeRarity = "common" | "rare" | "epic" | "legendary"
export type BadgeCategory = "film" | "tv" | "book" | "cinema" | "reviews" | "streaks" | "social" | "prestige" | "legacy" | "trivia"

export interface BadgeDefinition {
  id: string
  slug: string
  name: string
  description: string
  category: BadgeCategory
  rarity: BadgeRarity
  icon: string
  hidden: boolean
  requirement_type: string
  requirement_value: number
  xp: number
  is_limited: boolean
  retired_at: string | null
}

// Configurable cutoff: accounts created before this date qualify for founding badges.
// Update this when public launch occurs.
export const BETA_LAUNCH_CUTOFF =
  process.env.NEXT_PUBLIC_BETA_LAUNCH_CUTOFF ?? "2026-09-01T00:00:00.000Z"

export interface DisplayBadge extends BadgeDefinition {
  earned: boolean
  unlocked_at: string | null
  showcased: boolean
}

export const RARITY_XP: Record<BadgeRarity, number> = {
  common: 50,
  rare: 150,
  epic: 350,
  legendary: 750,
}

export const RARITY_COLOR: Record<BadgeRarity, string> = {
  common:    "rgba(148,163,184,0.75)",
  rare:      "rgba(96,165,250,0.9)",
  epic:      "rgba(167,139,250,0.9)",
  legendary: "rgba(251,191,36,0.95)",
}

export const RARITY_GLOW: Record<BadgeRarity, string> = {
  common:    "rgba(148,163,184,0.12)",
  rare:      "rgba(96,165,250,0.16)",
  epic:      "rgba(167,139,250,0.18)",
  legendary: "rgba(251,191,36,0.22)",
}

// Legacy badges: gold/platinum/obsidian aesthetic — distinct from normal rarity
export const LEGACY_BORDER_COLOR = "rgba(212,175,55,0.85)"      // antique gold
export const LEGACY_GLOW_COLOR   = "rgba(212,175,55,0.22)"
export const LEGACY_TEXT_COLOR   = "rgba(218,185,75,0.95)"
export const LEGACY_BG_GRADIENT  =
  "radial-gradient(circle at 40% 30%, rgba(212,175,55,0.14), rgba(8,8,16,0.97))"

export type LevelTier = "Collector" | "Enthusiast" | "Critic" | "Curator" | "Auteur"

export function getTier(totalXP: number): LevelTier {
  if (totalXP >= 2500) return "Auteur"
  if (totalXP >= 1000) return "Curator"
  if (totalXP >= 500)  return "Critic"
  if (totalXP >= 200)  return "Enthusiast"
  return "Collector"
}

export function computeTotalXP(badges: DisplayBadge[]): number {
  return badges.filter((b) => b.earned).reduce((sum, b) => sum + RARITY_XP[b.rarity], 0)
}

export interface BadgeSyncStats {
  filmCount: number
  tvCount: number
  bookCount: number
  reviewCount: number
  longestStreak: number
  cinemaCount: number
  followersCount: number
  commentsReceived: number
  likesReceived: number
}

export function computeEarnedBadgeSlugs(stats: BadgeSyncStats, existingBadgeCount: number): string[] {
  const earned: string[] = []

  // Film
  if (stats.filmCount >= 1)   earned.push("first_screening")
  if (stats.filmCount >= 10)  earned.push("film_enthusiast")
  if (stats.filmCount >= 100) earned.push("film_centennial")
  if (stats.filmCount >= 500) earned.push("marathon_viewer")

  // TV
  if (stats.tvCount >= 1)  earned.push("pilot_episode")
  if (stats.tvCount >= 10) earned.push("binge_mode")
  if (stats.tvCount >= 25) earned.push("sitcom_survivor")
  if (stats.tvCount >= 50) earned.push("prestige_television")

  // Books
  if (stats.bookCount >= 1)  earned.push("page_turner")
  if (stats.bookCount >= 20) earned.push("bookworm")
  if (stats.bookCount >= 50) earned.push("literary_taste")

  // Reviews
  if (stats.reviewCount >= 1)   earned.push("first_review")
  if (stats.reviewCount >= 10)  earned.push("critic_in_training")
  if (stats.reviewCount >= 50)  earned.push("cultural_commentator")
  if (stats.reviewCount >= 100) earned.push("master_critic")

  // Streaks (longest ever, not just current)
  if (stats.longestStreak >= 7)   earned.push("week_streak")
  if (stats.longestStreak >= 30)  earned.push("month_streak")
  if (stats.longestStreak >= 100) earned.push("shelf_discipline")
  if (stats.longestStreak >= 365) earned.push("unstoppable")

  // Cinema
  if (stats.cinemaCount >= 1)  earned.push("cinema_debut")
  if (stats.cinemaCount >= 5)  earned.push("cinema_regular")
  if (stats.cinemaCount >= 10) earned.push("imax_enthusiast")
  if (stats.cinemaCount >= 25) earned.push("silver_screen")

  // Social
  if (stats.followersCount >= 1)   earned.push("first_follower")
  if (stats.followersCount >= 10)  earned.push("social_butterfly")
  if (stats.commentsReceived >= 1) earned.push("conversation_starter")
  if (stats.likesReceived >= 50)   earned.push("critics_circle")

  // Prestige — based on total earned count (auto-computed + existing manual badges)
  const projectedTotal = earned.length + existingBadgeCount
  if (projectedTotal >= 10) earned.push("completionist")
  if (projectedTotal >= 20) earned.push("reelshelf_scholar")

  return earned
}

export function buildDisplayBadges(
  allDefs: BadgeDefinition[],
  earnedMap: Map<string, { unlocked_at: string; showcased: boolean }>
): DisplayBadge[] {
  const visible: DisplayBadge[] = []

  for (const def of allDefs) {
    const unlock = earnedMap.get(def.id)
    if (def.hidden && !unlock) continue  // hidden badges only show when earned

    visible.push({
      ...def,
      earned: Boolean(unlock),
      unlocked_at: unlock?.unlocked_at ?? null,
      showcased: unlock?.showcased ?? false,
    })
  }

  // Sort: earned first (by unlocked_at desc), then unearned by rarity desc
  const rarityOrder: Record<BadgeRarity, number> = { legendary: 3, epic: 2, rare: 1, common: 0 }

  return visible.sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    if (a.earned && b.earned) {
      return new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime()
    }
    return rarityOrder[b.rarity] - rarityOrder[a.rarity]
  })
}

// Fetch all visible badge definitions + user's earned records.
export async function fetchBadgesForProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allDefs: BadgeDefinition[]; earnedMap: Map<string, { unlocked_at: string; showcased: boolean }> }> {
  const [defsResult, userResult] = await Promise.all([
    supabase
      .from("badges")
      .select("id, slug, name, description, category, rarity, icon, hidden, requirement_type, requirement_value, xp, is_limited, retired_at")
      .order("category", { ascending: true })
      .order("xp", { ascending: true }),
    supabase
      .from("user_badges")
      .select("badge_id, unlocked_at, showcased")
      .eq("user_id", userId),
  ])

  const allDefs = ((defsResult.data ?? []) as BadgeDefinition[])
  const earnedMap = new Map<string, { unlocked_at: string; showcased: boolean }>()

  for (const row of (userResult.data ?? []) as Array<{ badge_id: string; unlocked_at: string; showcased: boolean }>) {
    earnedMap.set(row.badge_id, { unlocked_at: row.unlocked_at, showcased: row.showcased })
  }

  return { allDefs, earnedMap }
}

// Sync earned badges to user_badges (only inserts missing rows, never deletes).
export async function syncEarnedBadges(
  supabase: SupabaseClient,
  userId: string,
  earnedSlugs: string[],
  existingEarnedMap: Map<string, { unlocked_at: string; showcased: boolean }>,
  allDefs: BadgeDefinition[]
): Promise<void> {
  if (earnedSlugs.length === 0) return

  const slugToId = new Map(allDefs.map((d) => [d.slug, d.id]))
  const toInsert: Array<{ user_id: string; badge_id: string; unlocked_at: string }> = []

  for (const slug of earnedSlugs) {
    const id = slugToId.get(slug)
    if (!id) continue
    if (existingEarnedMap.has(id)) continue  // already recorded

    toInsert.push({
      user_id: userId,
      badge_id: id,
      unlocked_at: new Date().toISOString(),
    })
  }

  if (toInsert.length === 0) return

  await supabase.from("user_badges").insert(toInsert)
}
