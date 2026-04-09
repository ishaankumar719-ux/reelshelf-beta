import { getPosterUrl } from "../src/lib/tmdb-image";

export function getTMDBPosterUrl(posterPath?: string | null) {
  return getPosterUrl(posterPath, "w500");
}

export function getFirstPosterUrl(
  ...posterCandidates: Array<string | null | undefined>
) {
  for (const candidate of posterCandidates) {
    const url = getPosterUrl(candidate, "w500");

    if (url) {
      return url;
    }
  }

  return null;
}
