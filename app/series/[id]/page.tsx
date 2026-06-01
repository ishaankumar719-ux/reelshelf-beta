import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CastSection, { type CastMember } from "../../../components/detail/CastSection";
import { MediaCard } from "../../../src/components/ui/MediaCard";
import { getPosterUrl, getBackdropUrl, getTmdbImageUrl } from "../../../src/lib/tmdb-image";
import AddToDiaryButton from "../../../components/AddToDiaryButton";
import AddToWatchlistButton from "../../../components/AddToWatchlistButton";
import BecauseYouLikedRow from "../../../components/BecauseYouLikedRow";
import MediaReviewsSection from "../../../components/reviews/MediaReviewsSection";
import SeriesReviewPanel from "../../../components/SeriesReviewPanel";
import SeasonBrowser, { type BasicSeason, type InitialSeason } from "../../../components/tv/SeasonBrowser";
import TVProgressModule from "../../../components/tv/TVProgressModule";
import TVFriendsLayer from "../../../components/tv/TVFriendsLayer";
import TrackRecentView from "../../../components/TrackRecentView";
import { getLocalSeriesByRouteId } from "../../../lib/localSeries";
import {
  getSeriesHrefFromTmdbId,
  normalizeSeriesRouteId,
} from "../../../lib/seriesRoutes";
import {
  getTVDetails,
  getTVSeasonDetails,
  getTVRecommendations,
  getTVWatchProviders,
  type TMDBTVDetails,
  type TMDBTVRecommendation,
  type TMDBTVSeasonDetails,
} from "../../../lib/tmdb";

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

type TMDBAggregateCastMember = {
  id: number;
  name: string;
  profile_path: string | null;
  total_episode_count?: number | null;
  roles?: Array<{ character?: string | null }>;
  character?: string | null;
};

type TMDBStandardCastMember = {
  id: number;
  name: string;
  profile_path: string | null;
  order?: number;
  character?: string | null;
};

function getCreatorName(
  details?: {
    created_by?: Array<{ name?: string }>;
    credits?: { crew?: Array<{ job?: string; name?: string }> };
  },
  fallback?: string
) {
  const fromCreators = details?.created_by
    ?.map((person) => person.name)
    .filter(Boolean) as string[] | undefined;

  if (fromCreators && fromCreators.length > 0) {
    return fromCreators.join(", ");
  }

  return (
    details?.credits?.crew?.find((person) => person.job === "Executive Producer")
      ?.name ||
    fallback ||
    "Unknown"
  );
}

function getSeasonLabel(count: number | null | undefined, fallback?: string) {
  if (typeof count === "number" && count > 0) {
    return `${count} ${count === 1 ? "season" : "seasons"}`;
  }

  return fallback || "—";
}

function getEpisodeRuntimeLabel(runtime: number | null | undefined) {
  return runtime ? `${runtime} min eps` : "Runtime unavailable";
}

function getGenreNames(details?: TMDBTVDetails | null) {
  const genres = details?.genres;

  if (!Array.isArray(genres)) {
    return [];
  }

  return genres
    .map((genre) => genre.name?.trim())
    .filter((genre): genre is string => Boolean(genre));
}

function BackButton() {
  return (
    <Link
      href="/series"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 28,
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "#d1d5db",
        textDecoration: "none",
        fontSize: 13,
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 14 }}>←</span>
      <span>Back to Series</span>
    </Link>
  );
}

function ProviderBadge({
  name,
  logoPath,
}: {
  name: string;
  logoPath: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <img
        src={getTmdbImageUrl(logoPath, "w154") || undefined}
        alt={name}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          objectFit: "cover",
        }}
      />
      <span
        style={{
          fontSize: 14,
          color: "white",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {name}
      </span>
    </div>
  );
}

function RecommendationCard({
  id,
  title,
  year,
  posterPath,
}: {
  id: number;
  title: string;
  year: string;
  posterPath: string | null;
}) {
  return (
    <div style={{ width: 180, flexShrink: 0 }}>
      <MediaCard
        title={title}
        year={year}
        posterPath={posterPath}
        mediaType="series"
        size="md"
        href={getSeriesHrefFromTmdbId(id)}
      />
    </div>
  );
}

