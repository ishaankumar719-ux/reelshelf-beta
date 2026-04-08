import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AddToDiaryButton from "../../../components/AddToDiaryButton";
import AddToWatchlistButton from "../../../components/AddToWatchlistButton";
import BecauseYouLikedRow from "../../../components/BecauseYouLikedRow";
import TrackRecentView from "../../../components/TrackRecentView";
import { getTMDBPosterUrl } from "../../../lib/posters";
import { getLocalSeriesByRouteId } from "../../../lib/localSeries";
import {
  getSeriesHrefFromTmdbId,
  normalizeSeriesRouteId,
} from "../../../lib/seriesRoutes";
import {
  getTVDetails,
  getTVRecommendations,
  getTVWatchProviders,
  type TMDBTVDetails,
  type TMDBTVRecommendation,
} from "../../../lib/tmdb";

type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
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
  const genres = (
    details as TMDBTVDetails & { genres?: Array<{ id?: number; name?: string }> }
  )?.genres;

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
        fontFamily: "Arial, sans-serif",
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
        src={`https://image.tmdb.org/t/p/w92${logoPath}`}
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
          fontFamily: "Arial, sans-serif",
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
    <Link
      href={getSeriesHrefFromTmdbId(id)}
      style={{
        textDecoration: "none",
        color: "white",
        width: 180,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 180,
          aspectRatio: "2 / 3",
          borderRadius: 16,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
        }}
      >
        {posterPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w500${posterPath}`}
            alt={title}
            fill
            sizes="180px"
            style={{ objectFit: "cover" }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 38%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.02) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.1,
              letterSpacing: "-0.4px",
              fontWeight: 600,
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,0.75)",
              fontSize: 12,
              fontFamily: "Arial, sans-serif",
            }}
          >
            {year}
          </p>
        </div>
      </div>
    </Link>
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
        fontFamily: "Arial, sans-serif",
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
          fontFamily: "Arial, sans-serif",
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
          fontFamily: "Arial, sans-serif",
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
            fontFamily: "Arial, sans-serif",
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
                  fontFamily: "Arial, sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
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
                  fontFamily: "Arial, sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
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
                  fontFamily: "Arial, sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
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
  posterUrl,
  genres,
  seasonsLabel,
  runtimeLabel,
  actionSeries,
}: {
  title: string;
  year: string;
  creator: string;
  overview: string;
  posterUrl?: string;
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

  return (
    <section
      className="series-detail-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
        gap: 34,
        alignItems: "start",
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
        ) : null}

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
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Series
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: 56,
              lineHeight: 1.02,
              letterSpacing: "-2px",
              fontWeight: 500,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: "16px 0 0",
              color: "#d1d5db",
              fontSize: 17,
              lineHeight: 1.7,
              fontFamily: "Arial, sans-serif",
            }}
          >
            {year} · Created by {creator}
            {genreSummary ? ` · ${genreSummary}` : ""}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 22,
            }}
          >
            <DetailPill label={seasonsLabel} />
            <DetailPill label={runtimeLabel} />
            {genres.slice(0, 4).map((genre) => (
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
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
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
        </div>
      </div>
    </section>
  );
}

function SeriesDetailContent({
  title,
  year,
  creator,
  overview,
  posterUrl,
  genres,
  seasonsLabel,
  runtimeLabel,
  actionSeries,
  flatrate,
  rent,
  buy,
  recommendations,
}: {
  title: string;
  year: string;
  creator: string;
  overview: string;
  posterUrl?: string;
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
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
  recommendations: TMDBTVRecommendation[];
}) {
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
      `}</style>

      <BackButton />

      <SeriesHero
        title={title}
        year={year}
        creator={creator}
        overview={overview}
        posterUrl={posterUrl}
        genres={genres}
        seasonsLabel={seasonsLabel}
        runtimeLabel={runtimeLabel}
        actionSeries={actionSeries}
      />

      <div
        style={{
          display: "grid",
          gap: 26,
          marginTop: 34,
        }}
      >
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
      </div>
    </main>
  );
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
    const [details, providers, recommendations] = await Promise.all([
      getTVDetails(localShow.tmdbId),
      getTVWatchProviders(localShow.tmdbId),
      getTVRecommendations(localShow.tmdbId),
    ]);

    const ukProviders = providers?.results?.GB;
    const flatrate = ukProviders?.flatrate || [];
    const rent = ukProviders?.rent || [];
    const buy = ukProviders?.buy || [];

    const creator = getCreatorName(details || undefined, localShow.creator);
    const genreNames = getGenreNames(details);
    const seasonCount = details?.number_of_seasons ?? null;
    const episodeRuntime = details?.episode_run_time?.[0] ?? null;
    const posterUrl = getTMDBPosterUrl(localShow.posterPath ?? localShow.poster);

    return (
      <SeriesDetailContent
        title={localShow.title}
        year={localShow.year}
        creator={creator}
        overview={details?.overview || localShow.overview}
        posterUrl={posterUrl || undefined}
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
  const [show, providers, recommendations] = await Promise.all([
    getTVDetails(tmdbId),
    getTVWatchProviders(tmdbId),
    getTVRecommendations(tmdbId),
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
  const posterUrl = getTMDBPosterUrl(show.poster_path);
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
      posterUrl={posterUrl || undefined}
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
      flatrate={flatrate}
      rent={rent}
      buy={buy}
      recommendations={recommendations}
    />
  );
}
