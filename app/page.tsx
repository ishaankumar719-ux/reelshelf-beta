import HomeDashboardClient from "../components/home/HomeDashboardClient";
import { resolveBooksWithCovers } from "../lib/bookCovers";
import { getBookHrefFromRouteId } from "../lib/bookRoutes";
import { localBooks } from "../lib/localBooks";
import { localMovies } from "../lib/localMovies";
import { getMovieHrefFromRouteId } from "../lib/movieRoutes";
import { getTMDBPosterUrl } from "../lib/posters";
import { getSeriesHrefFromRouteId } from "../lib/seriesRoutes";
import { localSeries } from "../lib/localSeries";
import type { TonightsPickItem } from "../components/watchlist/TonightsPick";

type TmdbMovieResult = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

export default async function Home() {
  const resolvedBooks = await resolveBooksWithCovers(localBooks.slice(0, 10));
  const apiKey = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY;

  let explorePickItems: TonightsPickItem[] = [];

  if (apiKey) {
    const exploreResponse = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 3600 } }
    );

    if (exploreResponse.ok) {
      const payload = (await exploreResponse.json()) as { results?: TmdbMovieResult[] };
      explorePickItems = (payload.results ?? [])
        .filter((movie) => !!movie.title)
        .slice(0, 20)
        .map((movie) => ({
          id: `tmdb-${movie.id}`,
          tmdbId: movie.id,
          title: movie.title,
          poster: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null,
          year: Number((movie.release_date ?? "0").slice(0, 4)) || 0,
          creator: null,
          genres: [],
          runtime: null,
          mediaType: "movie" as const,
          href: `/films/${movie.id}`,
          addedAt: new Date().toISOString(),
        }));
    }
  }

  const trendingMovies = localMovies.slice(0, 10).map((movie) => ({
    id: movie.id,
    mediaType: "movie" as const,
    title: movie.title,
    year: Number(movie.year),
    subtitle: movie.director,
    poster: movie.poster,
    href: getMovieHrefFromRouteId(movie.id),
  }));

  const trendingSeries = localSeries.slice(0, 10).map((series) => ({
    id: series.id,
    mediaType: "tv" as const,
    title: series.title,
    year: Number(series.year),
    subtitle: series.creator,
    poster: getTMDBPosterUrl(series.posterPath ?? series.poster),
    href: getSeriesHrefFromRouteId(series.id),
  }));

  const trendingBooks = resolvedBooks.map((book) => ({
    id: book.id,
    mediaType: "book" as const,
    title: book.title,
    year: Number(book.year),
    subtitle: book.author,
    poster: book.coverUrl,
    href: getBookHrefFromRouteId(book.id),
  }));

  return (
    <HomeDashboardClient
      trendingMovies={trendingMovies}
      trendingSeries={trendingSeries}
      trendingBooks={trendingBooks}
      explorePickItems={explorePickItems}
    />
  );
}
