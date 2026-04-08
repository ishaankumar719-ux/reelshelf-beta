export function getTMDBPosterUrl(posterPath?: string | null) {
  if (!posterPath) {
    return null;
  }

  if (posterPath.startsWith("http://") || posterPath.startsWith("https://")) {
    return posterPath;
  }

  return `https://image.tmdb.org/t/p/w500/${posterPath.replace(/^\/+/, "")}`;
}
