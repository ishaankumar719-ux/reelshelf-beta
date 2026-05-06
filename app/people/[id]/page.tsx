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
  vote_count?: number;
  order?: number;
  popularity?: number;
  genre_ids?: number[];
}

interface TMDBTVCredit {
  id: number;
  name?: string;
  character?: string;
  poster_path: string | null;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  episode_count?: number;
  popularity?: number;
  genre_ids?: number[];
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
  vote_average?: number;
  character?: string;
  mediaType: "movie" | "tv";
}

interface KnownForSortableItem extends KnownForItem {
  sortKey: number;
  vote_count: number;
}

// TMDB genre IDs that indicate low-value content for actors
const LOW_VALUE_GENRE_IDS = new Set([
  10767, // Talk
  10763, // News
  10764, // Reality
  10766, // Soap (optional — some soap actors are primarily known for this)
]);

// Character name patterns that indicate a self/non-fiction appearance
const SELF_ROLE_RE =
  /\b(self|himself|herself|themselves|host|narrator)\b|\(archive footage\)|\(uncredited\)/i;

// Title keyword patterns that identify talk/news/interview shows
const TALK_SHOW_RE = new RegExp(
  [
    "late[- ]?(night|show|late)",
    "tonight show",
    "daily show",
    "last week tonight",
    "jimmy (kimmel|fallon|carr)",
    "conan",
    "colbert",
    "letterman",
    "leno",
    "meyers",
    "seth meyers",
    "good morning",
    "morning america",
    "today show",
    "the view",
    "ellen",
    "oprah",
    "60 minutes",
    "jonathan ross",
    "graham norton",
    "bill maher",
    "real time",
    "watch what happens live",
    "access hollywood",
    "entertainment tonight",
    "live with kelly",
    "extra \\(",
    "breakfast club",
    "live at the apollo",
    "friday night with",
    "saturday night live",
    "award[s]? (show|ceremony|night)",
    "\\bnews (at|tonight|special)\\b",
    "\\binterview\\b",
    "\\btalk show\\b",
  ].join("|"),
  "i"
);

function isSelfRole(character: string | undefined): boolean {
  if (!character) return false;
  return SELF_ROLE_RE.test(character);
}

function isTalkShow(title: string, genreIds: number[] | undefined): boolean {
  if (genreIds?.some((g) => LOW_VALUE_GENRE_IDS.has(g))) return true;
  return TALK_SHOW_RE.test(title);
}

// Composite score for Known For ranking.
// Combines popularity (trending signal) with vote_count (historic reach) and quality.
function movieScore(item: TMDBMovieCredit): number {
  const pop = item.popularity ?? 0;
  const vc = item.vote_count ?? 0;
  const va = item.vote_average ?? 0;
  return pop * Math.log10(Math.max(vc, 10)) * Math.max(va, 0.1);
}

function tvScore(item: TMDBTVCredit): number {
  const pop = item.popularity ?? 0;
  const vc = item.vote_count ?? 0;
  const va = item.vote_average ?? 0;
  const ep = item.episode_count ?? 1;
  // Log episode count rewards committed roles without letting soap operas dominate
  return pop * Math.log10(Math.max(vc, 10)) * Math.max(va, 0.1) * Math.log2(ep + 1);
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

  // Films section: named acting roles, minimum audience reach, sorted by composite score
  const topMovies: CreditItem[] = (person.movie_credits?.cast ?? [])
    .filter(
      (item): item is TMDBMovieCredit =>
        Boolean(item.poster_path) &&
        (item.vote_average ?? 0) > 0 &&
        (item.vote_count ?? 0) > 50 &&
        !isSelfRole(item.character)
    )
    .sort((a, b) => movieScore(b) - movieScore(a))
    .slice(0, 14)
    .map((item) => ({
      id: item.id,
      title: item.title ?? "",
      character: item.character ?? "",
      poster_path: item.poster_path ?? "",
      year: item.release_date?.slice(0, 4) ?? "",
      vote_average: item.vote_average ?? 0,
    }));

  // Series section: committed roles (≥3 episodes), no talk/news shows, sorted by episode-weighted score
  const topTV: CreditItem[] = (person.tv_credits?.cast ?? [])
    .filter(
      (item): item is TMDBTVCredit =>
        Boolean(item.poster_path) &&
        (item.vote_average ?? 0) > 0 &&
        (item.vote_count ?? 0) > 50 &&
        (item.episode_count ?? 0) >= 2 &&
        !isSelfRole(item.character) &&
        !isTalkShow(item.name ?? "", item.genre_ids)
    )
    .sort((a, b) => tvScore(b) - tvScore(a))
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      title: item.name ?? "",
      character: item.character ?? "",
      poster_path: item.poster_path ?? "",
      year: item.first_air_date?.slice(0, 4) ?? "",
      vote_average: item.vote_average ?? 0,
    }));

  // Known For rail: strongest 6 credits across movies + prestige TV
  // Movies get a 1.2× boost so they appear before TV at equal score
  const knownForMovies: KnownForSortableItem[] = (person.movie_credits?.cast ?? [])
    .filter(
      (item): item is TMDBMovieCredit =>
        Boolean(item.poster_path) &&
        (item.vote_count ?? 0) > 300 &&
        !isSelfRole(item.character)
    )
    .map((item) => ({
      id: item.id,
      title: item.title ?? "",
      poster_path: item.poster_path ?? "",
      year: item.release_date?.slice(0, 4) ?? "",
      vote_average: item.vote_average ?? 0,
      character: item.character ?? "",
      mediaType: "movie" as const,
      sortKey: movieScore(item) * 1.2,
      vote_count: item.vote_count ?? 0,
    }));

  const knownForTV: KnownForSortableItem[] = (person.tv_credits?.cast ?? [])
    .filter(
      (item): item is TMDBTVCredit =>
        Boolean(item.poster_path) &&
        (item.vote_count ?? 0) > 300 &&
        (item.episode_count ?? 0) >= 3 &&
        !isSelfRole(item.character) &&
        !isTalkShow(item.name ?? "", item.genre_ids)
    )
    .map((item) => ({
      id: item.id,
      title: item.name ?? "",
      poster_path: item.poster_path ?? "",
      year: item.first_air_date?.slice(0, 4) ?? "",
      vote_average: item.vote_average ?? 0,
      character: item.character ?? "",
      mediaType: "tv" as const,
      sortKey: tvScore(item),
      vote_count: item.vote_count ?? 0,
    }));

  const seen = new Set<number>();
  const knownFor: KnownForItem[] = [...knownForMovies, ...knownForTV]
    .sort((a, b) => b.sortKey - a.sortKey)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 6)
    .map(({ sortKey: _s, vote_count: _vc, ...item }) => item);

  return (
    <PersonClient
      person={person}
      topMovies={topMovies}
      topTV={topTV}
      knownFor={knownFor}
    />
  );
}
