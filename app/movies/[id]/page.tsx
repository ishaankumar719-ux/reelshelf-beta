import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AddToDiaryButton from "../../../components/AddToDiaryButton";
import AddToWatchlistButton from "../../../components/AddToWatchlistButton";
import BecauseYouLikedRow from "../../../components/BecauseYouLikedRow";
import TrackRecentView from "../../../components/TrackRecentView";
import { localMovies } from "../../../lib/localMovies";
import {
  getMovieHrefFromTmdbId,
  normalizeMovieRouteId,
} from "../../../lib/movieRoutes";
import {
  getMovieDetails,
  getMovieRecommendations,
  getMovieWatchProviders,
} from "../../../lib/tmdb";

function getDirectorName(
  crew?: Array<{ job?: string; name?: string }>
): string {
  return crew?.find((person) => person.job === "Director")?.name || "Unknown";
}

function getRuntimeLabel(runtime: number | null | undefined): string {
  return runtime ? `${runtime} min` : "—";
}

function BackButton() {
  return (
    <Link
      href="/movies"
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
      <span>Back to Films</span>
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
      href={getMovieHrefFromTmdbId(id)}
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

function ActionButtons({
  movie,
}: {
  movie: {
    id: string;
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
        marginBottom: 36,
      }}
    >
      <AddToDiaryButton movie={movie} />

      <AddToWatchlistButton movie={movie} />
    </div>
  );
}

function RecommendationsSection({
  recommendations,
}: {
  recommendations: Array<{
    id: number;
    title: string;
    release_date?: string;
    poster_path: string | null;
  }>;
}) {
  if (!recommendations.length) return null;

  return (
    <section>
      <h2
        style={{
          margin: "0 0 14px",
          fontSize: 22,
          letterSpacing: "-0.6px",
          fontWeight: 500,
        }}
      >
        Recommended for you
      </h2>

      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {recommendations.slice(0, 10).map((recommendedMovie) => (
          <RecommendationCard
            key={recommendedMovie.id}
            id={recommendedMovie.id}
            title={recommendedMovie.title}
            year={
              recommendedMovie.release_date
                ? recommendedMovie.release_date.slice(0, 4)
                : "—"
            }
            posterPath={recommendedMovie.poster_path}
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
  flatrate: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string;
  }>;
  rent: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string;
  }>;
  buy: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string;
  }>;
}) {
  return (
    <section style={{ marginBottom: 42 }}>
      <h2
        style={{
          margin: "0 0 14px",
          fontSize: 22,
          letterSpacing: "-0.6px",
          fontWeight: 500,
        }}
      >
        Where to watch
      </h2>

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

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const normalizedId = normalizeMovieRouteId(id);

  if (!normalizedId) {
    notFound();
  }

  if (normalizedId !== id) {
    redirect(`/movies/${normalizedId}`);
  }

  const localFilm = localMovies.find((film) => film.id === normalizedId);

  if (localFilm) {
    const providers = await getMovieWatchProviders(localFilm.tmdbId);
    const recommendations = await getMovieRecommendations(localFilm.tmdbId);

    const ukProviders = providers?.results?.GB;
    const flatrate = ukProviders?.flatrate || [];
    const rent = ukProviders?.rent || [];
    const buy = ukProviders?.buy || [];

    return (
      <main style={{ padding: "0 0 80px" }}>
        <TrackRecentView
          item={{
            id: localFilm.id,
            mediaType: "movie",
            title: localFilm.title,
            poster: localFilm.poster,
            year: Number(localFilm.year),
            director: localFilm.director,
            genres: [],
            runtime: Number(localFilm.runtime.replace(" min", "")),
            voteAverage: undefined,
          }}
        />
        <BackButton />

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 32,
            alignItems: "start",
          }}
        >
          <div
            style={{
              position: "relative",
              aspectRatio: "2 / 3",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#111",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            }}
          >
            <Image
              src={localFilm.poster}
              alt={localFilm.title}
              fill
              sizes="300px"
              style={{ objectFit: "cover" }}
            />
          </div>

          <div>
            <p
              style={{
                margin: 0,
                marginBottom: 10,
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Film
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
              {localFilm.title}
            </h1>

            <p
              style={{
                marginTop: 14,
                marginBottom: 0,
                color: "#aaaaaa",
                fontSize: 16,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {localFilm.year} · Directed by {localFilm.director} ·{" "}
              {localFilm.runtime}
            </p>

            <p
              style={{
                marginTop: 28,
                maxWidth: 760,
                color: "#c7c7c7",
                lineHeight: 1.7,
                fontSize: 18,
              }}
            >
              {localFilm.overview}
            </p>

            <ActionButtons
              movie={{
                id: localFilm.id,
                title: localFilm.title,
                year: Number(localFilm.year),
                poster: localFilm.poster,
                director: localFilm.director,
                genres: [],
                runtime: Number(localFilm.runtime.replace(" min", "")),
                voteAverage: undefined,
              }}
            />

            <WatchSection flatrate={flatrate} rent={rent} buy={buy} />

            <RecommendationsSection recommendations={recommendations} />

            <BecauseYouLikedRow
              mediaType="movie"
              currentId={localFilm.id}
              currentTitle={localFilm.title}
              currentCreator={localFilm.director}
              title={`Because you liked ${localFilm.title}`}
            />
          </div>
        </section>
      </main>
    );
  }

  if (!normalizedId.startsWith("tmdb-")) {
    notFound();
  }

  const tmdbId = Number(normalizedId.replace("tmdb-", ""));
  const movie = await getMovieDetails(tmdbId);
  const providers = await getMovieWatchProviders(tmdbId);
  const recommendations = await getMovieRecommendations(tmdbId);

  if (!movie) {
    notFound();
  }

  const director = getDirectorName(
    (movie as { credits?: { crew?: Array<{ job?: string; name?: string }> } })
      .credits?.crew
  );

  const movieReleaseDate =
    (movie as { release_date?: string }).release_date || undefined;
  const moviePosterPath =
    (movie as { poster_path?: string | null }).poster_path || null;
  const movieOverview =
    (movie as { overview?: string }).overview || "No overview available.";
  const movieRuntime = (movie as { runtime?: number | null }).runtime ?? null;
  const movieTitle = (movie as { title?: string }).title || "Untitled";

  const ukProviders = providers?.results?.GB;
  const flatrate = ukProviders?.flatrate || [];
  const rent = ukProviders?.rent || [];
  const buy = ukProviders?.buy || [];

  return (
    <main style={{ padding: "0 0 80px" }}>
      <TrackRecentView
        item={{
          id: `tmdb-${movie.id}`,
          mediaType: "movie",
          title: movieTitle,
          poster: moviePosterPath
            ? `https://image.tmdb.org/t/p/w500${moviePosterPath}`
            : undefined,
          year: movieReleaseDate ? Number(movieReleaseDate.slice(0, 4)) : 0,
          director,
          genres: [],
          runtime: movieRuntime || undefined,
          voteAverage: undefined,
        }}
      />
      <BackButton />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#111",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          }}
        >
          {moviePosterPath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w500${moviePosterPath}`}
              alt={movieTitle}
              fill
              sizes="300px"
              style={{ objectFit: "cover" }}
            />
          ) : null}
        </div>

        <div>
          <p
            style={{
              margin: 0,
              marginBottom: 10,
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            Film
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
            {movieTitle}
          </h1>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              color: "#aaaaaa",
              fontSize: 16,
              fontFamily: "Arial, sans-serif",
            }}
          >
            {movieReleaseDate ? movieReleaseDate.slice(0, 4) : "—"} · Directed by{" "}
            {director} · {getRuntimeLabel(movieRuntime)}
          </p>

          <p
            style={{
              marginTop: 28,
              maxWidth: 760,
              color: "#c7c7c7",
              lineHeight: 1.7,
              fontSize: 18,
            }}
          >
            {movieOverview}
          </p>

          <ActionButtons
            movie={{
              id: `tmdb-${movie.id}`,
              title: movieTitle,
              year: movieReleaseDate ? Number(movieReleaseDate.slice(0, 4)) : 0,
              poster: moviePosterPath
                ? `https://image.tmdb.org/t/p/w500${moviePosterPath}`
                : undefined,
              director,
              genres: [],
              runtime: movieRuntime || undefined,
              voteAverage: undefined,
            }}
          />

          <WatchSection flatrate={flatrate} rent={rent} buy={buy} />

          <RecommendationsSection recommendations={recommendations} />

          <BecauseYouLikedRow
            mediaType="movie"
            currentId={`tmdb-${movie.id}`}
            currentTitle={movieTitle}
            currentCreator={director}
            title={`Because you liked ${movieTitle}`}
          />
        </div>
      </section>
    </main>
  );
}