function DetailPill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 36,
        padding: "9px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "#e5e7eb",
        fontSize: 13,
        lineHeight: 1,
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
      }}
    >
      {label}
    </span>
  );
}

function ActionButtons({
  series,
}: {
  series: {
    id: string;
    mediaType: "tv";
    title: string;
    year: number;
    poster?: string;
    director?: string;
    genres?: string[];
    runtime?: number;
    voteAverage?: number;
  };
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        marginTop: 30,
        marginBottom: 32,
        flexWrap: "wrap",
      }}
    >
      <AddToDiaryButton movie={series} />
      <AddToWatchlistButton movie={series} />
    </div>
  );
}

function RecommendationsSection({
  recommendations,
}: {
  recommendations: TMDBTVRecommendation[];
}) {
  if (!recommendations.length) return null;

  return (
    <section
      style={{
        marginTop: 42,
        padding: 24,
        borderRadius: 26,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.94) 100%)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 24,
          letterSpacing: "-0.8px",
          fontWeight: 500,
        }}
      >
        Related series
      </h2>

      <p
        style={{
          margin: "0 0 18px",
          color: "#9ca3af",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        More shows in the same orbit.
      </p>

      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {recommendations.slice(0, 10).map((recommendedSeries) => (
          <RecommendationCard
            key={recommendedSeries.id}
            id={recommendedSeries.id}
            title={recommendedSeries.name}
            year={
              recommendedSeries.first_air_date
                ? recommendedSeries.first_air_date.slice(0, 4)
                : "—"
            }
            posterPath={recommendedSeries.poster_path}
          />
        ))}
      </div>
    </section>
  );
}

