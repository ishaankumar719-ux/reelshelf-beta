// ─── Easter Egg Registry ──────────────────────────────────────────────────────
// Single source of truth for all easter egg mappings.
// Structure: { key, displayName, mediaType, tmdbIds?, titleMatch?, effectKey, intensity, enabled }
// titleMatch entries are normalised substring matches — case-insensitive, punctuation-stripped.
// Kill switch: flip GLOBAL_KILL_SWITCH to true to disable every effect instantly.

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
  | "bat_glow"
  | "inception_top"
  | "soft_rain"
  | "dust_storm"
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
  | "compound_v"
  | "steam_burst"
  | "fog_drift"
  | "gold_dust"

export interface RegistryEntry {
  key: string
  displayName: string
  mediaType: "movie" | "tv" | "book"
  /** TMDB numeric IDs — matched first, highest confidence */
  tmdbIds?: number[]
  /** Normalised substring matches against the page title */
  titleMatch?: string[]
  effectKey: EffectKey
  /** 0.0–1.0 — base intensity; "subtle" mode uses this value directly */
  intensity: number
  enabled: boolean
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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

// ─── Matcher ──────────────────────────────────────────────────────────────────

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

    // TMDB ID exact match — highest confidence
    if (numericId && entry.tmdbIds?.includes(numericId)) return entry

