// Shared types used by both the Letterboxd fetch API route and the import wizard client

// ─── Rating conversion ────────────────────────────────────────────────────────
// Specific non-linear mapping from Letterboxd half-star ratings (0.5–5.0) to
// ReelShelf scale (0.0–10.0). Interpolates linearly for any values in between.

const LBXD_TABLE: Record<string, number> = {
  "0.5": 0.0,
  "1.0": 1.2,
  "1.5": 2.4,
  "2.0": 3.6,
  "2.5": 4.8,
  "3.0": 6.0,
  "3.5": 7.2,
  "4.0": 8.4,
  "4.5": 9.2,
  "5.0": 10.0,
}

export function convertLetterboxdRating(stars: number): number {
  const s = Math.min(5, Math.max(0.5, stars))
  const low  = Math.floor(s / 0.5) * 0.5
  const high = Math.min(5.0, low + 0.5)
  if (low === high) return LBXD_TABLE[low.toFixed(1)] ?? 0
  const t  = (s - low) / (high - low)
  const lo = LBXD_TABLE[low.toFixed(1)]  ?? 0
  const hi = LBXD_TABLE[high.toFixed(1)] ?? 10
  return Number((lo + t * (hi - lo)).toFixed(1))
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RssWizardEntry = {
  sourceRow: number
  title: string
  year: number
  rating: number | null          // converted to 0–10 ReelShelf scale
  letterboxdRating: number | null // raw Letterboxd star rating (0.5–5.0)
  watchedDate: string             // YYYY-MM-DD
  review: string
  rewatch: boolean
  containsSpoilers: boolean
  favourite: boolean
  mediaType: "movie" | "tv"
  mediaId: string                 // "tmdb-{id}" when TMDB ID present, else lbxd slug
  posterUrl: string | null        // letterboxd CDN poster extracted from RSS description
}

export type LetterboxdFetchResponse = {
  entries: RssWizardEntry[]
  displayName: string
  total: number
  limited: boolean               // true when RSS was capped (~50–100 entries)
  error?: string
}
