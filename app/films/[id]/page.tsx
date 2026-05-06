import { notFound } from "next/navigation";
import { getLocalMovieByRouteId } from "../../../lib/localMovies";
import FilmDetailClient from "./FilmDetailClient";

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
  genres: { id: number; name: string }[];
}

interface TMDBCastMember {
  id: number;
  name?: string;
  character?: string;
  profile_path: string | null;
  order?: number;
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

  const [filmRes, creditsRes] = await Promise.all([
    fetch(
      `https://api.themoviedb.org/3/movie/${normalizedMovieId}?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    ),
    fetch(
      `https://api.themoviedb.org/3/movie/${normalizedMovieId}/credits?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    ),
  ]);

  const film = (await filmRes.json()) as TMDBFilm & { success?: boolean };
  const creditsData = (await creditsRes.json()) as { cast?: TMDBCastMember[] };

  if (filmRes.status === 404 || film.success === false || !film.id) {
    notFound();
  }

  console.log("[FILM CAST] raw cast count:", creditsData?.cast?.length ?? 0);
  console.log("[FILM CAST] first member:", creditsData?.cast?.[0]);

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

  console.log("[FILM CAST] topCast length after mapping:", topCast.length);

  return <FilmDetailClient film={film} topCast={topCast} />;
}
