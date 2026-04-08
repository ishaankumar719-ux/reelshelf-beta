"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import GamificationWidgets from "../../components/GamificationWidgets";
import {
  getDiaryMovies,
  subscribeToDiary,
  type DiaryMovie,
} from "../../lib/diary";
import { getMediaHref } from "../../lib/mediaRoutes";
import {
  getEmptyMountRushmore,
  getProfileHandle,
  getProfileInitials,
  getPublicProfileHref,
  type MountRushmoreMovie,
} from "../../lib/profile";

type ProfileTab = "movie" | "tv" | "book";
type MountRushmoreDraft = {
  title: string;
  year: string;
  subtitle: string;
  poster: string;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        color: "#7f7f7f",
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {children}
    </p>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 15px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.03)",
        color: active ? "white" : "#9ca3af",
        fontSize: 12,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: "Arial, sans-serif",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function LinkPill({
  href,
  children,
  tone = "primary",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "ghost";
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 40,
        padding: "0 16px",
        borderRadius: 999,
        textDecoration: "none",
        fontSize: 13,
        fontFamily: "Arial, sans-serif",
        fontWeight: tone === "primary" ? 600 : 500,
        background: tone === "primary" ? "white" : "rgba(255,255,255,0.03)",
        color: tone === "primary" ? "black" : "white",
        border:
          tone === "primary"
            ? "none"
            : "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {children}
    </Link>
  );
}

function IdentityAvatar({
  avatarUrl,
  label,
  initials,
}: {
  avatarUrl: string | null;
  label: string;
  initials: string;
}) {
  return (
    <div
      style={{
        width: 104,
        height: 104,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.09), transparent 60%), linear-gradient(180deg, #161616 0%, #090909 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.76)",
            fontSize: 30,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        padding: "18px 18px 16px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#8f8f8f",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {label}
      </p>
      <h3
        style={{
          margin: "10px 0 0",
          fontSize: 30,
          lineHeight: 1,
          letterSpacing: "-1px",
          fontWeight: 600,
        }}
      >
        {value}
      </h3>
      <p
        style={{
          margin: "8px 0 0",
          color: "#9ca3af",
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {detail}
      </p>
    </div>
  );
}

function FavouriteField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 10 }}>
      <span
        style={{
          color: "#d1d5db",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 46,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.035)",
          color: "white",
          padding: "0 14px",
          fontSize: 15,
          outline: "none",
        }}
      />
    </label>
  );
}

function formatLoggedDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAverageRating(entries: DiaryMovie[]) {
  const rated = entries.filter((entry) => typeof entry.rating === "number");

  if (rated.length === 0) {
    return "—";
  }

  const average =
    rated.reduce((sum, entry) => sum + (entry.rating || 0), 0) / rated.length;

  return average.toFixed(1);
}

function getRatedEntries(entries: DiaryMovie[]) {
  return entries.filter((entry) => typeof entry.rating === "number");
}

