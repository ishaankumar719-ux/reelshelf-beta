import HomeDashboardClient from "../components/home/HomeDashboardClient";
import type { RecommendedItem } from "../components/home/HomeDashboardClient";
import { resolveBooksWithCovers } from "../lib/bookCovers";
import { getBookHrefFromRouteId } from "../lib/bookRoutes";
import { localBooks } from "../lib/localBooks";
import { localMovies } from "../lib/localMovies";
import { getMovieHrefFromRouteId } from "../lib/movieRoutes";
import { getTMDBPosterUrl } from "../lib/posters";
import { getSeriesHrefFromRouteId } from "../lib/seriesRoutes";
import { localSeries } from "../lib/localSeries";
import { createClient } from "../lib/supabase/server";
import { fetchRecentPublicLists } from "../lib/supabase/lists";
import type { DiscoveryList } from "../lib/supabase/lists";
import { staffPickIds, hiddenGemIds, bookOfMonthId } from "../lib/editorial";
import {
  buildUserContext,
  scoreCandidate,
  generateReasons,
} from "../lib/recommendation-engine";

export const dynamic = "force-dynamic";

// ─── Recommendations ──────────────────────────────────────────────────────────

async function getRecommendations(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  bookCoverMap: Map<string, string | null>,
): Promise<RecommendedItem[]> {
  try {
    const ctx = await buildUserContext(supabase, userId, { excludeWatchlist: false })

    const scored = [
      ...localMovies
        .filter((m) => !ctx.loggedFilmIds.has(m.id))
        .map((m) => scoreCandidate("film", m.id, m.director, ctx)),
      ...localSeries
        .filter((s) => !ctx.loggedTvIds.has(s.id))
        .map((s) => scoreCandidate("tv", s.id, s.creator, ctx)),
      ...localBooks
        .filter((b) => !ctx.loggedBookIds.has(b.id))
        .map((b) => scoreCandidate("book", b.id, b.author, ctx)),
    ]
      .filter((c) => c.totalScore > -500)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 8)

    return scored.flatMap((candidate): RecommendedItem[] => {
      const reasons = generateReasons(candidate)

      if (candidate.mediaType === "film") {
        const m = localMovies.find((x) => x.id === candidate.mediaId)
        if (!m) return []
        return [{
          id: m.id,
          mediaType: "movie",
          title: m.title,
          year: Number(m.year),
          poster: (m.poster as string | null) ?? null,
          href: getMovieHrefFromRouteId(m.id),
          reasons,
        }]
      }

      if (candidate.mediaType === "tv") {
        const s = localSeries.find((x) => x.id === candidate.mediaId)
        if (!s) return []
        return [{
          id: s.id,
          mediaType: "tv",
          title: s.title,
          year: Number(s.year),
          poster: getTMDBPosterUrl(s.posterPath ?? s.poster) ?? null,
          href: getSeriesHrefFromRouteId(s.id),
          reasons,
        }]
      }

      const b = localBooks.find((x) => x.id === candidate.mediaId)
      if (!b) return []
      return [{
        id: b.id,
        mediaType: "book",
        title: b.title,
        year: Number(b.year),
        poster: bookCoverMap.get(b.id) ?? null,
        href: getBookHrefFromRouteId(b.id),
        reasons,
      }]
    })
  } catch {
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const supabase = await createClient();

  const [resolvedBooks, recentListsResult, userResult] = await Promise.all([
    resolveBooksWithCovers(localBooks.slice(0, 10)),
    supabase ? fetchRecentPublicLists(supabase, 6) : Promise.resolve<DiscoveryList[]>([]),
    supabase ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } }),
  ]);

  const user = userResult.data.user;
  const recentLists: DiscoveryList[] = recentListsResult;

  const bookCoverMap = new Map(resolvedBooks.map((b) => [b.id, b.coverUrl ?? null]));

  const recommendations: RecommendedItem[] = supabase && user
    ? await getRecommendations(supabase, user.id, bookCoverMap)
    : [];

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

  // ── Staff Picks ──────────────────────────────────────────────────────────────
  const staffPicks = [
    ...localMovies
      .filter((m) => (staffPickIds.movie as string[]).includes(m.id))
      .map((m) => ({
        id: m.id,
        mediaType: "movie" as const,
        title: m.title,
        year: Number(m.year),
        poster: m.poster as string | null,
        href: getMovieHrefFromRouteId(m.id),
      })),
    ...localSeries
      .filter((s) => (staffPickIds.tv as string[]).includes(s.id))
      .map((s) => ({
        id: s.id,
        mediaType: "tv" as const,
        title: s.title,
        year: Number(s.year),
        poster: getTMDBPosterUrl(s.posterPath ?? s.poster),
        href: getSeriesHrefFromRouteId(s.id),
      })),
    ...resolvedBooks
      .filter((b) => (staffPickIds.book as string[]).includes(b.id))
      .map((b) => ({
        id: b.id,
        mediaType: "book" as const,
        title: b.title,
        year: Number(b.year),
        poster: b.coverUrl,
        href: getBookHrefFromRouteId(b.id),
      })),
  ];

  // ── Hidden Gems ──────────────────────────────────────────────────────────────
  const hiddenGems = [
    ...localMovies
      .filter((m) => (hiddenGemIds.movie as string[]).includes(m.id))
      .map((m) => ({
        id: m.id,
        mediaType: "movie" as const,
        title: m.title,
        year: Number(m.year),
        poster: m.poster as string | null,
        href: getMovieHrefFromRouteId(m.id),
      })),
    ...localSeries
      .filter((s) => (hiddenGemIds.tv as string[]).includes(s.id))
      .map((s) => ({
        id: s.id,
        mediaType: "tv" as const,
        title: s.title,
        year: Number(s.year),
        poster: getTMDBPosterUrl(s.posterPath ?? s.poster),
        href: getSeriesHrefFromRouteId(s.id),
      })),
    ...resolvedBooks
      .filter((b) => (hiddenGemIds.book as string[]).includes(b.id))
      .map((b) => ({
        id: b.id,
        mediaType: "book" as const,
        title: b.title,
        year: Number(b.year),
        poster: b.coverUrl,
        href: getBookHrefFromRouteId(b.id),
      })),
  ];

  // ── Book of the Month ────────────────────────────────────────────────────────
  const botmRaw =
    resolvedBooks.find((b) => b.id === bookOfMonthId) ?? resolvedBooks[0];
  const bookOfMonth = botmRaw
    ? {
        id: botmRaw.id,
        title: botmRaw.title,
        year: Number(botmRaw.year),
        author: botmRaw.author,
        genre: botmRaw.genre,
        overview: botmRaw.overview,
        coverUrl: botmRaw.coverUrl,
        href: getBookHrefFromRouteId(botmRaw.id),
      }
    : null;

  // ── Feeling Lucky pools ───────────────────────────────────────────────────────
  const luckyPools = {
    movie: localMovies.map((m) => ({
      title: m.title,
      href: getMovieHrefFromRouteId(m.id),
    })),
    tv: localSeries.map((s) => ({
      title: s.title,
      href: getSeriesHrefFromRouteId(s.id),
    })),
    book: localBooks.map((b) => ({
      title: b.title,
      href: getBookHrefFromRouteId(b.id),
    })),
  };

  return (
    <HomeDashboardClient
      trendingMovies={trendingMovies}
      trendingSeries={trendingSeries}
      trendingBooks={trendingBooks}
      recentLists={recentLists}
      staffPicks={staffPicks}
      hiddenGems={hiddenGems}
      bookOfMonth={bookOfMonth}
      luckyPools={luckyPools}
      recommendations={recommendations}
    />
  );
}
