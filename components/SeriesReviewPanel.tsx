"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// Note: Image import kept for season poster thumbnails in Seasons tab
import { useAuth } from "./AuthProvider";
import ReviewForm from "../src/components/reviews/ReviewForm";
import { getAllShowReviews } from "../src/lib/reviews";
import type { Review } from "../src/types/reviews";

type SeriesReviewSeason = {
  seasonNumber: number;
  name: string;
  overview: string;
  posterUrl?: string;
  airDate?: string;
  /** Total episode count for this season (used for progress display) */
  episodeCount?: number;
};

type SeriesActionItem = {
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

type SeriesReviewPanelProps = {
  tmdbId: number;
  series: SeriesActionItem;
  creator: string;
  seasons: SeriesReviewSeason[];
};

type ReviewBundle = {
  showReview: Review | null;
  seasonReviews: Review[];
  episodeReviews: Review[];
};

type ActiveTab = "show" | "seasons";

function formatDateLabel(value?: string) {
  if (!value) return "Date unknown";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getScopeBadge(review: Review | null) {
  if (!review) return null;
  if (review.review_scope === "season") {
    return `Season ${review.season_number}`;
  }
  if (review.review_scope === "episode") {
    return `S${review.season_number} E${review.episode_number}`;
  }
  return "Show review";
}

function getSeasonAverageRating(reviews: Review[]) {
  const rated = reviews.filter((review) => typeof review.rating === "number");

  if (!rated.length) {
    return null;
  }

  return Number(
    (rated.reduce((sum, review) => sum + (review.rating || 0), 0) / rated.length).toFixed(1)
  );
}

function getSeasonReviewLookup(reviews: Review[]) {
  return new Map(reviews.map((review) => [review.season_number || 0, review]));
}


export default function SeriesReviewPanel({
  tmdbId,
  series,
  creator,
  seasons,
}: SeriesReviewPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("show");
  const [reviewBundle, setReviewBundle] = useState<ReviewBundle>({
    showReview: null,
    seasonReviews: [],
    episodeReviews: [],
  });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [openSeason, setOpenSeason] = useState<number | null>(
    Number(searchParams.get("season")) || null
  );

  const seasonRefs = useRef(new Map<number, HTMLDivElement | null>());

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      if (!user?.id) {
        if (!cancelled) {
          setReviewBundle({ showReview: null, seasonReviews: [], episodeReviews: [] });
          setLoadingReviews(false);
        }
        return;
      }

      setLoadingReviews(true);
      const bundle = await getAllShowReviews(user.id, tmdbId, {
        aliases: [series.id, `tmdb-${tmdbId}`],
      });

      if (!cancelled) {
        setReviewBundle(bundle);
        setLoadingReviews(false);
      }
    }

    void loadReviews();
    return () => { cancelled = true; };
  }, [series.id, tmdbId, user?.id]);

  useEffect(() => {
    const seasonParam = Number(searchParams.get("season")) || null;
    setOpenSeason(seasonParam);
    if (seasonParam) setActiveTab("seasons");
  }, [searchParams]);

  useEffect(() => {
    if (openSeason) {
      seasonRefs.current.get(openSeason)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [openSeason]);

  const seasonReviewLookup = useMemo(
    () => getSeasonReviewLookup(reviewBundle.seasonReviews),
    [reviewBundle.seasonReviews]
  );

  function updateSearchParams(next: { season?: number | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (typeof next.season === "number" && next.season > 0) {
      params.set("season", String(next.season));
    } else if (next.season === null) {
      params.delete("season");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleShowReviewSaved(review: Review | null) {
    setReviewBundle((current) => ({ ...current, showReview: review }));
  }

  function handleSeasonReviewSaved(seasonNumber: number, review: Review | null) {
    setReviewBundle((current) => ({
      ...current,
      seasonReviews: review
        ? [...current.seasonReviews.filter((e) => e.season_number !== seasonNumber), review]
        : current.seasonReviews.filter((e) => e.season_number !== seasonNumber),
    }));
  }

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
      <div className="flex flex-col gap-4 border-b border-white/8 pb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/35">
              Review layers
            </p>
            <h2 className="mt-3 text-[28px] font-medium tracking-[-0.03em] text-white/92">
              Track the show, each season, and the moments that land hardest
            </h2>
            <p className="mt-3 max-w-[760px] text-sm leading-6 text-white/54">
              Keep one overall take on the series, then zoom into the seasons and episodes that changed the way you felt about it.
            </p>
          </div>

          {loadingReviews ? (
            <span className="text-sm text-white/42">Loading your reviews…</span>
          ) : reviewBundle.showReview ? (
            <span className="inline-flex h-10 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
              {getScopeBadge(reviewBundle.showReview)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { id: "show", label: "Show" },
            { id: "seasons", label: "Seasons" },
          ] as Array<{ id: ActiveTab; label: string }>).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex h-10 items-center rounded-full px-4 text-[11px] uppercase tracking-[0.18em] transition ${
                activeTab === tab.id
                  ? "border border-white/12 bg-white text-black"
                  : "border border-white/10 bg-white/[0.04] text-white/72"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "show" ? (
          <div className="grid gap-4">
            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Overall series review</p>
              <h3 className="mt-3 text-xl font-medium tracking-[-0.03em] text-white/90">
                {series.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Capture your big-picture take on the full run.
              </p>
            </div>
            <ReviewForm
              mediaId={tmdbId}
              mediaType="series"
              scope="show"
              initialReview={reviewBundle.showReview}
              onSaved={handleShowReviewSaved}
              title={series.title}
              year={series.year}
              creator={creator}
              aliases={[series.id, `tmdb-${tmdbId}`]}
            />
          </div>
        ) : null}

        {activeTab === "seasons" ? (
          <div className="grid gap-4">
            {seasons.map((season) => {
              const seasonReview = seasonReviewLookup.get(season.seasonNumber) || null;
              const seasonEpisodeReviews = reviewBundle.episodeReviews.filter(
                (review) => review.season_number === season.seasonNumber
              );
              const averageRating = getSeasonAverageRating(seasonEpisodeReviews);
              const watchedCount = seasonEpisodeReviews.length;
              const isOpen = openSeason === season.seasonNumber;

              return (
                <div
                  key={season.seasonNumber}
                  ref={(node) => {
                    seasonRefs.current.set(season.seasonNumber, node);
                  }}
                  className={`rounded-[22px] border ${
                    isOpen
                      ? "border-emerald-400/30 bg-emerald-400/[0.05]"
                      : "border-white/8 bg-white/[0.03]"
                  } p-4 sm:p-5`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const nextOpen = isOpen ? null : season.seasonNumber;
                      setOpenSeason(nextOpen);
                      updateSearchParams({ season: nextOpen });
                    }}
                    className="flex w-full items-start gap-4 text-left"
                  >
                    <div className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-white/8 bg-[#0d0d18]">
                      {season.posterUrl ? (
                        <Image
                          src={season.posterUrl}
                          alt={season.name}
                          fill
                          sizes="72px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.22em] text-white/30">
                          S{season.seasonNumber}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium text-white/90">{season.name}</h3>
                        {seasonReview ? (
                          <span className="inline-flex h-7 items-center rounded-full border border-white/12 bg-white/[0.06] px-3 text-[10px] uppercase tracking-[0.16em] text-white/65">
                            {seasonReview.rating ? `${seasonReview.rating.toFixed(1)} / 10` : "Review saved"}
                          </span>
                        ) : (
                          <span className="inline-flex h-7 items-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-[10px] uppercase tracking-[0.16em] text-white/42">
                            Add review
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-white/46">
                        {season.episodeCount ?? 0} episodes
                        {season.airDate ? ` · ${season.airDate.slice(0, 4)}` : ""}
                        {averageRating ? ` · Avg episode score ${averageRating.toFixed(1)} / 10` : ""}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/54">
                        {season.overview || "No season overview available yet."}
                      </p>
                      {(season.episodeCount ?? 0) > 0 && (
                        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/34">
                          Watched progress {watchedCount}/{season.episodeCount ?? 0}
                        </p>
                      )}
                    </div>

                    <span className="text-xl text-white/40">{isOpen ? "−" : "+"}</span>
                  </button>

                  {isOpen ? (
                    <div className="mt-4 border-t border-white/8 pt-4">
                      <ReviewForm
                        mediaId={tmdbId}
                        mediaType="series"
                        scope="season"
                        seasonNumber={season.seasonNumber}
                        initialReview={seasonReview}
                        onSaved={(review) =>
                          handleSeasonReviewSaved(season.seasonNumber, review)
                        }
                        title={`${series.title} • ${season.name}`}
                        year={season.airDate ? Number(season.airDate.slice(0, 4)) : series.year}
                        creator={creator}
                        aliases={[series.id, `tmdb-${tmdbId}`]}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Episodes tab removed — handled by SeasonBrowser above */}
      </div>
    </section>
  );
}
