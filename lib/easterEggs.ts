export type ThemeMode = "full" | "subtle" | "off"
export type EffectType = "spiderweb" | "sand" | "starfield" | "comic" | "dreamy" | "rain" | "space"

export interface EasterEggTheme {
  id: string
  name: string
  effectType: EffectType
  // primary accent used for glow / borders / particles
  accentColor: string
  // ambient layer tint
  ambientColor: string
  mediaIds?: string[]
  titleKeywords?: string[]
  mediaType?: "movie" | "tv" | "book" | "any"
  // optional: secret tracking key (for hidden unlock logic)
  secretKey?: string
}

// All media IDs are TMDB IDs (as strings, matching how URLs are structured).
export const EASTER_EGG_THEMES: EasterEggTheme[] = [
  {
    id: "spider-man",
    name: "Spider-Man",
    effectType: "spiderweb",
    accentColor: "rgba(195,28,28,0.9)",
    ambientColor: "rgba(50,5,5,0.06)",
    // SM (2002), SM2, SM3, TASM, TASM2, Homecoming, Far From Home, No Way Home, Spider-Verse, Across Spider-Verse
    mediaIds: ["557", "775", "49013", "102651", "102382", "315635", "429617", "634649", "443791", "569094", "324857"],
    mediaType: "movie",
    secretKey: "spiderman_fan",
  },
  {
    id: "dune",
    name: "Dune",
    effectType: "sand",
    accentColor: "rgba(210,138,40,0.85)",
    ambientColor: "rgba(80,45,5,0.07)",
    mediaIds: ["438631", "693134"],
    titleKeywords: ["dune"],
    mediaType: "movie",
  },
  {
    id: "interstellar",
    name: "Interstellar",
    effectType: "starfield",
    accentColor: "rgba(120,150,255,0.7)",
    ambientColor: "rgba(0,0,20,0.08)",
    mediaIds: ["157336"],
    mediaType: "movie",
  },
  {
    id: "invincible",
    name: "Invincible",
    effectType: "comic",
    accentColor: "rgba(255,210,0,0.9)",
    ambientColor: "rgba(20,60,200,0.05)",
    mediaIds: ["95557"],
    mediaType: "tv",
  },
  {
    id: "la-la-land",
    name: "La La Land",
    effectType: "dreamy",
    accentColor: "rgba(170,120,255,0.75)",
    ambientColor: "rgba(60,20,120,0.06)",
    mediaIds: ["313369"],
    mediaType: "movie",
  },
  {
    id: "the-batman",
    name: "The Batman",
    effectType: "rain",
    accentColor: "rgba(60,100,180,0.6)",
    ambientColor: "rgba(0,5,20,0.12)",
    mediaIds: ["414906", "268", "364"],
    mediaType: "movie",
  },
  {
    id: "project-hail-mary",
    name: "Project Hail Mary",
    effectType: "space",
    accentColor: "rgba(30,200,180,0.7)",
    ambientColor: "rgba(0,30,30,0.07)",
    titleKeywords: ["hail mary", "project hail mary"],
    mediaType: "any",
  },
  {
    id: "blade-runner",
    name: "Blade Runner 2049",
    effectType: "rain",
    accentColor: "rgba(200,120,30,0.6)",
    ambientColor: "rgba(20,5,0,0.09)",
    mediaIds: ["335984", "78"],
    mediaType: "movie",
  },
  {
    id: "arrival",
    name: "Arrival",
    effectType: "space",
    accentColor: "rgba(80,160,200,0.6)",
    ambientColor: "rgba(0,20,40,0.07)",
    mediaIds: ["329865"],
    mediaType: "movie",
  },
]

export function matchEasterEgg(
  mediaId: string | null,
  mediaType: "movie" | "tv" | "book",
  title?: string | null
): EasterEggTheme | null {
  for (const theme of EASTER_EGG_THEMES) {
    const typeOk = !theme.mediaType || theme.mediaType === "any" || theme.mediaType === mediaType

    if (!typeOk) continue

    if (theme.mediaIds && mediaId && theme.mediaIds.includes(mediaId)) {
      return theme
    }

    if (theme.titleKeywords && title) {
      const lower = title.toLowerCase()
      for (const kw of theme.titleKeywords) {
        if (lower.includes(kw)) return theme
      }
    }
  }
  return null
}

// ── Settings ─────────────────────────────────────────────────────────────────

export const THEME_MODE_KEY = "rs-theme-mode"
export const SECRET_PROGRESS_KEY = "rs-egg-progress"

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "subtle"
  try {
    const v = localStorage.getItem(THEME_MODE_KEY)
    if (v === "full" || v === "subtle" || v === "off") return v
  } catch { /* ignore */ }
  return "subtle"
}

export function setThemeMode(mode: ThemeMode): void {
  try { localStorage.setItem(THEME_MODE_KEY, mode) } catch { /* ignore */ }
}

// ── Secret progress tracking ──────────────────────────────────────────────────

export interface SecretProgress {
  [key: string]: string[]  // secretKey → array of mediaIds seen
}

export function getSecretProgress(): SecretProgress {
  try {
    const raw = localStorage.getItem(SECRET_PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as SecretProgress) : {}
  } catch { return {} }
}

export function recordSecretView(secretKey: string, mediaId: string): {
  progress: SecretProgress
  unlocked: boolean
  threshold: number
} {
  const THRESHOLDS: Record<string, number> = { spiderman_fan: 5 }
  const threshold = THRESHOLDS[secretKey] ?? 999
  const progress = getSecretProgress()
  const existing = new Set(progress[secretKey] ?? [])
  existing.add(mediaId)
  progress[secretKey] = Array.from(existing)
  try { localStorage.setItem(SECRET_PROGRESS_KEY, JSON.stringify(progress)) } catch { /* ignore */ }
  return { progress, unlocked: existing.size >= threshold, threshold }
}