    // Normalised substring title match — fallback
    if (normalizedTitle && entry.titleMatch) {
      for (const kw of entry.titleMatch) {
        if (normalizedTitle.includes(normalizeTitle(kw))) return entry
      }
    }
  }
  return null
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const REGISTRY: RegistryEntry[] = [

  // ── FILMS ──────────────────────────────────────────────────────────────────

  {
    key: "spiderman",
    displayName: "Spider-Man / Spider-Verse",
    mediaType: "movie",
    tmdbIds: [557, 775, 49013, 102651, 102382, 315635, 429617, 634649, 324857, 569094],
    titleMatch: ["spider-man", "spiderman", "spider verse", "spider-verse"],
    effectKey: "subtle_web",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "babylon",
    displayName: "Babylon",
    mediaType: "movie",
    tmdbIds: [615777, 669893],
    titleMatch: ["babylon"],
    effectKey: "gold_shimmer",
    intensity: 0.35,
    enabled: true,
  },

  {
    key: "whiplash",
    displayName: "Whiplash",
    mediaType: "movie",
    tmdbIds: [244786],
    titleMatch: ["whiplash"],
    effectKey: "tempo_pulse",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "interstellar",
    displayName: "Interstellar",
    mediaType: "movie",
    tmdbIds: [157336],
    titleMatch: ["interstellar"],
    effectKey: "starfield",
    intensity: 0.35,
    enabled: true,
  },

  {
    key: "dune-film",
    displayName: "Dune",
    mediaType: "movie",
    tmdbIds: [438631, 693134],
    titleMatch: ["dune"],
    effectKey: "sand_drift",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "batman-noir",
    displayName: "The Batman",
    mediaType: "movie",
    tmdbIds: [414906, 268, 364],
    titleMatch: ["the batman"],
    effectKey: "noir_rain",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "blade-runner",
    displayName: "Blade Runner",
    mediaType: "movie",
    tmdbIds: [78, 335984],
    titleMatch: ["blade runner"],
    effectKey: "neon_rain",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "la-la-land",
    displayName: "La La Land",
    mediaType: "movie",
    tmdbIds: [313369],
    titleMatch: ["la la land"],
    effectKey: "musical_spotlight",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "parasite",
    displayName: "Parasite",
    mediaType: "movie",
    tmdbIds: [496243],
    titleMatch: ["parasite"],
    effectKey: "architecture_shadow",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "dark-knight",
    displayName: "The Dark Knight",
    mediaType: "movie",
    tmdbIds: [155, 49026],
    titleMatch: ["dark knight"],
    effectKey: "bat_glow",
    intensity: 0.28,
    enabled: true,
  },

  {
    key: "inception",
    displayName: "Inception",
    mediaType: "movie",
    tmdbIds: [27205],
    titleMatch: ["inception"],
    effectKey: "inception_top",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "john-wick",
    displayName: "John Wick",
    mediaType: "movie",
    tmdbIds: [245891, 267278, 343611, 614911],
    titleMatch: ["john wick"],
    effectKey: "soft_rain",
    intensity: 0.22,
    enabled: true,
  },

  {
    key: "lotr-film",
    displayName: "Lord of the Rings",
    mediaType: "movie",
    tmdbIds: [120, 121, 122],
    titleMatch: ["lord of the rings", "fellowship of the ring", "two towers", "return of the king"],
    effectKey: "ember_spark",
    intensity: 0.28,
    enabled: true,
  },

  {
    key: "mad-max",
    displayName: "Mad Max: Fury Road",
    mediaType: "movie",
    tmdbIds: [76341],
    titleMatch: ["mad max", "fury road"],
    effectKey: "dust_storm",
    intensity: 0.28,
    enabled: true,
  },

  {
    key: "arrival",
    displayName: "Arrival",
    mediaType: "movie",
    tmdbIds: [329865],
    titleMatch: ["arrival"],
    effectKey: "starfield",
    intensity: 0.28,
    enabled: true,
  },

  {
    key: "fight-club",
    displayName: "Fight Club",
    mediaType: "movie",
    tmdbIds: [550],
    titleMatch: ["fight club"],
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
    titleMatch: ["invincible"],
    effectKey: "comic_edge",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "the-bear",
    displayName: "The Bear",
    mediaType: "tv",
    tmdbIds: [136315],
    titleMatch: ["the bear"],
    effectKey: "order_slip_texture",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "breaking-bad",
    displayName: "Breaking Bad",
    mediaType: "tv",
    tmdbIds: [1396],
    titleMatch: ["breaking bad"],
    effectKey: "periodic_grid",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "better-call-saul",
    displayName: "Better Call Saul",
    mediaType: "tv",
    tmdbIds: [60059],
    titleMatch: ["better call saul"],
    effectKey: "legal_texture",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "avatar-tla",
    displayName: "Avatar: The Last Airbender",
    mediaType: "tv",
    tmdbIds: [246, 209750],
    titleMatch: ["avatar the last airbender", "last airbender"],
    effectKey: "element_particles",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "severance",
    displayName: "Severance",
    mediaType: "tv",
    tmdbIds: [95396],
    titleMatch: ["severance"],
    effectKey: "sterile_grid",
    intensity: 0.2,
    enabled: true,
  },

  {
    key: "game-of-thrones",
    displayName: "Game of Thrones",
    mediaType: "tv",
    tmdbIds: [1399],
    titleMatch: ["game of thrones", "house of the dragon"],
    effectKey: "frost_fire_edge",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "the-last-of-us",
    displayName: "The Last of Us",
    mediaType: "tv",
    tmdbIds: [100088],
    titleMatch: ["last of us"],
    effectKey: "spore_particles",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "the-boys",
    displayName: "The Boys",
    mediaType: "tv",
    tmdbIds: [76479],
    titleMatch: ["the boys"],
    effectKey: "compound_v",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "attack-on-titan",
    displayName: "Attack on Titan",
    mediaType: "tv",
    tmdbIds: [71914],
    titleMatch: ["attack on titan", "shingeki no kyojin"],
    effectKey: "steam_burst",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "true-detective",
    displayName: "True Detective",
    mediaType: "tv",
    titleMatch: ["true detective"],
    effectKey: "fog_drift",
    intensity: 0.28,
    enabled: true,
  },

  // ── BOOKS ──────────────────────────────────────────────────────────────────

  {
    key: "project-hail-mary",
    displayName: "Project Hail Mary",
    mediaType: "book",
    titleMatch: ["project hail mary", "hail mary"],
    effectKey: "science_grid",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "dune-book",
    displayName: "Dune (Book)",
    mediaType: "book",
    titleMatch: ["dune"],
    effectKey: "sand_drift",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "hunger-games",
    displayName: "The Hunger Games",
    mediaType: "book",
    titleMatch: ["hunger games", "catching fire", "mockingjay", "ballad of songbirds"],
    effectKey: "ember_spark",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "harry-potter",
    displayName: "Harry Potter",
    mediaType: "book",
    titleMatch: [
      "harry potter",
      "philosophers stone",
      "sorcerers stone",
      "chamber of secrets",
      "prisoner of azkaban",
      "goblet of fire",
      "order of the phoenix",
      "half blood prince",
      "deathly hallows",
    ],
    effectKey: "magic_spark",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "six-of-crows",
    displayName: "Six of Crows",
    mediaType: "book",
    titleMatch: ["six of crows", "crooked kingdom"],
    effectKey: "crow_shadow",
    intensity: 0.25,
    enabled: true,
  },

  {
    key: "agatha-christie",
    displayName: "Agatha Christie",
    mediaType: "book",
    titleMatch: [
      "agatha christie",
      "and then there were none",
      "murder on the orient express",
      "death on the nile",
      "abc murders",
      "evil under the sun",
      "roger ackroyd",
      "murder is announced",
      "crooked house",
    ],
    effectKey: "typewriter_texture",
    intensity: 0.2,
    enabled: true,
  },

  {
    key: "percy-jackson",
    displayName: "Percy Jackson",
    mediaType: "book",
    titleMatch: [
      "percy jackson",
      "the lightning thief",
      "sea of monsters",
      "titans curse",
      "battle of the labyrinth",
      "the last olympian",
      "the lost hero",
      "son of neptune",
      "heroes of olympus",
    ],
    effectKey: "wave_lightning",
    intensity: 0.3,
    enabled: true,
  },

  {
    key: "lotr-book",
    displayName: "Lord of the Rings (Book)",
    mediaType: "book",
    titleMatch: [
      "lord of the rings",
      "fellowship of the ring",
      "two towers",
      "return of the king",
      "silmarillion",
    ],
    effectKey: "ember_spark",
    intensity: 0.28,
    enabled: true,
  },

  {
    key: "hobbit",
    displayName: "The Hobbit",
    mediaType: "book",
    titleMatch: [
      "the hobbit",
      "unexpected journey",
      "desolation of smaug",
      "battle of the five armies",
    ],
    effectKey: "gold_dust",
    intensity: 0.28,
    enabled: true,
  },
]
