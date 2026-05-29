// ─── Easter Egg Registry ──────────────────────────────────────────────────────
// Single source of truth for all Easter Egg mappings.
// To add a new entry: append to REGISTRY below — no other code changes needed.
// Kill switch: set GLOBAL_KILL_SWITCH = true to instantly disable every effect.

export const GLOBAL_KILL_SWITCH = false

// ─── Types ────────────────────────────────────────────────────────────────────

export type EffectKey =
  | "subtle_web"
  | "gold_shimmer"
  | "tempo_pulse"
  | "starfield"
  | "sand_drift"
  | "noir_rain"
  | "neon_rain"
  | "musical_spotlight"
  | "architecture_shadow"
  | "glitch_accent"
  | "comic_edge"
  | "order_slip_texture"
  | "periodic_grid"
  | "legal_texture"
  | "element_particles"
  | "sterile_grid"
  | "frost_fire_edge"
  | "spore_particles"
  | "science_grid"
  | "ember_spark"
  | "magic_spark"
  | "crow_shadow"
  | "typewriter_texture"
  | "wave_lightning"

export interface RegistryEntry {
  key: string
  displayName: string
  mediaType: "movie" | "tv" | "book"
  tmdbIds?: number[]
  titleMatchers?: Array<{ value: string; exact: boolean }>
  effectKey: EffectKey
  intensity: number   // 0.0–1.0
  enabled: boolean
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[''`'']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTmdbId(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const match = String(value).match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

// ─── Match function ───────────────────────────────────────────────────────────

export function matchRegistryEntry(
  id: string | number | null | undefined,
  mediaType: "movie" | "tv" | "book" | null,
  title?: string | null
): RegistryEntry | null {
  if (GLOBAL_KILL_SWITCH) return null

  const numericId = extractTmdbId(id)
  const normalizedTitle = title ? normalizeTitle(title) : ""

  for (const entry of REGISTRY) {
    if (!entry.enabled) continue
    if (mediaType && entry.mediaType !== mediaType) continue

    // TMDB ID exact match (highest confidence)
    if (numericId && entry.tmdbIds?.includes(numericId)) return entry

    // Title matcher
    if (normalizedTitle && entry.titleMatchers) {
      for (const matcher of entry.titleMatchers) {
        const kw = normalizeTitle(matcher.value)
        const hit = matcher.exact
          ? normalizedTitle === kw ||
            normalizedTitle.startsWith(kw + " ") ||
            normalizedTitle.endsWith(" " + kw)
          : normalizedTitle.includes(kw)
        if (hit) return entry
      }
    }
  }
  return null
}

// ─── Registry ─────────────────────────────────────────────────────────────────
// Extending: add one object here. No other file changes required.

export const REGISTRY: RegistryEntry[] = [

  // ── FILMS ──────────────────────────────────────────────────────────────────

  {
    key: "spiderman",
    displayName: "Spider-Man / Spider-Verse",
    mediaType: "movie",
    tmdbIds: [557, 775, 49013, 102651, 102382, 315635, 429617, 634649, 324857, 569094],
    titleMatchers: [
      { value: "spider-man",   exact: false },
      { value: "spiderman",    exact: false },
      { value: "spider verse", exact: false },
      { value: "spider-verse", exact: false },
    ],
    effectKey: "subtle_web",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "babylon",
    displayName: "Babylon",
    mediaType: "movie",
    tmdbIds: [669893],
    titleMatchers: [{ value: "babylon", exact: true }],
    effectKey: "gold_shimmer",
    intensity: 0.35,
    enabled: true,
  },

  {
    key: "whiplash",
    displayName: "Whiplash",
    mediaType: "movie",
    tmdbIds: [244786],
    titleMatchers: [{ value: "whiplash", exact: true }],
    effectKey: "tempo_pulse",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "interstellar",
    displayName: "Interstellar",
    mediaType: "movie",
    tmdbIds: [157336],
    titleMatchers: [{ value: "interstellar", exact: true }],
    effectKey: "starfield",
    intensity: 0.35,
    enabled: true,
  },

  {
    key: "dune-film",
    displayName: "Dune (Film)",
    mediaType: "movie",
    tmdbIds: [438631, 693134],
    titleMatchers: [{ value: "dune", exact: false }],
    effectKey: "sand_drift",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "batman-noir",
    displayName: "The Batman",
    mediaType: "movie",
    tmdbIds: [414906, 268, 364],
    titleMatchers: [{ value: "the batman", exact: true }, { value: "batman", exact: false }],
    effectKey: "noir_rain",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "blade-runner",
    displayName: "Blade Runner",
    mediaType: "movie",
    tmdbIds: [78, 335984],
    titleMatchers: [{ value: "blade runner", exact: false }],
    effectKey: "neon_rain",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "la-la-land",
    displayName: "La La Land",
    mediaType: "movie",
    tmdbIds: [313369],
    titleMatchers: [{ value: "la la land", exact: true }],
    effectKey: "musical_spotlight",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "parasite",
    displayName: "Parasite",
    mediaType: "movie",
    tmdbIds: [496243],
    titleMatchers: [{ value: "parasite", exact: true }],
    effectKey: "architecture_shadow",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "dark-knight",
    displayName: "The Dark Knight",
    mediaType: "movie",
    tmdbIds: [155, 272, 49026],
    titleMatchers: [
      { value: "the dark knight", exact: false },
      { value: "dark knight rises", exact: false },
    ],
    effectKey: "glitch_accent",
    intensity: 0.25,
    enabled: true,
  },

  // ── TV ─────────────────────────────────────────────────────────────────────

  {
    key: "invincible",
    displayName: "Invincible",
    mediaType: "tv",
    tmdbIds: [95557],
    titleMatchers: [{ value: "invincible", exact: true }],
    effectKey: "comic_edge",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "the-bear",
    displayName: "The Bear",
    mediaType: "tv",
    tmdbIds: [136315],
    titleMatchers: [{ value: "the bear", exact: true }],
    effectKey: "order_slip_texture",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "breaking-bad",
    displayName: "Breaking Bad",
    mediaType: "tv",
    tmdbIds: [1396],
    titleMatchers: [{ value: "breaking bad", exact: true }],
    effectKey: "periodic_grid",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "better-call-saul",
    displayName: "Better Call Saul",
    mediaType: "tv",
    tmdbIds: [60059],
    titleMatchers: [{ value: "better call saul", exact: true }],
    effectKey: "legal_texture",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "avatar-tla",
    displayName: "Avatar: The Last Airbender",
    mediaType: "tv",
    tmdbIds: [246, 209750],
    titleMatchers: [
      { value: "avatar the last airbender", exact: false },
      { value: "last airbender",            exact: false },
    ],
    effectKey: "element_particles",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "severance",
    displayName: "Severance",
    mediaType: "tv",
    tmdbIds: [95396],
    titleMatchers: [{ value: "severance", exact: true }],
    effectKey: "sterile_grid",
    intensity: 0.2,
    enabled: true,
  },

  {
    key: "game-of-thrones",
    displayName: "Game of Thrones",
    mediaType: "tv",
    tmdbIds: [1399],
    titleMatchers: [
      { value: "game of thrones", exact: true },
      { value: "house of the dragon", exact: true },
    ],
    effectKey: "frost_fire_edge",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "the-last-of-us",
    displayName: "The Last of Us",
    mediaType: "tv",
    tmdbIds: [100088],
    titleMatchers: [{ value: "the last of us", exact: true }],
    effectKey: "spore_particles",
    intensity: 0.3,
    enabled: true,
  },

  // ── BOOKS ──────────────────────────────────────────────────────────────────

  {
    key: "project-hail-mary",
    displayName: "Project Hail Mary",
    mediaType: "book",
    titleMatchers: [
      { value: "project hail mary", exact: true },
      { value: "hail mary",         exact: false },
    ],
    effectKey: "science_grid",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "dune-book",
    displayName: "Dune (Book)",
    mediaType: "book",
    titleMatchers: [{ value: "dune", exact: false }],
    effectKey: "sand_drift",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "hunger-games",
    displayName: "The Hunger Games",
    mediaType: "book",
    titleMatchers: [
      { value: "hunger games",          exact: false },
      { value: "catching fire",         exact: true  },
      { value: "mockingjay",            exact: true  },
      { value: "ballad of songbirds",   exact: false },
    ],
    effectKey: "ember_spark",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "harry-potter",
    displayName: "Harry Potter",
    mediaType: "book",
    titleMatchers: [
      { value: "harry potter",          exact: false },
      { value: "philosophers stone",    exact: false },
      { value: "sorcerers stone",       exact: false },
      { value: "chamber of secrets",    exact: false },
      { value: "prisoner of azkaban",   exact: false },
      { value: "goblet of fire",        exact: false },
      { value: "order of the phoenix",  exact: false },
      { value: "half blood prince",     exact: false },
      { value: "deathly hallows",       exact: false },
    ],
    effectKey: "magic_spark",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "six-of-crows",
    displayName: "Six of Crows",
    mediaType: "book",
    titleMatchers: [
      { value: "six of crows",     exact: true },
      { value: "crooked kingdom",  exact: true },
    ],
    effectKey: "crow_shadow",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "agatha-christie",
    displayName: "Agatha Christie",
    mediaType: "book",
    titleMatchers: [
      { value: "and then there were none",      exact: true },
      { value: "murder on the orient express",  exact: true },
      { value: "death on the nile",             exact: true },
      { value: "the abc murders",               exact: false },
      { value: "evil under the sun",            exact: true },
      { value: "roger ackroyd",                 exact: false },
      { value: "a murder is announced",         exact: true },
      { value: "crooked house",                 exact: true },
      { value: "agatha christie",               exact: false },
    ],
    effectKey: "typewriter_texture",
    intensity: 0.2,
    enabled: true,
  },

  {
    key: "percy-jackson",
    displayName: "Percy Jackson",
    mediaType: "book",
    titleMatchers: [
      { value: "percy jackson",         exact: false },
      { value: "the lightning thief",   exact: true  },
      { value: "sea of monsters",       exact: true  },
      { value: "titans curse",          exact: false },
      { value: "battle of the labyrinth",exact: false},
      { value: "the last olympian",     exact: true  },
      { value: "the lost hero",         exact: true  },
      { value: "son of neptune",        exact: true  },
      { value: "heroes of olympus",     exact: false },
    ],
    effectKey: "wave_lightning",
    intensity: 0.3,
    enabled: true,
  },
]
