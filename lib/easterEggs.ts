// Settings and secret-progress utilities — matching logic now lives in lib/easter-eggs/

export type ThemeMode = "full" | "subtle" | "off"

export const THEME_MODE_KEY    = "rs-theme-mode"
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

export interface SecretProgress {
  [key: string]: string[]
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
