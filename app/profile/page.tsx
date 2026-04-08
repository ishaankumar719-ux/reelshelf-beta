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

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "highlight";
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 34,
        padding: "7px 13px",
        borderRadius: 999,
        border:
          tone === "highlight"
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(255,255,255,0.08)",
        background:
          tone === "highlight"
            ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)"
            : "rgba(255,255,255,0.03)",
        color: "white",
        fontSize: 12,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {children}
    </span>
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
        width: 112,
        height: 112,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.09), transparent 60%), linear-gradient(180deg, #161616 0%, #090909 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 48px rgba(0,0,0,0.3)",
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
            fontSize: 32,
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

function LinkPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 40,
        padding: "0 16px",
        borderRadius: 999,
        background: "white",
        color: "black",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {children}
    </Link>
  );
}

function GhostLinkPill({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 40,
        padding: "0 16px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        color: "white",
        textDecoration: "none",
        fontSize: 13,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {children}
    </Link>
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

function StatLine({
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
          fontSize: 32,
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

function getTabMeta(tab: ProfileTab) {
  if (tab === "movie") {
    return {
      label: "Films",
      singular: "film",
      creatorLabel: "Directors",
      emptyLabel: "No film insights yet",
      emptyBody: "Log films in your diary to bring your cinematic taste into focus.",
    };
  }

  if (tab === "tv") {
    return {
      label: "Series",
      singular: "series",
      creatorLabel: "Creators",
      emptyLabel: "No series insights yet",
      emptyBody: "Start logging series to build a sharper TV identity.",
    };
  }

  return {
    label: "Books",
    singular: "book",
    creatorLabel: "Authors",
    emptyLabel: "No book insights yet",
    emptyBody: "Log books to turn this page into a real reading portrait.",
  };
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
    .slice(0, 4)
    .map(([name, count]) => `${name} · ${count}`);
}

function getRecentEntries(entries: DiaryMovie[]) {
  return [...entries]
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    .slice(0, 4);
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

  const recentFavourites = useMemo(() => {
    return [...diaryEntries]
      .filter((entry) => entry.favourite)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, 6);
  }, [diaryEntries]);

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
    <main style={{ padding: "10px 0 72px" }}>
      <style>{`
        .profile-page-grid {
          display: grid;
          gap: 24px;
        }

        .profile-hero-shell {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
          gap: 22px;
        }

        .profile-identity-row {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .profile-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .rushmore-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .profile-favourites-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .profile-taste-shell {
          display: grid;
          grid-template-columns: minmax(300px, 0.88fr) minmax(0, 1.12fr);
          gap: 24px;
          align-items: start;
        }

        .taste-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        @media (min-width: 980px) {
          .rushmore-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .profile-hero-shell,
          .profile-taste-shell,
          .profile-favourites-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .profile-detail-grid,
          .taste-stat-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <form
        onSubmit={handleSaveDetails}
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <section
          style={{
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 24%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.32)",
            padding: "24px 24px 26px",
          }}
        >
          <div className="profile-hero-shell">
            <div style={{ display: "grid", gap: 20 }}>
              <div className="profile-identity-row">
                <IdentityAvatar
                  avatarUrl={profile?.avatarUrl ?? null}
                  label={identityLabel}
                  initials={identityInitials}
                />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <SectionLabel>Profile Hero</SectionLabel>
                  <h1
                    style={{
                      margin: "8px 0 0",
                      fontSize: "clamp(38px, 6vw, 64px)",
                      lineHeight: 0.96,
                      letterSpacing: "-2.2px",
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
                    {handle || "Pick a public-facing identity for your shelf."}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 18,
                    }}
                  >
                    {profile?.username ? (
                      <LinkPill href={getPublicProfileHref(profile.username)}>
                        View Public Profile
                      </LinkPill>
                    ) : null}
                    <GhostLinkPill href="/import/letterboxd">
                      Import from Letterboxd
                    </GhostLinkPill>
                  </div>
                </div>
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
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.035)",
                    color: "white",
                    padding: "16px 16px",
                    fontSize: 15,
                    lineHeight: 1.7,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "Arial, sans-serif",
                  }}
                />
              </label>
            </div>

            <div
              style={{
                borderRadius: 26,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.025) 100%)",
                padding: 20,
                display: "grid",
                gap: 16,
                alignContent: "start",
              }}
            >
              <SectionLabel>Shelf Details</SectionLabel>

              <div className="profile-detail-grid">
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

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {favouriteFilm ? <Pill tone="highlight">{favouriteFilm}</Pill> : null}
                {favouriteSeries ? <Pill>{favouriteSeries}</Pill> : null}
                {favouriteBook ? <Pill>{favouriteBook}</Pill> : null}
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

              <button
                type="submit"
                disabled={savingDetails}
                style={{
                  height: 46,
                  borderRadius: 999,
                  border: "none",
                  background: "white",
                  color: "black",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "Arial, sans-serif",
                  cursor: savingDetails ? "wait" : "pointer",
                  opacity: savingDetails ? 0.7 : 1,
                }}
              >
                {savingDetails ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            padding: "22px 22px 24px",
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
              <SectionLabel>Movie Mount Rushmore</SectionLabel>
              <h2
                style={{
                  margin: "8px 0 0",
                  fontSize: "clamp(28px, 4vw, 42px)",
                  lineHeight: 1,
                  letterSpacing: "-1.2px",
                  fontWeight: 600,
                }}
              >
                The four films that define your shelf.
              </h2>
            </div>

            <p
              style={{
                margin: 0,
                maxWidth: 360,
                color: "#9ca3af",
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Curate a deliberate top four. Add poster URLs plus a short subtitle to
              make the page feel ready for sharing.
            </p>
          </div>

          <div className="rushmore-grid">
            {mountRushmore.map((item, index) => (
              <article
                key={`rushmore-${index}`}
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "2 / 3",
                    background:
                      "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                  }}
                >
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title || `Mount Rushmore pick ${index + 1}`}
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
                        padding: 20,
                        textAlign: "center",
                        color: "rgba(255,255,255,0.72)",
                        fontSize: 16,
                        lineHeight: 1.5,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Pick {index + 1}
                    </div>
                  )}

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.28) 36%, rgba(0,0,0,0.02) 68%, rgba(0,0,0,0.02) 100%)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      right: 14,
                      bottom: 14,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 18,
                        lineHeight: 1.08,
                        letterSpacing: "-0.5px",
                        fontWeight: 600,
                      }}
                    >
                      {item.title || "Untitled pick"}
                    </h3>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "rgba(255,255,255,0.78)",
                        fontSize: 12,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {item.year || "Year"}{item.subtitle ? ` · ${item.subtitle}` : ""}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    display: "grid",
                    gap: 10,
                  }}
                >
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

                  <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 10 }}>
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
                </div>
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
            padding: "22px 22px 24px",
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
              <SectionLabel>Recent Favourites</SectionLabel>
              <h2
                style={{
                  margin: "8px 0 0",
                  fontSize: "clamp(28px, 4vw, 40px)",
                  lineHeight: 1,
                  letterSpacing: "-1.2px",
                  fontWeight: 600,
                }}
              >
                The titles you keep returning to.
              </h2>
            </div>
            <p
              style={{
                margin: 0,
                maxWidth: 360,
                color: "#9ca3af",
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Pulled from favourite diary entries across films, series, and books.
            </p>
          </div>

          {recentFavourites.length === 0 ? (
            <div
              style={{
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.025)",
                padding: "24px 22px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#a1a1aa",
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Mark diary entries as favourites and this section will turn into a
                richer snapshot of your current obsessions.
              </p>
            </div>
          ) : (
            <div className="profile-favourites-grid">
              {recentFavourites.map((entry) => (
                <Link
                  key={`${entry.mediaType}:${entry.id}`}
                  href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <article
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                      overflow: "hidden",
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        aspectRatio: "2 / 3",
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
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.24) 44%, rgba(0,0,0,0.02) 70%, rgba(0,0,0,0.02) 100%)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: 12,
                          right: 12,
                          bottom: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "end",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 18,
                              lineHeight: 1.08,
                              letterSpacing: "-0.4px",
                              fontWeight: 600,
                            }}
                          >
                            {entry.title}
                          </h3>
                          <p
                            style={{
                              margin: "6px 0 0",
                              color: "rgba(255,255,255,0.74)",
                              fontSize: 12,
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            {entry.year || "—"} · {entry.mediaType === "movie" ? "Film" : entry.mediaType === "tv" ? "Series" : "Book"}
                          </p>
                        </div>

                        {entry.rating !== null ? (
                          <span
                            style={{
                              flexShrink: 0,
                              color: "white",
                              fontSize: 14,
                              fontWeight: 600,
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            {entry.rating.toFixed(1)} ★
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="profile-taste-shell">
          <div style={{ display: "grid", gap: 24 }}>
            <GamificationWidgets variant="profile" />
          </div>

          <div
            style={{
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
              padding: "22px 22px 24px",
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
                <SectionLabel>Stats and Taste DNA</SectionLabel>
                <h2
                  style={{
                    margin: "8px 0 0",
                    fontSize: "clamp(28px, 4vw, 42px)",
                    lineHeight: 1,
                    letterSpacing: "-1.2px",
                    fontWeight: 600,
                  }}
                >
                  A sharper read on how your taste is evolving.
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

            {currentEntries.length === 0 ? (
              <div
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                  padding: "24px 22px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#a1a1aa",
                    fontSize: 15,
                    lineHeight: 1.7,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <strong style={{ color: "white" }}>{meta.emptyLabel}.</strong>{" "}
                  {meta.emptyBody}
                </p>
              </div>
            ) : (
              <>
                <div className="taste-stat-grid">
                  <StatLine
                    label={`${meta.label} logged`}
                    value={currentEntries.length}
                    detail={`${insights.reviewedCount} review${insights.reviewedCount === 1 ? "" : "s"} written in this lane.`}
                  />
                  <StatLine
                    label="Average rating"
                    value={formatAverageRating(currentEntries)}
                    detail={`Calculated from ${insights.ratedEntries.length} rated ${meta.label.toLowerCase()}.`}
                  />
                  <StatLine
                    label="Favourites"
                    value={insights.favouriteCount}
                    detail={`${insights.favouriteCount} ${meta.singular}${insights.favouriteCount === 1 ? "" : "s"} currently marked as a favourite.`}
                  />
                  <StatLine
                    label={`Top ${meta.creatorLabel.toLowerCase()}`}
                    value={insights.topCreators[0]?.name || "—"}
                    detail={
                      insights.topCreators[0]
                        ? `${insights.topCreators[0].count} logged ${meta.singular}${insights.topCreators[0].count === 1 ? "" : "s"} from this ${meta.creatorLabel.toLowerCase().slice(0, -1)}.`
                        : `No ${meta.creatorLabel.toLowerCase()} data yet.`
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  <div
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
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
                      Highest Rated
                    </p>
                    <h3
                      style={{
                        margin: "10px 0 0",
                        fontSize: 24,
                        letterSpacing: "-0.8px",
                        fontWeight: 600,
                      }}
                    >
                      {insights.highestRated?.title || "—"}
                    </h3>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#c7c7c7",
                        fontSize: 14,
                        lineHeight: 1.65,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {insights.highestRated?.rating !== null &&
                      insights.highestRated?.rating !== undefined
                        ? `${insights.highestRated.rating.toFixed(1)} ★`
                        : "No rating yet"}
                      {insights.highestRated?.year ? ` · ${insights.highestRated.year}` : ""}
                    </p>
                  </div>

                  <div
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
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
                      Latest Logged
                    </p>
                    <h3
                      style={{
                        margin: "10px 0 0",
                        fontSize: 24,
                        letterSpacing: "-0.8px",
                        fontWeight: 600,
                      }}
                    >
                      {insights.latestLogged?.title || "—"}
                    </h3>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#c7c7c7",
                        fontSize: 14,
                        lineHeight: 1.65,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {insights.latestLogged
                        ? formatLoggedDate(insights.latestLogged.savedAt)
                        : "No logs yet"}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  <div
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
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
                      Top {meta.creatorLabel}
                    </p>
                    <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                      {insights.topCreators.length > 0 ? (
                        insights.topCreators.map((creator) => (
                          <div
                            key={creator.name}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              color: "#d1d5db",
                              fontSize: 14,
                              fontFamily: "Arial, sans-serif",
                            }}
                          >
                            <span>{creator.name}</span>
                            <span style={{ color: "#8f8f8f" }}>{creator.count}</span>
                          </div>
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
                          No creator data yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
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
                      Dominant Genres
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      {insights.topGenres.length > 0 ? (
                        insights.topGenres.map((genre) => <Pill key={genre}>{genre}</Pill>)
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
                </div>

                <div
                  style={{
                    borderRadius: 22,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    padding: "18px 18px 16px",
                    display: "grid",
                    gap: 12,
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
                    Recent {meta.label}
                  </p>

                  {getRecentEntries(currentEntries).map((entry) => (
                    <Link
                      key={`${entry.mediaType}:${entry.id}`}
                      href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        textDecoration: "none",
                        color: "inherit",
                        padding: "10px 0",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
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
              </>
            )}
          </div>
        </section>
      </form>
    </main>
  );
}