function WatchSection({
  flatrate,
  rent,
  buy,
}: {
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
}) {
  return (
    <section
      style={{
        padding: 24,
        borderRadius: 26,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.94) 100%)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 24,
          letterSpacing: "-0.8px",
          fontWeight: 500,
        }}
      >
        Where to watch
      </h2>

      <p
        style={{
          margin: "0 0 18px",
          color: "#9ca3af",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        Available UK streaming options for this series.
      </p>

      {flatrate.length === 0 && rent.length === 0 && buy.length === 0 ? (
        <p
          style={{
            margin: 0,
            color: "#9ca3af",
            fontSize: 14,
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          No UK streaming information available.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {flatrate.length > 0 ? (
            <div>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#9ca3af",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Stream
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {flatrate.map((provider) => (
                  <ProviderBadge
                    key={`stream-${provider.provider_id}`}
                    name={provider.provider_name}
                    logoPath={provider.logo_path}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {rent.length > 0 ? (
            <div>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#9ca3af",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Rent
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {rent.map((provider) => (
                  <ProviderBadge
                    key={`rent-${provider.provider_id}`}
                    name={provider.provider_name}
                    logoPath={provider.logo_path}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {buy.length > 0 ? (
            <div>
              <p
                style={{
                  margin: "0 0 10px",
                  color: "#9ca3af",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Buy
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {buy.map((provider) => (
                  <ProviderBadge
                    key={`buy-${provider.provider_id}`}
                    name={provider.provider_name}
                    logoPath={provider.logo_path}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SeriesHero({
  title,
  year,
  creator,
  overview,
  topCast,
  posterUrl,
  backdropUrl,
  network,
  status,
  genres,
  seasonsLabel,
  runtimeLabel,
  actionSeries,
}: {
  title: string;
  year: string;
  creator: string;
  overview: string;
  topCast: CastMember[];
  posterUrl?: string;
  backdropUrl?: string | null;
  network?: string | null;
  status?: string | null;
  genres: string[];
  seasonsLabel: string;
  runtimeLabel: string;
  actionSeries: {
    id: string;
    mediaType: "tv";
    title: string;
    year: number;
    poster?: string;
    director?: string;
    genres?: string[];
    runtime?: number;
    voteAverage?: number;
  };
}) {
  const genreSummary = genres.length > 0 ? genres.slice(0, 3).join(" · ") : null;

  function getStatusColor(s: string | null | undefined) {
    if (!s) return "rgba(255,255,255,0.22)";
    const lower = s.toLowerCase();
    if (lower.includes("return") || lower.includes("production")) return "#1D9E75";
    if (lower.includes("ended")) return "rgba(255,255,255,0.30)";
    if (lower.includes("cancel")) return "rgba(200,60,60,0.75)";
    return "rgba(255,255,255,0.28)";
  }

  return (
    <div style={{ position: "relative", marginBottom: 4 }}>
      {/* Backdrop image — decorative, very subtle */}
      {backdropUrl && (
        <>
          <div style={{
            position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", zIndex: 0,
          }}>
            <img
              src={backdropUrl}
              alt=""
              aria-hidden="true"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
            />
          </div>
          <div style={{
            position: "absolute", inset: 0, borderRadius: 28, zIndex: 0,
            background: "linear-gradient(to right, rgba(6,6,12,0.92) 0%, rgba(6,6,12,0.82) 40%, rgba(6,6,12,0.75) 100%)",
          }} />
        </>
      )}

    <section
      className="series-detail-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
        gap: 34,
        alignItems: "start",
        position: "relative",
        zIndex: 1,
        padding: backdropUrl ? "28px 0" : 0,
      }}
    >
      <div
        className="series-detail-poster"
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #171717 0%, #0a0a0a 100%)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
        }}
      >
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 900px) 100vw, 320px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 18,
              background:
                "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.38)",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              ReelShelf
            </span>
            <div
              style={{
                alignSelf: "flex-start",
                minWidth: 48,
                height: 48,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.62)",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              TV
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 42%, rgba(0,0,0,0.1) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.96) 100%)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
          padding: 28,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 38%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <p
            style={{
              margin: 0,
              marginBottom: 12,
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Series
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(28px, 7vw, 56px)",
              lineHeight: 1.04,
              letterSpacing: "clamp(-0.8px, -0.2vw, -2px)",
              fontWeight: 500,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              color: "rgba(209,213,219,0.82)",
              fontSize: 15,
              lineHeight: 1.7,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {year}{creator ? ` · ${creator}` : ""}
            {network ? ` · ${network}` : ""}
          </p>

          {/* Status + genre pills row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            {status && (
              <span style={{
                display: "inline-flex", alignItems: "center", height: 28, padding: "0 12px",
                borderRadius: 999, fontSize: 11, letterSpacing: "0.08em",
                border: "1px solid",
                borderColor: getStatusColor(status) === "#1D9E75"
                  ? "rgba(29,158,117,0.35)"
                  : "rgba(255,255,255,0.10)",
                color: getStatusColor(status),
                background: getStatusColor(status) === "#1D9E75"
                  ? "rgba(29,158,117,0.10)"
                  : "rgba(255,255,255,0.04)",
              }}>
                {status}
              </span>
            )}
            <DetailPill label={seasonsLabel} />
            <DetailPill label={runtimeLabel} />
            {genres.slice(0, 3).map((genre) => (
              <DetailPill key={genre} label={genre} />
            ))}
          </div>

          <ActionButtons series={actionSeries} />

          <section
            style={{
              padding: 22,
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                color: "#9ca3af",
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Overview
            </p>

            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color: "#d1d5db",
                lineHeight: 1.8,
                fontSize: 17,
              }}
            >
              {overview}
            </p>
          </section>

          {topCast.length > 0 ? <CastSection cast={topCast} /> : null}
        </div>
      </div>
    </section>
    </div>
  );
}

function SeriesDetailContent({
  title,
  year,
  creator,
  overview,
  topCast,
  posterUrl,
  backdropUrl,
  network,
  status,
  genres,
  seasonsLabel,
  runtimeLabel,
  actionSeries,
  tmdbId,
  basicSeasons,
  initialSeason,
  flatrate,
  rent,
  buy,
  recommendations,
}: {
  title: string;
  year: string;
  creator: string;
  overview: string;
  topCast: CastMember[];
  posterUrl?: string;
  backdropUrl?: string | null;
  network?: string | null;
  status?: string | null;
  genres: string[];
  seasonsLabel: string;
  runtimeLabel: string;
  actionSeries: {
    id: string;
    mediaType: "tv";
    title: string;
    year: number;
    poster?: string;
    director?: string;
    genres?: string[];
    runtime?: number;
    voteAverage?: number;
  };
  tmdbId: number;
  basicSeasons: BasicSeason[];
  initialSeason: InitialSeason | null;
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  recommendations: TMDBTVRecommendation[];
}) {
  const totalEpisodes = basicSeasons.reduce((sum, s) => sum + s.episodeCount, 0);
  const socialMediaIds = Array.from(new Set([String(tmdbId), actionSeries.id, `tmdb-${tmdbId}`]));
  // Minimal season data for SeriesReviewPanel (show + season reviews only, no episodes)
  const reviewPanelSeasons = basicSeasons.map((s) => ({
    seasonNumber: s.seasonNumber,
    name: s.name,
    overview: s.overview,
    posterUrl: s.posterUrl ?? undefined,
    airDate: s.airDate ?? undefined,
    episodeCount: s.episodeCount,
  }));

  return (
    <main style={{ padding: "0 0 80px" }}>
      <TrackRecentView item={actionSeries} />
      <style>{`
        @media (max-width: 900px) {
          .series-detail-grid {
            grid-template-columns: 1fr !important;
          }
          .series-detail-poster {
            max-width: 320px;
          }
        }
        /* Horizontal-scroll containers — hide native scrollbar, enable momentum + snap */
        .series-ep-season-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
        }
        .series-ep-season-scroll::-webkit-scrollbar {
          display: none;
        }
        /* Snap each direct child (season cards, tab buttons) */
        .series-ep-season-scroll > * {
          scroll-snap-align: start;
        }
        /* Hide episode stills at very small widths */
        @media (max-width: 480px) {
          .series-episode-still { display: none !important; }
        }
        /* Ensure backdrop stays behind poster on single-column layout */
        @media (max-width: 900px) {
          .series-hero-backdrop { display: none; }
        }
        /* Compact hero poster on narrow viewports */
        @media (max-width: 480px) {
          .series-detail-poster { max-width: 160px !important; }
        }
      `}</style>

      <BackButton />

      <SeriesHero
        title={title}
        year={year}
        creator={creator}
        overview={overview}
        topCast={topCast}
        posterUrl={posterUrl}
        backdropUrl={backdropUrl}
        network={network}
        status={status}
        genres={genres}
        seasonsLabel={seasonsLabel}
        runtimeLabel={runtimeLabel}
        actionSeries={actionSeries}
      />

      {/* Progress + Continue Watching — diary-based, suppresses if no data */}
      {totalEpisodes > 0 && (
        <div style={{ marginTop: 20 }}>
          <TVProgressModule
            tmdbId={tmdbId}
            seriesId={actionSeries.id}
            totalEpisodes={totalEpisodes}
            seasonBrowserId="season-browser"
          />
        </div>
      )}

      <div style={{ display: "grid", gap: 26, marginTop: 34 }}>
        {/* Season browser — lazy-loads episodes per season */}
        {basicSeasons.length > 0 && (
          <section
            id="season-browser"
            style={{
              padding: 24,
              borderRadius: 26,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.94) 100%)",
            }}
          >
            <SeasonBrowser
              tmdbId={tmdbId}
              seriesId={actionSeries.id}
              title={title}
              year={actionSeries.year}
              creator={creator}
              basicSeasons={basicSeasons}
              initialSeason={initialSeason}
            />
          </section>
        )}

        {/* Review panel — show-level + season-level reviews */}
        {reviewPanelSeasons.length > 0 && (
          <SeriesReviewPanel
            tmdbId={tmdbId}
            series={actionSeries}
            creator={creator}
            seasons={reviewPanelSeasons}
          />
        )}

        {/* Friends social layer */}
        <TVFriendsLayer mediaIds={socialMediaIds} title={title} />

        <WatchSection flatrate={flatrate} rent={rent} buy={buy} />
        <RecommendationsSection recommendations={recommendations} />
        <BecauseYouLikedRow
          mediaType="tv"
          currentId={actionSeries.id}
          currentTitle={title}
          currentCreator={creator}
          currentGenres={genres}
          title={`Because you liked ${title}`}
        />
        <MediaReviewsSection
          mediaIds={[actionSeries.id]}
          mediaType="tv"
          title={title}
          year={Number(year) || 0}
          poster={posterUrl ?? null}
          creator={creator}
          href={`/series/${actionSeries.id}`}
        />
      </div>
    </main>
  );
}

function parseSeasonFallbackCount(label?: string) {
  const match = label?.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/** Build basic season list from TMDBTVDetails.seasons (no episode data — no extra fetch). */
function buildBasicSeasons(
  details: TMDBTVDetails | null,
  fallbackLabel?: string
): BasicSeason[] {
  if (details?.seasons?.length) {
    return details.seasons
      .filter((s) => s.season_number >= 1)
      .map((s) => ({
        seasonNumber: s.season_number,
        name: s.name || `Season ${s.season_number}`,
        overview: s.overview || "",
        posterUrl: getPosterUrl(s.poster_path, "w342"),
        airDate: s.air_date ?? null,
        episodeCount: s.episode_count,
      }));
  }
  // Fallback: generate stubs from season count string (no extra fetch needed)
  const count =
    parseSeasonFallbackCount(fallbackLabel) ?? (details?.number_of_seasons ?? 0);
  return Array.from({ length: count }, (_, i) => ({
    seasonNumber: i + 1,
    name: `Season ${i + 1}`,
    overview: "",
    posterUrl: null,
    airDate: null,
    episodeCount: 0,
  }));
}

/** Fetch only the first real season's episode data (single TMDB call instead of N). */
async function loadInitialSeason(
  tmdbId: number,
  basicSeasons: BasicSeason[]
): Promise<InitialSeason | null> {
  const firstNum = basicSeasons[0]?.seasonNumber;
  if (!firstNum) return null;
  const data = await getTVSeasonDetails(tmdbId, firstNum);
  if (!data) return null;
  return {
    seasonNumber: firstNum,
    episodes: data.episodes.map((ep) => ({
      id: ep.id,
      name: ep.name || `Episode ${ep.episode_number}`,
      overview: ep.overview || "",
      airDate: ep.air_date || undefined,
      episodeNumber: ep.episode_number,
      runtime: ep.runtime ?? null,
      stillPath: ep.still_path ?? null,
    })),
  };
}

async function fetchSeriesTopCast(tmdbId: number): Promise<CastMember[]> {
  const apiKey = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const aggregateRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/aggregate_credits?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    );

    if (aggregateRes.ok) {
      const aggregateData = (await aggregateRes.json()) as {
        cast?: TMDBAggregateCastMember[];
      };

      const aggregateCast = (aggregateData.cast ?? [])
        .sort(
          (left, right) =>
            (right.total_episode_count ?? 0) - (left.total_episode_count ?? 0)
        )
        .slice(0, 12)
        .map((member) => ({
          id: member.id,
          name: member.name,
          character: member.roles?.[0]?.character ?? member.character ?? "",
          profile_path: member.profile_path ?? null,
          order: 0,
        }));

      if (aggregateCast.length > 0) {
        return aggregateCast;
      }
    }
  } catch {
    // fall through to standard credits
  }

  try {
    const creditsRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${apiKey}&language=en-US`,
      { next: { revalidate: 86400 } }
    );

    if (!creditsRes.ok) {
      return [];
    }

    const creditsData = (await creditsRes.json()) as {
      cast?: TMDBStandardCastMember[];
    };

    return (creditsData.cast ?? [])
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
      .slice(0, 12)
      .map((member) => ({
        id: member.id,
        name: member.name,
        character: member.character ?? "",
        profile_path: member.profile_path ?? null,
        order: member.order ?? 0,
      }));
  } catch {
    return [];
  }
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const normalizedId = normalizeSeriesRouteId(id);

  if (!normalizedId) {
    notFound();
  }

  if (normalizedId !== id) {
    redirect(`/series/${normalizedId}`);
  }

  const localShow = getLocalSeriesByRouteId(normalizedId);

  if (localShow) {
    const [details, providers, recommendations, topCast] = await Promise.all([
      getTVDetails(localShow.tmdbId),
      getTVWatchProviders(localShow.tmdbId),
      getTVRecommendations(localShow.tmdbId),
      fetchSeriesTopCast(localShow.tmdbId),
    ]);

    const ukProviders = providers?.results?.GB;
    const flatrate = ukProviders?.flatrate || [];
    const rent = ukProviders?.rent || [];
    const buy = ukProviders?.buy || [];

    const creator = getCreatorName(details || undefined, localShow.creator);
    const genreNames = getGenreNames(details);
    const seasonCount = details?.number_of_seasons ?? null;
    const episodeRuntime = details?.episode_run_time?.[0] ?? null;
    const posterUrl = getPosterUrl(localShow.posterPath ?? localShow.poster, "w500");
    const backdropUrl = getBackdropUrl(details?.backdrop_path ?? null, "w1280");
    const network = details?.networks?.[0]?.name ?? null;
    const status = details?.status ?? null;
    const basicSeasons = buildBasicSeasons(details, localShow.seasons);
    const initialSeason = await loadInitialSeason(localShow.tmdbId, basicSeasons);

    return (
      <SeriesDetailContent
        title={localShow.title}
        year={localShow.year}
        creator={creator}
        overview={details?.overview || localShow.overview}
        topCast={topCast}
        posterUrl={posterUrl || undefined}
        backdropUrl={backdropUrl}
        network={network}
        status={status}
        genres={genreNames}
        seasonsLabel={getSeasonLabel(seasonCount, localShow.seasons)}
        runtimeLabel={getEpisodeRuntimeLabel(episodeRuntime)}
        actionSeries={{
          id: localShow.id,
          mediaType: "tv",
          title: localShow.title,
          year: Number(localShow.year),
          poster: posterUrl || undefined,
          director: creator,
          genres: genreNames,
          runtime: episodeRuntime || undefined,
          voteAverage: undefined,
        }}
        tmdbId={localShow.tmdbId}
        basicSeasons={basicSeasons}
        initialSeason={initialSeason}
        flatrate={flatrate}
        rent={rent}
        buy={buy}
        recommendations={recommendations}
      />
    );
  }

  if (!normalizedId.startsWith("tmdb-")) {
    notFound();
  }

  const tmdbId = Number(normalizedId.replace("tmdb-", ""));
  const [show, providers, recommendations, topCast] = await Promise.all([
    getTVDetails(tmdbId),
    getTVWatchProviders(tmdbId),
    getTVRecommendations(tmdbId),
    fetchSeriesTopCast(tmdbId),
  ]);

  if (!show) {
    notFound();
  }

  const creator = getCreatorName(show);
  const genreNames = getGenreNames(show);
  const showTitle = show.name || "Untitled";
  const showYear = show.first_air_date ? show.first_air_date.slice(0, 4) : "—";
  const seasonCount = show.number_of_seasons ?? null;
  const episodeRuntime = show.episode_run_time?.[0] ?? null;
  const posterUrl = getPosterUrl(show.poster_path, "w500");
  const backdropUrl = getBackdropUrl(show.backdrop_path ?? null, "w1280");
  const network = show.networks?.[0]?.name ?? null;
  const status = show.status ?? null;
  const basicSeasons = buildBasicSeasons(show);
  const initialSeason = await loadInitialSeason(tmdbId, basicSeasons);
  const ukProviders = providers?.results?.GB;
  const flatrate = ukProviders?.flatrate || [];
  const rent = ukProviders?.rent || [];
  const buy = ukProviders?.buy || [];

  return (
    <SeriesDetailContent
      title={showTitle}
      year={showYear}
      creator={creator}
      overview={show.overview || "No overview available."}
      topCast={topCast}
      posterUrl={posterUrl || undefined}
      backdropUrl={backdropUrl}
      network={network}
      status={status}
      genres={genreNames}
      seasonsLabel={getSeasonLabel(seasonCount)}
      runtimeLabel={getEpisodeRuntimeLabel(episodeRuntime)}
      actionSeries={{
        id: `tmdb-${show.id}`,
        mediaType: "tv",
        title: showTitle,
        year: showYear === "—" ? 0 : Number(showYear),
        poster: posterUrl || undefined,
        director: creator,
        genres: genreNames,
        runtime: episodeRuntime || undefined,
        voteAverage: undefined,
      }}
      tmdbId={tmdbId}
      basicSeasons={basicSeasons}
      initialSeason={initialSeason}
      flatrate={flatrate}
      rent={rent}
      buy={buy}
      recommendations={recommendations}
    />
  );
}
