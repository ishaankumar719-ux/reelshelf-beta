export type EffectType =
  | "spiderweb"   // Spider-Man: SVG web corners
  | "sand"        // Dune: amber dust motes
  | "starfield"   // Interstellar: star twinkle field
  | "drumlight"   // Whiplash: pulsing stage beams
  | "dreamy"      // La La Land / HP: violet or warm sparkles
  | "rain"        // The Batman / Blade Runner: rain overlay
  | "goldgrain"   // Babylon: gold shimmer + film grain
  | "ringglow"    // LOTR: golden ring emanation
  | "glitch"      // Fight Club: chromatic glitch + pink
  | "comic"       // Invincible: panel smash + accent bars
  | "chemglow"    // Breaking Bad: crystal blue shimmer
  | "sterile"     // Severance: cold fluorescent grid
  | "ticket"      // The Bear: warm kitchen warmth
  | "corpgold"    // Succession: navy + gold corporate
  | "spaceglow"   // Project Hail Mary / Arrival: teal nebula

export interface TitleMatcher {
  value: string   // the string to match (lowercased at match time)
  exact: boolean  // true = whole-title equality; false = substring
}

export interface EggTheme {
  key: string
  displayName: string
  effectType: EffectType
  accentColor: string      // RGBA for decoration elements
  ambientColor: string     // RGBA for full-screen tint
  tmdbIds?: number[]
  titleMatchers?: TitleMatcher[]
  mediaTypes: ("movie" | "tv" | "book")[]
  secretKey?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 18 themes — TMDB IDs verified
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_THEMES: EggTheme[] = [
  // ── FILMS ──────────────────────────────────────────────────────────────────
  {
    key: "spider-man",
    displayName: "Spider-Man",
    effectType: "spiderweb",
    accentColor: "rgba(195,28,28,0.9)",
    ambientColor: "rgba(40,4,4,0.06)",
    tmdbIds: [
      557,      // Spider-Man (2002)
      775,      // Spider-Man 2
      49013,    // Spider-Man 3
      102651,   // The Amazing Spider-Man
      102382,   // The Amazing Spider-Man 2
      315635,   // Spider-Man: Homecoming
      429617,   // Spider-Man: Far From Home
      634649,   // Spider-Man: No Way Home
      324857,   // Spider-Man: Into the Spider-Verse
      569094,   // Spider-Man: Across the Spider-Verse
    ],
    titleMatchers: [
      { value: "spider-man",  exact: false },
      { value: "spiderman",   exact: false },
      { value: "spider verse",exact: false },
      { value: "spider-verse",exact: false },
    ],
    mediaTypes: ["movie"],
    secretKey: "spiderman_fan",
  },

  {
    key: "dune-film",
    displayName: "Dune",
    effectType: "sand",
    accentColor: "rgba(210,138,40,0.88)",
    ambientColor: "rgba(80,42,4,0.07)",
    tmdbIds: [
      438631,   // Dune (2021)
      693134,   // Dune: Part Two (2024)
    ],
    titleMatchers: [
      { value: "dune", exact: false },
    ],
    mediaTypes: ["movie"],
  },

  {
    key: "interstellar",
    displayName: "Interstellar",
    effectType: "starfield",
    accentColor: "rgba(120,155,255,0.7)",
    ambientColor: "rgba(0,0,20,0.08)",
    tmdbIds: [157336],
    titleMatchers: [
      { value: "interstellar", exact: true },
    ],
    mediaTypes: ["movie"],
  },

  {
    key: "whiplash",
    displayName: "Whiplash",
    effectType: "drumlight",
    accentColor: "rgba(255,230,0,0.95)",
    ambientColor: "rgba(30,20,0,0.06)",
    tmdbIds: [244786],
    titleMatchers: [
      { value: "whiplash", exact: true },
    ],
    mediaTypes: ["movie"],
  },

  {
    key: "la-la-land",
    displayName: "La La Land",
    effectType: "dreamy",
    accentColor: "rgba(175,120,255,0.8)",
    ambientColor: "rgba(55,18,120,0.06)",
    tmdbIds: [313369],
    titleMatchers: [
      { value: "la la land", exact: true },
    ],
    mediaTypes: ["movie"],
  },

  {
    key: "the-batman",
    displayName: "The Batman",
    effectType: "rain",
    accentColor: "rgba(60,100,180,0.65)",
    ambientColor: "rgba(0,4,18,0.12)",
    tmdbIds: [
      414906,   // The Batman (2022)
      268,      // Batman (1989)
      364,      // Batman Returns
    ],
    titleMatchers: [
      { value: "the batman", exact: true },
    ],
    mediaTypes: ["movie"],
  },

  {
    key: "blade-runner",
    displayName: "Blade Runner 2049",
    effectType: "rain",
    accentColor: "rgba(220,130,30,0.65)",
    ambientColor: "rgba(22,6,0,0.09)",
    tmdbIds: [
      335984,   // Blade Runner 2049
      78,       // Blade Runner (1982)
    ],
    titleMatchers: [
      { value: "blade runner", exact: false },
    ],
    mediaTypes: ["movie"],
  },

  {
    key: "babylon",
    displayName: "Babylon",
    effectType: "goldgrain",
    accentColor: "rgba(230,180,30,0.85)",
    ambientColor: "rgba(60,40,0,0.06)",
    tmdbIds: [669893],
    titleMatchers: [
      { value: "babylon", exact: true },
    ],
    mediaTypes: ["movie"],
  },

  {
    key: "lord-of-the-rings",
    displayName: "Lord of the Rings",
    effectType: "ringglow",
    accentColor: "rgba(220,170,40,0.85)",
    ambientColor: "rgba(40,28,0,0.07)",
    tmdbIds: [
      120,   // The Fellowship of the Ring
      121,   // The Two Towers
      122,   // The Return of the King
    ],
    titleMatchers: [
      { value: "lord of the rings", exact: false },
      { value: "fellowship of the ring", exact: false },
      { value: "two towers",             exact: false },
      { value: "return of the king",     exact: false },
      { value: "the hobbit",             exact: false },
    ],
    mediaTypes: ["movie", "book"],
  },

  {
    key: "fight-club",
    displayName: "Fight Club",
    effectType: "glitch",
    accentColor: "rgba(220,90,120,0.75)",
    ambientColor: "rgba(40,4,12,0.06)",
    tmdbIds: [550],
    titleMatchers: [
      { value: "fight club", exact: true },
    ],
    mediaTypes: ["movie", "book"],
  },

  // ── TV ─────────────────────────────────────────────────────────────────────
  {
    key: "invincible",
    displayName: "Invincible",
    effectType: "comic",
    accentColor: "rgba(255,212,0,0.95)",
    ambientColor: "rgba(20,55,200,0.05)",
    tmdbIds: [95557],
    titleMatchers: [
      { value: "invincible", exact: true },
    ],
    mediaTypes: ["tv"],
  },

  {
    key: "breaking-bad",
    displayName: "Breaking Bad",
    effectType: "chemglow",
    accentColor: "rgba(40,210,230,0.8)",
    ambientColor: "rgba(0,20,30,0.08)",
    tmdbIds: [1396],
    titleMatchers: [
      { value: "breaking bad", exact: true },
    ],
    mediaTypes: ["tv"],
  },

  {
    key: "severance",
    displayName: "Severance",
    effectType: "sterile",
    accentColor: "rgba(160,220,230,0.6)",
    ambientColor: "rgba(180,215,225,0.03)",
    tmdbIds: [95396],
    titleMatchers: [
      { value: "severance", exact: true },
    ],
    mediaTypes: ["tv"],
  },

  {
    key: "the-bear",
    displayName: "The Bear",
    effectType: "ticket",
    accentColor: "rgba(240,200,120,0.7)",
    ambientColor: "rgba(60,40,10,0.06)",
    tmdbIds: [136315],
    titleMatchers: [
      { value: "the bear", exact: true },
    ],
    mediaTypes: ["tv"],
  },

  {
    key: "succession",
    displayName: "Succession",
    effectType: "corpgold",
    accentColor: "rgba(210,175,50,0.8)",
    ambientColor: "rgba(0,8,30,0.09)",
    tmdbIds: [57243],
    titleMatchers: [
      { value: "succession", exact: true },
    ],
    mediaTypes: ["tv"],
  },

  // ── BOOKS ──────────────────────────────────────────────────────────────────
  {
    key: "project-hail-mary",
    displayName: "Project Hail Mary",
    effectType: "spaceglow",
    accentColor: "rgba(30,200,182,0.75)",
    ambientColor: "rgba(0,28,28,0.07)",
    // No TMDB ID — book only, title-match
    titleMatchers: [
      { value: "project hail mary", exact: true },
      { value: "hail mary",         exact: false },
    ],
    mediaTypes: ["book", "movie"],  // future-proofed for the film
  },

  {
    key: "dune-book",
    displayName: "Dune (book)",
    effectType: "sand",
    accentColor: "rgba(210,138,40,0.88)",
    ambientColor: "rgba(80,42,4,0.07)",
    titleMatchers: [
      { value: "dune", exact: false },
    ],
    mediaTypes: ["book"],
  },

  {
    key: "harry-potter",
    displayName: "Harry Potter",
    effectType: "dreamy",
    accentColor: "rgba(255,200,60,0.85)",
    ambientColor: "rgba(60,40,0,0.05)",
    tmdbIds: [
      671, 672, 673, 674, 675,   // HP 1-5
      767,                        // HP 6
      12444, 12445,               // HP 7 parts 1+2
    ],
    titleMatchers: [
      { value: "harry potter",        exact: false },
      { value: "philosophers stone",  exact: false },
      { value: "sorcerers stone",     exact: false },
      { value: "chamber of secrets",  exact: false },
      { value: "prisoner of azkaban", exact: false },
      { value: "goblet of fire",      exact: false },
      { value: "order of the phoenix",exact: false },
      { value: "half blood prince",   exact: false },
      { value: "deathly hallows",     exact: false },
    ],
    mediaTypes: ["movie", "book"],
  },

  // ── BONUS ──────────────────────────────────────────────────────────────────
  {
    key: "arrival",
    displayName: "Arrival",
    effectType: "spaceglow",
    accentColor: "rgba(80,160,210,0.65)",
    ambientColor: "rgba(0,18,40,0.07)",
    tmdbIds: [329865],
    titleMatchers: [
      { value: "arrival", exact: true },
    ],
    mediaTypes: ["movie"],
  },
]
