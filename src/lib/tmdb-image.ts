export const TMDB_BASE = "https://image.tmdb.org/t/p"

export type PosterSize = "w92" | "w154" | "w342" | "w500" | "w780" | "original"

type BackdropSize = "w300" | "w780" | "w1280" | "original"

function normalizePath(path: string | null | undefined) {
  if (!path) return null
  const trimmed = path.trim()
  if (!trimmed) return null
  return trimmed
}

function buildTmdbUrl(path: string | null | undefined, size: string): string | null {
  const normalized = normalizePath(path)
  if (!normalized) return null
  if (normalized.startsWith("http")) return normalized
  return `${TMDB_BASE}/${size}${normalized.startsWith("/") ? "" : "/"}${normalized}`
}

export function getPosterUrl(
  posterPath: string | null | undefined,
  size: PosterSize = "w342"
): string | null {
  return buildTmdbUrl(posterPath, size)
}

export function getBackdropUrl(
  backdropPath: string | null | undefined,
  size: BackdropSize = "w780"
): string | null {
  return buildTmdbUrl(backdropPath, size)
}

export function getTmdbImageUrl(
  path: string | null | undefined,
  size: string
): string | null {
  return buildTmdbUrl(path, size)
}