function getTopCreators(entries: DiaryMovie[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.director) continue;
    counts.set(entry.director, (counts.get(entry.director) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function getTopGenres(entries: DiaryMovie[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    for (const genre of entry.genres || []) {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(b[0]);
    })
    .slice(0, 3)
    .map(([name, count]) => `${name} · ${count}`);
}

function getRecentEntries(entries: DiaryMovie[]) {
  return [...entries]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 4);
}

function getTabMeta(tab: ProfileTab) {
  if (tab === "movie") {
    return {
      label: "Films",
      singular: "film",
      creatorLabel: "Directors",
      ctaHref: "/movies",
      ctaLabel: "Browse films",
      emptyLabel: "No film insights yet",
      emptyBody: "Log films in your diary to build out your cinematic profile.",
    };
  }

  if (tab === "tv") {
    return {
      label: "Series",
      singular: "series",
      creatorLabel: "Creators",
      ctaHref: "/series",
      ctaLabel: "Browse series",
      emptyLabel: "No series insights yet",
      emptyBody: "Start logging series to see your television taste take shape.",
    };
  }

  return {
    label: "Books",
    singular: "book",
    creatorLabel: "Authors",
    ctaHref: "/books",
    ctaLabel: "Browse books",
    emptyLabel: "No book insights yet",
    emptyBody: "Log books in your diary to build out your reading profile.",
  };
}

function getInsightDetails(entries: DiaryMovie[]) {
  const ratedEntries = getRatedEntries(entries);
  const favouriteCount = entries.filter((entry) => entry.favourite).length;
  const reviewedCount = entries.filter((entry) => entry.review.trim()).length;
  const topCreators = getTopCreators(entries);
  const topGenres = getTopGenres(entries);
  const highestRated =
    [...ratedEntries].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;
  const latestLogged = getRecentEntries(entries)[0] || null;

  return {
    ratedEntries,
    favouriteCount,
    reviewedCount,
    topCreators,
    topGenres,
    highestRated,
    latestLogged,
  };
}

function getInsightStats(
  entries: DiaryMovie[],
  meta: ReturnType<typeof getTabMeta>,
  insights: ReturnType<typeof getInsightDetails>
) {
  return [
    {
      label: `${meta.label} logged`,
      value: entries.length,
      detail:
        entries.length === 0
          ? `No ${meta.label.toLowerCase()} logged yet.`
          : `${insights.reviewedCount} review${insights.reviewedCount === 1 ? "" : "s"} written across your ${meta.label.toLowerCase()} diary.`,
    },
    {
      label: "Average rating",
      value: formatAverageRating(entries),
      detail:
        insights.ratedEntries.length === 0
          ? `Rate ${meta.label.toLowerCase()} entries to surface an average.`
          : `Calculated from ${insights.ratedEntries.length} rated ${meta.label.toLowerCase()}.`,
    },
    {
      label: "Favourites",
      value: insights.favouriteCount,
      detail:
        insights.favouriteCount === 0
          ? `No favourite ${meta.singular} marked yet.`
          : `${insights.favouriteCount} ${meta.singular}${insights.favouriteCount === 1 ? "" : "s"} marked as a favourite.`,
    },
    {
      label: `Top ${meta.creatorLabel.toLowerCase()}`,
      value: insights.topCreators[0]?.name || "—",
      detail:
        insights.topCreators[0]
          ? `${insights.topCreators[0].count} logged ${meta.singular}${insights.topCreators[0].count === 1 ? "" : "s"} from this ${meta.creatorLabel.toLowerCase().slice(0, -1)}.`
          : `No ${meta.creatorLabel.toLowerCase()} data available yet.`,
    },
  ];
}

function toDraftMountRushmore(items: MountRushmoreMovie[]): MountRushmoreDraft[] {
  return items.map((item) => ({
    title: item.title || "",
    year: item.year ? String(item.year) : "",
    subtitle: item.subtitle || "",
    poster: item.poster || "",
  }));
}

function toSavedMountRushmore(items: MountRushmoreDraft[]): MountRushmoreMovie[] {
  return items.map((item) => ({
    title: item.title.trim(),
    year: item.year.trim() ? Number(item.year.trim()) || null : null,
    subtitle: item.subtitle.trim() || null,
    poster: item.poster.trim() || null,
  }));
}

export default function ProfilePage() {
  const { profile, displayName, saveProfileDetails } = useAuth();
  const [diaryEntries, setDiaryEntries] = useState<DiaryMovie[]>([]);
  const [tab, setTab] = useState<ProfileTab>("movie");
  const [bio, setBio] = useState(profile?.bio || "");
  const [favouriteFilm, setFavouriteFilm] = useState(profile?.favouriteFilm || "");
  const [favouriteSeries, setFavouriteSeries] = useState(
    profile?.favouriteSeries || ""
  );
  const [favouriteBook, setFavouriteBook] = useState(profile?.favouriteBook || "");
  const [mountRushmore, setMountRushmore] = useState<MountRushmoreDraft[]>(
    toDraftMountRushmore(profile?.movieMountRushmore || getEmptyMountRushmore())
  );
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);

  const handle = getProfileHandle(profile);
  const identityLabel = displayName || handle || "ReelShelf Profile";
  const identityInitials = getProfileInitials(profile);

  useEffect(() => {
    setBio(profile?.bio || "");
    setFavouriteFilm(profile?.favouriteFilm || "");
    setFavouriteSeries(profile?.favouriteSeries || "");
    setFavouriteBook(profile?.favouriteBook || "");
    setMountRushmore(
      toDraftMountRushmore(profile?.movieMountRushmore || getEmptyMountRushmore())
    );
  }, [
    profile?.bio,
    profile?.favouriteBook,
    profile?.favouriteFilm,
    profile?.favouriteSeries,
    profile?.movieMountRushmore,
  ]);

  useEffect(() => {
    setDiaryEntries(getDiaryMovies());
    return subscribeToDiary(() => setDiaryEntries(getDiaryMovies()));
  }, []);

  const entriesByType = useMemo(() => {
    return {
      movie: diaryEntries.filter((entry) => entry.mediaType === "movie"),
      tv: diaryEntries.filter((entry) => entry.mediaType === "tv"),
      book: diaryEntries.filter((entry) => entry.mediaType === "book"),
    };
  }, [diaryEntries]);

  const currentEntries = entriesByType[tab];
  const meta = getTabMeta(tab);
  const insights = getInsightDetails(currentEntries);
  const insightStats = getInsightStats(currentEntries, meta, insights);

  const recentFavourites = useMemo(() => {
    return [...diaryEntries]
      .filter((entry) => entry.favourite)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, 4);
  }, [diaryEntries]);

  const recentActivity = useMemo(() => {
    return [...diaryEntries]
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, 5);
  }, [diaryEntries]);

  const overallRatedEntries = useMemo(
    () => diaryEntries.filter((entry) => typeof entry.rating === "number"),
    [diaryEntries]
  );

  const overallAverageRating = useMemo(() => {
    if (overallRatedEntries.length === 0) {
      return "—";
    }

    const average =
      overallRatedEntries.reduce((sum, entry) => sum + (entry.rating || 0), 0) /
      overallRatedEntries.length;

    return average.toFixed(1);
  }, [overallRatedEntries]);

  const overallFavouriteCount = useMemo(
    () => diaryEntries.filter((entry) => entry.favourite).length,
    [diaryEntries]
  );

  const completedRushmoreCount = useMemo(() => {
    return mountRushmore.filter((entry) => entry.title.trim()).length;
  }, [mountRushmore]);

  async function handleSaveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDetails(true);
    setDetailsMessage(null);

    const error = await saveProfileDetails({
      bio,
      favouriteFilm,
      favouriteSeries,
      favouriteBook,
      movieMountRushmore: toSavedMountRushmore(mountRushmore),
    });

    setSavingDetails(false);
    setDetailsMessage(error || "Profile details saved.");
  }

  return (
    <main style={{ padding: "12px 0 72px" }}>
      <style>{`
        .profile-shell {
          max-width: 1160px;
          margin: 0 auto;
          display: grid;
          gap: 22px;
        }

        .profile-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
          gap: 24px;
          align-items: start;
        }

        .profile-manage-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.06fr) minmax(280px, 0.94fr);
          gap: 20px;
          align-items: start;
        }

        .profile-overview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .profile-editor-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .profile-private-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.92fr);
          gap: 20px;
        }

        .profile-panel-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .profile-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .mount-rushmore-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        @media (min-width: 980px) {
          .mount-rushmore-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .profile-hero,
          .profile-manage-layout,
          .profile-private-grid,
          .profile-panel-grid,
          .profile-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .profile-overview-grid,
          .profile-editor-grid,
          .mount-rushmore-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="profile-shell">
        <section
          style={{
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 24%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.32)",
            padding: "clamp(20px, 4vw, 28px)",
          }}
        >
          <div className="profile-hero">
            <div style={{ display: "grid", gap: 18 }}>
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <IdentityAvatar
                  avatarUrl={profile?.avatarUrl ?? null}
                  label={identityLabel}
                  initials={identityInitials}
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <SectionLabel>Private Profile Management</SectionLabel>
                  <h1
                    style={{
                      margin: "8px 0 0",
                      fontSize: "clamp(34px, 6vw, 54px)",
                      lineHeight: 0.96,
                      letterSpacing: "-2px",
                      fontWeight: 600,
                    }}
                  >
                    {identityLabel}
                  </h1>
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "#9ca3af",
                      fontSize: 15,
                      lineHeight: 1.7,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {handle || "Build the private details behind your public shelf."}
                  </p>
                </div>
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#d4d4d8",
                  fontSize: 16,
                  lineHeight: 1.75,
                  maxWidth: 680,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                This page is your control room. Shape your bio, favourites, and
                Movie Mount Rushmore here, then let your public profile carry the
                showcase presentation.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {profile?.username ? (
                  <LinkPill href={getPublicProfileHref(profile.username)}>
                    View Public Profile
                  </LinkPill>
                ) : null}
                <LinkPill href="/import/letterboxd" tone="ghost">
                  Import from Letterboxd
                </LinkPill>
              </div>
            </div>

            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
                padding: 22,
                display: "grid",
                gap: 14,
              }}
            >
              <div>
                <SectionLabel>Profile Snapshot</SectionLabel>
                <h2
                  style={{
                    margin: "8px 0 0",
                    fontSize: 24,
                    lineHeight: 1.06,
                    letterSpacing: "-0.8px",
                    fontWeight: 600,
                  }}
                >
                  What your shelf is signalling right now.
                </h2>
              </div>

              <div className="profile-overview-grid">
                <StatCard
                  label="Logged"
                  value={diaryEntries.length}
                  detail="Across films, series, and books."
                />
                <StatCard
                  label="Average"
                  value={overallAverageRating}
                  detail={`From ${overallRatedEntries.length} rated entries.`}
                />
                <StatCard
                  label="Rushmore"
                  value={completedRushmoreCount}
                  detail="Defining films currently filled in."
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  padding: "16px 18px",
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#7f7f7f",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Current identity picks
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "white",
                    fontSize: 14,
                    lineHeight: 1.65,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Film: {favouriteFilm || "Not set yet"}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "white",
                    fontSize: 14,
                    lineHeight: 1.65,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Series: {favouriteSeries || "Not set yet"}
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "white",
                    fontSize: 14,
                    lineHeight: 1.65,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Book: {favouriteBook || "Not set yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            padding: "clamp(20px, 4vw, 24px)",
          }}
        >
          <div className="profile-manage-layout">
            <form
              onSubmit={handleSaveDetails}
              style={{ display: "grid", gap: 18, minWidth: 0 }}
            >
              <div>
                <SectionLabel>Profile Details</SectionLabel>
                <h2
                  style={{
                    margin: "8px 0 0",
                    fontSize: "clamp(28px, 4vw, 38px)",
                    lineHeight: 1,
                    letterSpacing: "-1px",
                    fontWeight: 600,
                  }}
                >
                  Edit the details behind your shelf.
                </h2>
              </div>

              <label style={{ display: "grid", gap: 10 }}>
                <span
                  style={{
                    color: "#d1d5db",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Bio
                </span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Write a short note about your taste, obsessions, or the mood of your shelf."
                  rows={5}
                  style={{
                    width: "100%",
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.035)",
                    color: "white",
                    padding: "14px 16px",
                    fontSize: 15,
                    lineHeight: 1.6,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "Arial, sans-serif",
                  }}
                />
              </label>

              <div className="profile-editor-grid">
                <FavouriteField
                  label="Favourite Film"
                  value={favouriteFilm}
                  placeholder="In the Mood for Love"
                  onChange={setFavouriteFilm}
                />
                <FavouriteField
                  label="Favourite Series"
                  value={favouriteSeries}
                  placeholder="The Sopranos"
                  onChange={setFavouriteSeries}
                />
                <FavouriteField
                  label="Favourite Book"
                  value={favouriteBook}
                  placeholder="The Secret History"
                  onChange={setFavouriteBook}
                />
              </div>

              {detailsMessage ? (
                <p
                  style={{
                    margin: 0,
                    color:
                      detailsMessage === "Profile details saved."
                        ? "#c7c7c7"
                        : "#fca5a5",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {detailsMessage}
                </p>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  type="submit"
                  disabled={savingDetails}
                  style={{
                    height: 46,
                    borderRadius: 999,
                    border: "none",
                    background: "white",
                    color: "black",
                    padding: "0 18px",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "Arial, sans-serif",
                    cursor: savingDetails ? "wait" : "pointer",
                    opacity: savingDetails ? 0.7 : 1,
                  }}
                >
                  {savingDetails ? "Saving..." : "Save Profile"}
                </button>

                <LinkPill href="/import/letterboxd" tone="ghost">
                  Import from Letterboxd
                </LinkPill>
              </div>
            </form>

            <div
              style={{
                display: "grid",
                gap: 16,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                  padding: 18,
                  display: "grid",
                  gap: 12,
                }}
              >
                <SectionLabel>Manage Better</SectionLabel>
                <h3
                  style={{
                    margin: "8px 0 0",
                    fontSize: 22,
                    lineHeight: 1.08,
                    letterSpacing: "-0.7px",
                    fontWeight: 600,
                  }}
                >
                  Keep the public profile polished without editing it here.
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#9ca3af",
                    fontSize: 14,
                    lineHeight: 1.7,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Set your identity details once, then let public profile pages
                  handle the premium presentation of favourites, activity, and
                  taste.
                </p>
              </div>

              <div
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                  padding: 18,
                  display: "grid",
                  gap: 12,
                }}
              >
                <SectionLabel>Useful Snapshot</SectionLabel>
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "white",
                      fontSize: 14,
                      lineHeight: 1.65,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {overallFavouriteCount} favourite
                    {overallFavouriteCount === 1 ? "" : "s"} currently shaping
                    your shelf.
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "white",
                      fontSize: 14,
                      lineHeight: 1.65,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {recentActivity.length > 0
                      ? `Most recent log: ${recentActivity[0].title}`
                      : "No diary activity yet."}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "white",
                      fontSize: 14,
                      lineHeight: 1.65,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {completedRushmoreCount === 4
                      ? "Your Mount Rushmore is complete."
                      : `${4 - completedRushmoreCount} Mount Rushmore slot${4 - completedRushmoreCount === 1 ? "" : "s"} still open.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)",
            padding: "clamp(20px, 4vw, 24px)",
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <div>
              <SectionLabel>Movie Mount Rushmore</SectionLabel>
              <h2
                style={{
                  margin: "8px 0 0",
                  fontSize: "clamp(28px, 4vw, 38px)",
                  lineHeight: 1,
                  letterSpacing: "-1px",
                  fontWeight: 600,
                }}
              >
                Curate the four films that define your public taste.
              </h2>
            </div>
            <p
              style={{
                margin: 0,
                maxWidth: 460,
                color: "#9ca3af",
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Fill these out like a proper editor, not placeholder tiles. Titles,
              year, subtitle, and poster are all saved to your profile.
            </p>
          </div>

          <div className="mount-rushmore-grid">
            {mountRushmore.map((item, index) => (
              <article
                key={`rushmore-${index}`}
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
                  padding: 16,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "2 / 3",
                    borderRadius: 16,
                    overflow: "hidden",
                    background:
                      "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                  }}
                >
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title || `Rushmore pick ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        textAlign: "center",
                        padding: 18,
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 13,
                        lineHeight: 1.6,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Add a poster URL to preview this pick.
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#7f7f7f",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Pick {index + 1}
                  </p>
                  <h3
                    style={{
                      margin: "8px 0 0",
                      fontSize: 20,
                      lineHeight: 1.12,
                      letterSpacing: "-0.5px",
                      fontWeight: 600,
                    }}
                  >
                    {item.title || "Untitled film"}
                  </h3>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "#9ca3af",
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {item.year || "Year"}
                    {item.subtitle ? ` · ${item.subtitle}` : ""}
                  </p>
                </div>

                <input
                  value={item.title}
                  onChange={(event) => {
                    const next = [...mountRushmore];
                    next[index] = { ...item, title: event.target.value };
                    setMountRushmore(next);
                  }}
                  placeholder="Film title"
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.035)",
                    color: "white",
                    padding: "0 12px",
                    fontSize: 14,
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "96px minmax(0, 1fr)",
                    gap: 10,
                  }}
                >
                  <input
                    value={item.year}
                    onChange={(event) => {
                      const next = [...mountRushmore];
                      next[index] = {
                        ...item,
                        year: event.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                      };
                      setMountRushmore(next);
                    }}
                    placeholder="Year"
                    inputMode="numeric"
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.035)",
                      color: "white",
                      padding: "0 12px",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />

                  <input
                    value={item.subtitle}
                    onChange={(event) => {
                      const next = [...mountRushmore];
                      next[index] = { ...item, subtitle: event.target.value };
                      setMountRushmore(next);
                    }}
                    placeholder="Optional subtitle"
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.035)",
                      color: "white",
                      padding: "0 12px",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                <input
                  value={item.poster}
                  onChange={(event) => {
                    const next = [...mountRushmore];
                    next[index] = { ...item, poster: event.target.value };
                    setMountRushmore(next);
                  }}
                  placeholder="Poster image URL"
                  style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.035)",
                    color: "white",
                    padding: "0 12px",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </article>
            ))}
          </div>
        </section>

        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)",
            padding: "clamp(20px, 4vw, 24px)",
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <div>
              <SectionLabel>Recent Activity and Favourites</SectionLabel>
              <h2
                style={{
                  margin: "8px 0 0",
                  fontSize: "clamp(28px, 4vw, 38px)",
                  lineHeight: 1,
                  letterSpacing: "-1px",
                  fontWeight: 600,
                }}
              >
                Keep an eye on the shelf you’re shaping.
              </h2>
            </div>
            <p
              style={{
                margin: 0,
                maxWidth: 420,
                color: "#9ca3af",
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Useful private context stays here, while the public profile gets the
              polished showcase treatment.
            </p>
          </div>

          {diaryEntries.length === 0 ? (
            <div
              style={{
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.025)",
                padding: "22px 20px",
                display: "grid",
                gap: 14,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#d4d4d8",
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Start logging titles and this area will fill with recent activity,
                favourites, and taste patterns.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <LinkPill href="/movies">Browse films</LinkPill>
                <LinkPill href="/series" tone="ghost">
                  Browse series
                </LinkPill>
                <LinkPill href="/books" tone="ghost">
                  Browse books
                </LinkPill>
              </div>
            </div>
          ) : (
            <div className="profile-private-grid">
              <div
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                  padding: 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <SectionLabel>Recent Activity</SectionLabel>
                  <h3
                    style={{
                      margin: "8px 0 0",
                      fontSize: 24,
                      lineHeight: 1.06,
                      letterSpacing: "-0.6px",
                      fontWeight: 600,
                    }}
                  >
                    Latest diary entries
                  </h3>
                </div>

                {recentActivity.map((entry, index) => (
                  <Link
                    key={`${entry.mediaType}:${entry.id}:${entry.savedAt}`}
                    href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "72px minmax(0, 1fr) auto",
                      gap: 14,
                      alignItems: "center",
                      textDecoration: "none",
                      color: "inherit",
                      paddingTop: index === 0 ? 0 : 14,
                      borderTop:
                        index === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        aspectRatio: "2 / 3",
                        borderRadius: 14,
                        overflow: "hidden",
                        background:
                          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                      }}
                    >
                      {entry.poster ? (
                        <img
                          src={entry.poster}
                          alt={entry.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          color: "white",
                          fontSize: 15,
                          lineHeight: 1.45,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {entry.title}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "#8f8f8f",
                          fontSize: 12,
                          lineHeight: 1.6,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {formatLoggedDate(entry.savedAt)}
                        {entry.director ? ` · ${entry.director}` : ""}
                      </p>
                    </div>

                    <div
                      style={{
                        flexShrink: 0,
                        color: "white",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {entry.rating !== null ? `${entry.rating.toFixed(1)} ★` : "—"}
                    </div>
                  </Link>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                  padding: 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <SectionLabel>Recent Favourites</SectionLabel>
                  <h3
                    style={{
                      margin: "8px 0 0",
                      fontSize: 24,
                      lineHeight: 1.06,
                      letterSpacing: "-0.6px",
                      fontWeight: 600,
                    }}
                  >
                    Shelf-defining picks
                  </h3>
                </div>

                {recentFavourites.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      color: "#a1a1aa",
                      fontSize: 15,
                      lineHeight: 1.7,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Mark diary entries as favourites and they’ll surface here.
                  </p>
                ) : (
                  recentFavourites.map((entry) => (
                    <Link
                      key={`${entry.mediaType}:${entry.id}:fav`}
                      href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "84px minmax(0, 1fr)",
                        gap: 14,
                        alignItems: "center",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          aspectRatio: "2 / 3",
                          borderRadius: 14,
                          overflow: "hidden",
                          background:
                            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                        }}
                      >
                        {entry.poster ? (
                          <img
                            src={entry.poster}
                            alt={entry.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            color: "white",
                            fontSize: 15,
                            lineHeight: 1.45,
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          {entry.title}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#8f8f8f",
                            fontSize: 12,
                            lineHeight: 1.6,
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          {entry.year || "—"} ·{" "}
                          {entry.mediaType === "movie"
                            ? "Film"
                            : entry.mediaType === "tv"
                              ? "Series"
                              : "Book"}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            padding: "clamp(20px, 4vw, 24px)",
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <div>
              <SectionLabel>Stats and Taste Insights</SectionLabel>
              <h2
                style={{
                  margin: "8px 0 0",
                  fontSize: "clamp(28px, 4vw, 42px)",
                  lineHeight: 1,
                  letterSpacing: "-1.2px",
                  fontWeight: 600,
                }}
              >
                Your private taste dashboard.
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <TabButton active={tab === "movie"} label="Films" onClick={() => setTab("movie")} />
              <TabButton active={tab === "tv"} label="Series" onClick={() => setTab("tv")} />
              <TabButton active={tab === "book"} label="Books" onClick={() => setTab("book")} />
            </div>
          </div>

          <section className="profile-stat-grid">
            {insightStats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
              />
            ))}
          </section>

          <section className="profile-panel-grid">
            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
                padding: 24,
              }}
            >
              <SectionLabel>Patterns</SectionLabel>
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.8px",
                }}
              >
                What defines your {meta.label.toLowerCase()} taste
              </h2>

              {currentEntries.length === 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#9ca3af",
                      fontSize: 14,
                      lineHeight: 1.7,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {meta.emptyBody}
                  </p>
                  <div>
                    <LinkPill href={meta.ctaHref}>{meta.ctaLabel}</LinkPill>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.025)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "white",
                        fontSize: 14,
                        lineHeight: 1.7,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {insights.ratedEntries.length} rated {meta.label.toLowerCase()} ·{" "}
                      {insights.reviewedCount} review
                      {insights.reviewedCount === 1 ? "" : "s"} ·{" "}
                      {insights.favouriteCount} favourite
                      {insights.favouriteCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.025)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "white",
                        fontSize: 14,
                        lineHeight: 1.7,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Highest rated:{" "}
                      {insights.highestRated && typeof insights.highestRated.rating === "number"
                        ? `${insights.highestRated.title} (${insights.highestRated.rating.toFixed(1)} ★)`
                        : "—"}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.025)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "white",
                        fontSize: 14,
                        lineHeight: 1.7,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Latest log:{" "}
                      {insights.latestLogged
                        ? `${insights.latestLogged.title} · ${formatLoggedDate(insights.latestLogged.savedAt)}`
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
                padding: 24,
                display: "grid",
                gap: 18,
              }}
            >
              <SectionLabel>{meta.creatorLabel} and Genres</SectionLabel>
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.8px",
                }}
              >
                The patterns inside your diary.
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                {insights.topCreators.length > 0 ? (
                  insights.topCreators.slice(0, 3).map((creator, index) => (
                    <div
                      key={creator.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background:
                          index === 0
                            ? "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.035) 100%)"
                            : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: "#7f7f7f",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          {index === 0 ? "Most logged" : `#${index + 1}`}
                        </p>
                        <h3
                          style={{
                            margin: "6px 0 0",
                            fontSize: 18,
                            fontWeight: 600,
                            letterSpacing: "-0.4px",
                          }}
                        >
                          {creator.name}
                        </h3>
                      </div>

                      <div
                        style={{
                          minWidth: 52,
                          height: 36,
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                          display: "grid",
                          placeItems: "center",
                          color: "white",
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {creator.count}
                      </div>
                    </div>
                  ))
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "#9ca3af",
                      fontSize: 14,
                      lineHeight: 1.7,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    No {meta.creatorLabel.toLowerCase()} data available yet.
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {insights.topGenres.length > 0 ? (
                  insights.topGenres.map((genre) => (
                    <span
                      key={genre}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 34,
                        padding: "0 13px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.025)",
                        color: "white",
                        fontSize: 12,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {genre}
                    </span>
                  ))
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "#8f8f8f",
                      fontSize: 14,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    No genre data yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        </section>

        <GamificationWidgets variant="profile" />
      </div>
    </main>
  );
}
