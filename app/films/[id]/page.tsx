import { notFound } from "next/navigation";
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
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
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

  const [filmRes, creditsRes] = await Promise.all([
    fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    ),
    fetch(
      `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`,
      { next: { revalidate: 86400 } }
    ),
  ]);

  const film = (await filmRes.json()) as TMDBFilm & { success?: boolean };
  const credits = (await creditsRes.json()) as { cast?: TMDBCastMember[] };

  if (filmRes.status === 404 || film.success === false || !film.id) {
    notFound();
  }

  const topCast = (credits.cast ?? [])
    .sort((a, b) => a.order - b.order)
    .slice(0, 12)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      profile_path: member.profile_path ?? null,
      order: member.order,
    }));

  return <FilmDetailClient film={film} topCast={topCast} />;
}
