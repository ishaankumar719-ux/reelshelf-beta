import { notFound } from "next/navigation";
import PersonClient from "./PersonClient";

interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  known_for_department: string;
  profile_path: string | null;
  place_of_birth: string | null;
  popularity: number;
  success?: boolean;
  movie_credits?: {
    cast?: TMDBMovieCredit[];
  };
  tv_credits?: {
    cast?: TMDBTVCredit[];
  };
}

interface TMDBMovieCredit {
  id: number;
  title?: string;
  character?: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  order?: number;
  popularity?: number;
}

interface TMDBTVCredit {
  id: number;
  name?: string;
  character?: string;
  poster_path: string | null;
  first_air_date?: string;
  vote_average?: number;
  episode_count?: number;
  popularity?: number;
}

interface CreditItem {
  id: number;
  title: string;
  character: string;
  poster_path: string;
  year: string;
  vote_average: number;
}

interface KnownForItem {
  id: number;
  title: string;
  poster_path: string;
  year: string;
  character?: string;
  mediaType: "movie" | "tv";
}

interface KnownForSortableItem extends KnownForItem {
  popularity: number;
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const key = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!key) {
    notFound();
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/person/${id}?api_key=${key}&language=en-US&append_to_response=movie_credits,tv_credits`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    notFound();
  }

  const person = (await res.json()) as TMDBPerson;

  if (person.success === false || !person.id) {
    notFound();
  }

  const topMovies: CreditItem[] = (person.movie_credits?.cast ?? [])
    .filter(
      (item): item is TMDBMovieCredit =>
        Boolean(item.poster_path) && (item.vote_average ?? 0) > 0
    )
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      title: item.title ?? "",
      character: item.character ?? "",
      poster_path: item.poster_path ?? "",
      year: item.release_date?.slice(0, 4) ?? "",
      vote_average: item.vote_average ?? 0,
    }));

  const topTV: CreditItem[] = (person.tv_credits?.cast ?? [])
    .filter(
      (item): item is TMDBTVCredit =>
        Boolean(item.poster_path) && (item.vote_average ?? 0) > 0
    )
    .sort((a, b) => (b.episode_count ?? 0) - (a.episode_count ?? 0))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.name ?? "",
      character: item.character ?? "",
      poster_path: item.poster_path ?? "",
      year: item.first_air_date?.slice(0, 4) ?? "",
      vote_average: item.vote_average ?? 0,
    }));

  const knownForMovies: KnownForSortableItem[] = (person.movie_credits?.cast ?? [])
    .filter((item): item is TMDBMovieCredit => Boolean(item.poster_path))
    .map((item) => ({
      id: item.id,
      title: item.title ?? "",
      poster_path: item.poster_path ?? "",
      year: item.release_date?.slice(0, 4) ?? "",
      character: item.character ?? "",
      mediaType: "movie" as const,
      popularity: item.popularity ?? 0,
    }))
    .sort((a, b) => b.popularity - a.popularity);

  const knownForTV: KnownForSortableItem[] = (person.tv_credits?.cast ?? [])
    .filter((item): item is TMDBTVCredit => Boolean(item.poster_path))
    .map((item) => ({
      id: item.id,
      title: item.name ?? "",
      poster_path: item.poster_path ?? "",
      year: item.first_air_date?.slice(0, 4) ?? "",
      character: item.character ?? "",
      mediaType: "tv" as const,
      popularity: item.popularity ?? 0,
    }))
    .sort((a, b) => b.popularity - a.popularity);

  const knownFor: KnownForItem[] = [...knownForMovies, ...knownForTV]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 6)
    .map(({ popularity: _popularity, ...item }) => item);

  return (
    <PersonClient
      person={person}
      topMovies={topMovies}
      topTV={topTV}
      knownFor={knownFor}
    />
  );
}
