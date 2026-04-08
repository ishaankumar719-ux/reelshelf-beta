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
import { getProfileHandle, getProfileInitials } from "../../lib/profile";

type ProfileTab = "movie" | "tv" | "book";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 10px",
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
        minHeight: 36,
        padding: "8px 14px",
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
        fontSize: 13,
        fontFamily: "Arial, sans-serif",
        letterSpacing: "-0.1px",
      }}
    >
      {children}
    </span>
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
        padding: "20px 20px 18px",
        borderRadius: 22,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 14px 34px rgba(0,0,0,0.14)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#8f8f8f",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {label}
      </p>

      <h3
        style={{
          margin: "10px 0 0",
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-1px",
        }}
      >
        {value}
      </h3>

      <p
        style={{
          margin: "8px 0 0",
          color: "#9ca3af",
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {detail}
      </p>
    </div>
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
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "Arial, sans-serif",
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

function ProfileIdentityField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        padding: "14px 16px",
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
        {label}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          color: "white",
          fontSize: 16,
          lineHeight: 1.4,
          letterSpacing: "-0.2px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {value}
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

function getInsightDetails(entries: DiaryMovie[], meta: ReturnType<typeof getTabMeta>) {
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
    stats: [
      {
        label: `${meta.label} logged`,
        value: entries.length,
        detail:
          entries.length === 0
            ? `No ${meta.label.toLowerCase()} logged yet.`
            : `${reviewedCount} review${reviewedCount === 1 ? "" : "s"} written across your ${meta.label.toLowerCase()} diary.`,
      },
      {
        label: "Average rating",
        value: formatAverageRating(entries),
        detail:
          ratedEntries.length === 0
            ? `Rate ${meta.label.toLowerCase()} entries to surface an average.`
            : `Calculated from ${ratedEntries.length} rated ${meta.label.toLowerCase()}.`,
      },
      {
        label: "Favourites",
        value: favouriteCount,
        detail:
          favouriteCount === 0
            ? `No favourite ${meta.singular} marked yet.`
            : `${favouriteCount} ${meta.singular}${favouriteCount === 1 ? "" : "s"} marked as a favourite.`,
      },
      {
        label: `Top ${meta.creatorLabel.toLowerCase()}`,
        value: topCreators[0]?.name || "—",
        detail:
          topCreators[0]
            ? `${topCreators[0].count} logged ${meta.singular}${topCreators[0].count === 1 ? "" : "s"} from this ${meta.creatorLabel.toLowerCase().slice(0, -1)}.`
            : `No ${meta.creatorLabel.toLowerCase()} data available yet.`,
      },
    ],
  };
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
  }, [
    profile?.bio,
    profile?.favouriteBook,
    profile?.favouriteFilm,
    profile?.favouriteSeries,
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
  const insights = getInsightDetails(currentEntries, meta);

  async function handleSaveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDetails(true);
    setDetailsMessage(null);

    const error = await saveProfileDetails({
      bio,
      favouriteFilm,
      favouriteSeries,
      favouriteBook,
    });

    setSavingDetails(false);
    setDetailsMessage(error || "Profile details saved.");
  }

  if (diaryEntries.length === 0) {
    return (
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "28px 20px 80px",
        }}
      >
        <section
          style={{
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
            padding: "34px 34px 30px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          }}
        >
          <SectionLabel>Profile</SectionLabel>

          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <IdentityAvatar
              avatarUrl={profile?.avatarUrl ?? null}
              label={identityLabel}
              initials={identityInitials}
            />

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 42,
                  lineHeight: 1,
                  letterSpacing: "-1.6px",
                  fontWeight: 600,
                }}
              >
                {identityLabel}
              </h1>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#9ca3af",
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {handle || "Finish your profile identity to prepare for public shelves."}
              </p>
            </div>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 52,
              lineHeight: 1,
              letterSpacing: "-2px",
              fontWeight: 600,
            }}
          >
            No profile data yet
          </h2>

          <p
            style={{
              marginTop: 16,
              color: "#c2c2c2",
              fontSize: 19,
              lineHeight: 1.6,
              maxWidth: 700,
            }}
          >
            Start logging films, series, or books in your diary and ReelShelf
            will build separate insights for each part of your taste.
          </p>

          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <LinkPill href="/movies">Browse films</LinkPill>
            <LinkPill href="/series">Browse series</LinkPill>
            <LinkPill href="/books">Browse books</LinkPill>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "28px 20px 80px",
      }}
    >
      <style>{`
        .profile-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 22px;
          align-items: start;
        }

        .profile-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .profile-panel-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 20px;
          margin-bottom: 22px;
        }

        .profile-recent-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .profile-favourite-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        @media (max-width: 980px) {
          .profile-hero-grid,
          .profile-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .profile-panel-grid,
          .profile-recent-grid {
            grid-template-columns: 1fr;
          }

          .profile-favourite-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .profile-hero-grid,
          .profile-stat-grid {
            grid-template-columns: 1fr;
          }

          .profile-recent-grid {
            gap: 12px;
          }
        }
      `}</style>

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 22%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
          padding: "clamp(20px, 5vw, 34px) clamp(18px, 5vw, 34px) clamp(20px, 5vw, 30px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          marginBottom: 22,
        }}
      >
        <SectionLabel>Profile</SectionLabel>

        <div className="profile-hero-grid">
          <div>
            <div
              style={{
                display: "flex",
                gap: 22,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  position: "relative",
                  padding: 6,
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)",
                }}
              >
                <IdentityAvatar
                  avatarUrl={profile?.avatarUrl ?? null}
                  label={identityLabel}
                  initials={identityInitials}
                />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#9ca3af",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {handle || "ReelShelf member"}
                </p>

                <h1
                  style={{
                    margin: "8px 0 0",
                    fontSize: "clamp(2.4rem, 9vw, 58px)",
                    lineHeight: 0.96,
                    letterSpacing: "-2.4px",
                    fontWeight: 600,
                    maxWidth: 760,
                  }}
                >
                  {identityLabel}
                </h1>

                <p
                  style={{
                    margin: "14px 0 0",
                    color: "#c2c2c2",
                    fontSize: "clamp(14px, 3.8vw, 18px)",
                    lineHeight: 1.65,
                    maxWidth: 720,
                  }}
                >
                  {profile?.bio?.trim()
                    ? profile.bio
                    : "Curate the shelves that define you, shape your public identity, and turn your private taste into something worth sharing."}
                </p>
              </div>
            </div>

            <div className="profile-favourite-grid">
              <ProfileIdentityField
                label="Favourite Film"
                value={profile?.favouriteFilm || "Not set yet"}
              />
              <ProfileIdentityField
                label="Favourite Series"
                value={profile?.favouriteSeries || "Not set yet"}
              />
              <ProfileIdentityField
                label="Favourite Book"
                value={profile?.favouriteBook || "Not set yet"}
              />
            </div>

            <p
              style={{
                margin: "18px 0 0",
                color: "#c2c2c2",
                fontSize: 18,
                lineHeight: 1.55,
                maxWidth: 760,
              }}
            >
              Explore how your diary shifts across films, series, and books, from
              favourites to the creators and authors you keep returning to.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 22,
              }}
            >
              <TabButton active={tab === "movie"} label="Films" onClick={() => setTab("movie")} />
              <TabButton active={tab === "tv"} label="Series" onClick={() => setTab("tv")} />
              <TabButton active={tab === "book"} label="Books" onClick={() => setTab("book")} />
            </div>
          </div>

          <form
            onSubmit={handleSaveDetails}
            style={{
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
              padding: 22,
              display: "grid",
              gap: 14,
            }}
          >
            <SectionLabel>Profile Notes</SectionLabel>
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.8px",
              }}
            >
              Shape your public-facing shelf
            </h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
                padding: "14px 16px",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    color: "white",
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: "-0.2px",
                  }}
                >
                  Import from Letterboxd
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#9ca3af",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Upload your CSV export, preview the mapping, and add past logs to
                  your ReelShelf diary.
                </p>
              </div>

              <Link
                href="/import/letterboxd"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "white",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                  flexShrink: 0,
                }}
              >
                Open Import
              </Link>
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
                placeholder="Write a short note about your taste, obsessions, or the mood of your shelves."
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

            {detailsMessage ? (
              <p
                style={{
                  margin: 0,
                  color: detailsMessage === "Profile details saved." ? "#c7c7c7" : "#fca5a5",
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
                marginTop: 4,
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
              {savingDetails ? "Saving..." : "Save Profile Notes"}
            </button>
          </form>
        </div>
      </section>

      <section className="profile-stat-grid">
        {insights.stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            detail={stat.detail}
          />
        ))}
      </section>

      {currentEntries.length === 0 ? (
        <section
          style={{
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            padding: 24,
          }}
        >
          <SectionLabel>{meta.label}</SectionLabel>
          <h2
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-1px",
            }}
          >
            {meta.emptyLabel}
          </h2>
          <p
            style={{
              margin: "14px 0 0",
              color: "#c2c2c2",
              fontSize: 18,
              lineHeight: 1.6,
              maxWidth: 680,
            }}
          >
            {meta.emptyBody}
          </p>

          <div style={{ marginTop: 20 }}>
            <LinkPill href={meta.ctaHref}>{meta.ctaLabel}</LinkPill>
          </div>
        </section>
      ) : (
        <>
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

              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                <Pill tone="highlight">
                  {insights.ratedEntries.length} rated {meta.label.toLowerCase()}
                </Pill>
                <Pill>
                  {insights.reviewedCount} written review
                  {insights.reviewedCount === 1 ? "" : "s"}
                </Pill>
                <Pill>
                  {insights.favouriteCount} favourite
                  {insights.favouriteCount === 1 ? "" : "s"} marked
                </Pill>
                <Pill>
                  Highest rated:{" "}
                  {insights.highestRated && typeof insights.highestRated.rating === "number"
                    ? `${insights.highestRated.title} (${insights.highestRated.rating.toFixed(1)})`
                    : "—"}
                </Pill>
                <Pill>
                  Latest log:{" "}
                  {insights.latestLogged
                    ? `${insights.latestLogged.title} · ${formatLoggedDate(insights.latestLogged.savedAt)}`
                    : "—"}
                </Pill>
                {insights.topGenres.length > 0 ? (
                  <Pill>Top genres: {insights.topGenres.join(" · ")}</Pill>
                ) : null}
              </div>
            </div>

            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
                padding: 24,
              }}
            >
              <SectionLabel>{meta.creatorLabel}</SectionLabel>
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: 28,
                  fontWeight: 600,
                  letterSpacing: "-0.8px",
                }}
              >
                Names you keep returning to
              </h2>

              {insights.topCreators.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {insights.topCreators.map((creator, index) => (
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
                            lineHeight: 1.2,
                            letterSpacing: "-0.3px",
                            fontWeight: 500,
                          }}
                        >
                          {creator.name}
                        </h3>
                      </div>

                      <Pill tone={index === 0 ? "highlight" : "default"}>
                        {creator.count} log{creator.count === 1 ? "" : "s"}
                      </Pill>
                    </div>
                  ))}
                </div>
              ) : (
                <Pill>No creator data yet</Pill>
              )}
            </div>
      </section>

      <div style={{ marginBottom: 22 }}>
        <GamificationWidgets variant="profile" />
      </div>

      <section
        style={{
          borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
              padding: 24,
            }}
          >
            <SectionLabel>Recent Activity</SectionLabel>
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.8px",
              }}
            >
              Recently logged {meta.label.toLowerCase()}
            </h2>

            <div className="profile-recent-grid">
              {getRecentEntries(currentEntries).map((entry) => (
                <Link
                  key={`${entry.mediaType}-${entry.id}`}
                  href={getMediaHref({ id: entry.id, mediaType: entry.mediaType })}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <article
                    style={{
                      height: "100%",
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                      padding: 12,
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
                        marginBottom: 10,
                      }}
                    >
                      {entry.poster ? (
                        <img
                          src={entry.poster}
                          alt={entry.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            objectFit: "cover",
                          }}
                        />
                      ) : null}
                    </div>

                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        lineHeight: 1.2,
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {entry.title}
                    </h3>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#9ca3af",
                        fontSize: 13,
                        lineHeight: 1.55,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {entry.year}
                      {entry.director ? ` · ${entry.director}` : ""}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 10,
                      }}
                    >
                      <Pill>
                        {typeof entry.rating === "number"
                          ? `${entry.rating.toFixed(1)} ★`
                          : "No rating"}
                      </Pill>
                      <Pill>{formatLoggedDate(entry.savedAt)}</Pill>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
