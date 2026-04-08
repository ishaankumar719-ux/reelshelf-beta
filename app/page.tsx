import HomeDashboardClient from "../components/home/HomeDashboardClient";
import { resolveBooksWithCovers } from "../lib/bookCovers";
import { getBookHrefFromRouteId } from "../lib/bookRoutes";
import { localBooks } from "../lib/localBooks";
import { localMovies } from "../lib/localMovies";
import { getMovieHrefFromRouteId } from "../lib/movieRoutes";
import { getTMDBPosterUrl } from "../lib/posters";
import { getSeriesHrefFromRouteId } from "../lib/seriesRoutes";
import { localSeries } from "../lib/localSeries";

export default async function Home() {
  const resolvedBooks = await resolveBooksWithCovers(localBooks.slice(0, 10));

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
    />
  );
}
