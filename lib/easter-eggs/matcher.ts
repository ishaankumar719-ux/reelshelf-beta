import { ALL_THEMES, type EggTheme } from "./themes"

// ── Normalisation ─────────────────────────────────────────────────────────────

export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[''`‘’]/g, "")   // remove apostrophes
    .replace(/[^a-z0-9\s]/g, " ")         // strip punctuation
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Extract a numeric TMDB ID from any of the formats the app uses:
 *   "557"          → 557
 *   "tmdb-557"     → 557
 *   "movie-557"    → 557
 *   "tv-95557"     → 95557
 *   557 (number)   → 557
 */
function extractTmdbId(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const match = String(value).match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

// ── Media shape that the matcher can consume ──────────────────────────────────

export interface MediaForMatching {
  id?:          string | number | null
  tmdb_id?:     number | null
  media_id?:    string | null
  title?:       string | null
  name?:        string | null   // TV shows in TMDB often use `name`
  media_type?:  string | null
  type?:        string | null
}

// ── Core match function ───────────────────────────────────────────────────────

export function matchTheme(media: MediaForMatching): EggTheme | null {
  // Resolve numeric TMDB ID from all possible carriers
  const tmdbId =
    extractTmdbId(media.tmdb_id) ??
    extractTmdbId(media.media_id) ??
    extractTmdbId(media.id)

  // Resolve media type from either field name
  const rawType = media.media_type ?? media.type ?? null
  const mediaType = rawType === "tv" ? "tv"
    : rawType === "book"  ? "book"
    : rawType === "movie" ? "movie"
    : null

  // Resolve title — prefer `title`, fall back to `name` (TMDB TV)
  const rawTitle = media.title ?? media.name ?? ""
  const normalizedTitle = normalizeTitle(rawTitle)

  for (const theme of ALL_THEMES) {
    // ── 1. Media-type gate ──────────────────────────────────────────────────
    if (mediaType && !theme.mediaTypes.includes(mediaType as "movie" | "tv" | "book")) {
      continue
    }

    // ── 2. Exact TMDB ID match (highest confidence) ─────────────────────────
    if (tmdbId && theme.tmdbIds?.includes(tmdbId)) {
      if (process.env.NODE_ENV === "development") {
        console.log("[EASTER EGG] media:", { tmdbId, title: rawTitle, type: mediaType })
        console.log("[EASTER EGG] matched theme:", theme.displayName, "(TMDB ID)")
      }
      return theme
    }

    // ── 3. Normalised title match ───────────────────────────────────────────
    if (normalizedTitle && theme.titleMatchers) {
      for (const matcher of theme.titleMatchers) {
        const kw = normalizeTitle(matcher.value)
        const matched = matcher.exact
          ? normalizedTitle === kw || normalizedTitle.startsWith(kw + " ") || normalizedTitle.endsWith(" " + kw)
          : normalizedTitle.includes(kw)

        if (matched) {
          if (process.env.NODE_ENV === "development") {
            console.log("[EASTER EGG] media:", { tmdbId, title: rawTitle, type: mediaType })
            console.log("[EASTER EGG] matched theme:", theme.displayName, `(title: "${matcher.value}")`)
          }
          return theme
        }
      }
    }
  }

  return null
}

export { ALL_THEMES }
export type { EggTheme }
