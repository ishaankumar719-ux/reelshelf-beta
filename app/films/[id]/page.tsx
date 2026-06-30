import { notFound } from "next/navigation";
import { getLocalMovieByRouteId, localMovies } from "../../../lib/localMovies";
import { COLLECTION_DEFS, type CollectionDef } from "../../../lib/discoverCollections";
import { getMediaMeta } from "../../../lib/mediaMetadata";
import FilmDetailClient from "./FilmDetailClient";

// TMDB genre ID → name mapping (enough to cover all collection genres)
const GENRE_ID_TO_NAME: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 18: "Drama", 27: "Horror", 10402: "Music",
  9648: "Mystery", 878: "Science Fiction", 53: "Thriller",
  36: "History", 37: "Western", 10752: "War", 14: "Fantasy",
};

interface TMDBFilm {
  id: number;
  title: string;
  overview: string;
  tagline: string | null;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count?: number;
  genres: { id: number; name: string }[];
  original_language?: string;
  production_companies?: Array<{ id: number; name: string; logo_path?: string | null }>;
}

interface TMDBCastMember {
  id: number;
  name?: string;
  character?: string;
  profile_path: string | null;
  order?: number;
}

interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
}

interface TMDBFilmRec {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
}

// ─── Local catalog similarity ─────────────────────────────────────────────────
// Reliable fallback: uses local genre metadata to score similar films.
// Works for any film; TMDB recommendations may return 0 for less-popular titles.

function getSimilarLocalFilms(
  currentTmdbId: number,
  filmGenres: { id: number; name: string }[],
  director: string | null
): Array<{ id: number; title: string; year: string; poster_path: string | null; reason: string }> {
  const currentGenreNames = new Set(
    filmGenres.map((g) => GENRE_ID_TO_NAME[g.id] ?? g.name)
  );

  return localMovies
    .filter((m) => m.tmdbId !== currentTmdbId)
    .map((m) => {
      const meta = getMediaMeta("film", m.id);
      const genreOverlap = meta.genres.filter((g) => currentGenreNames.has(g));
      const isDirectorMatch = director && m.director === director;
      const score = genreOverlap.length * 10 + (isDirectorMatch ? 25 : 0) + meta.voteAverage;

      let reason = "";
      if (isDirectorMatch) reason = `Directed by ${m.director}`;
      else if (genreOverlap.length > 0) reason = `Similar ${genreOverlap[0]}`;

      return { film: m, score, reason };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ film, reason }) => ({
      id: film.tmdbId,
      title: film.title,
      year: film.year,
      poster_path: film.poster.replace("https://image.tmdb.org/t/p/w500", "") || null,
      reason,
    }));
}

// ─── Collection membership ────────────────────────────────────────────────────
// Keyword-dependent collections (coming-of-age, neo-noir) need an extra TMDB
// keywords fetch and are skipped here — genre + runtime checks cover the rest.

function getFilmCollections(film: TMDBFilm): CollectionDef[] {
  const hasGenre = (id: number) => film.genres?.some((g) => g.id === id) ?? false;
  const hasCompany = (id: number) => film.production_companies?.some((c) => c.id === id) ?? false;
  const va = film.vote_average ?? 0;
  const rt = film.runtime ?? 9999;

  return COLLECTION_DEFS.filter((def) => {
    if (def.tmdbMediaType !== "movie") return false;
    switch (def.slug) {
      case "best-of-a24":
        return hasCompany(41077) && va >= 7.0;
      case "under-90-min":
        return rt <= 90 && va >= 7.0;
      case "mind-benders":
        return (hasGenre(878) || hasGenre(53)) && va >= 7.5;
      case "true-crime":
        return hasGenre(80) && va >= 7.5;
      case "space-adventures":
        return hasGenre(878) && hasGenre(12) && va >= 7.0;
      case "one-night-thrillers":
        return hasGenre(53) && rt <= 120 && va >= 7.0;
      case "perfect-sunday-stories":
        return hasGenre(18) && va >= 7.5;
      default:
        return false;
    }
  });
}

export default async function FilmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apiKey = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!id || !apiKey) {
    notFound();
  }

  const localMovie = getLocalMovieByRouteId(id);
  const normalizedMovieId = localMovie
    ? String(localMovie.tmdbId)
    : id.startsWith("tmdb-")
      ? id.slice(5)
      : id;

  const [filmRes, creditsRes, providersRes, recsRes] = await Promise.all([
    fetch(
      `https://api.themoviedb.org/3/movie/${normalizedMovieId}?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    ),
    fetch(
      `https://api.themoviedb.org/3/movie/${normalizedMovieId}/credits?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    ),
    fetch(
      `https://api.themoviedb.org/3/movie/${normalizedMovieId}/watch/providers?api_key=${apiKey}`,
      { next: { revalidate: 86400 } }
    ),
    fetch(
      `https://api.themoviedb.org/3/movie/${normalizedMovieId}/recommendations?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    ),
  ]);

  const film = (await filmRes.json()) as TMDBFilm & { success?: boolean };
  const creditsData = (await creditsRes.json()) as { cast?: TMDBCastMember[]; crew?: TMDBCrewMember[] };
  const providersData = (await providersRes.json()) as {
    results?: {
      GB?: {
        link?: string;
        flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
      };
    };
  };
  const recsData = (await recsRes.json()) as { results?: TMDBFilmRec[] };

  const gbProviders = providersData?.results?.GB;
  const watchProviders = {
    flatrate: gbProviders?.flatrate ?? [],
  };

  if (filmRes.status === 404 || film.success === false || !film.id) {
    notFound();
  }

  const topCast = creditsData?.cast
    ? creditsData.cast
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .slice(0, 12)
        .map((member) => ({
          id: member.id,
          name: member.name ?? "",
          character: member.character ?? "",
          profile_path: member.profile_path ?? null,
          order: member.order ?? 0,
        }))
    : [];

  // TMDB recommendations (primary source — rich catalog but can be empty)
  const tmdbRecs = (recsData.results ?? [])
    .filter((r) => r.poster_path)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      title: r.title,
      year: r.release_date?.slice(0, 4) ?? "",
      poster_path: r.poster_path,
      reason: undefined as string | undefined,
    }));

  // Local catalog similarity (always reliable fallback)
  const directorName =
    creditsData?.crew?.find((m) => m.job === "Director")?.name ?? null;
  const localRecs = getSimilarLocalFilms(
    Number(normalizedMovieId),
    film.genres ?? [],
    directorName
  );

  // Merge: TMDB first (varied), then local items not already in TMDB list
  const tmdbIds = new Set(tmdbRecs.map((r) => r.id));
  const merged = [
    ...tmdbRecs,
    ...localRecs.filter((r) => !tmdbIds.has(r.id)),
  ].slice(0, 10);

  const matchingCollections = getFilmCollections(film);

  return (
    <FilmDetailClient
      film={film}
      topCast={topCast}
      watchProviders={watchProviders}
      recommendations={merged}
      matchingCollections={matchingCollections}
    />
  );
}
