"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FollowProfileButton from "./FollowProfileButton";
import PeopleToFollowSection from "./PeopleToFollowSection";
import type { DiscoverProfileCardData } from "../lib/publicProfiles";
import { getProfileHandle, getProfileInitials } from "../lib/profile";

export default function DiscoverShelvesClient({
  profiles,
  followingIds,
  currentUserId,
}: {
  profiles: DiscoverProfileCardData[];
  followingIds: string[];
  currentUserId: string | null;
}) {
  const [query, setQuery] = useState("");

  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return profiles;
    }

    return profiles.filter((entry) => {
      const username = entry.profile.username?.toLowerCase() || "";
      const displayName = entry.profile.displayName?.toLowerCase() || "";
      return username.includes(normalized) || displayName.includes(normalized);
    });
  }, [profiles, query]);

  return (
    <main
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "16px 0 80px",
      }}
    >
      <style>{`
        .discover-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 22px;
          align-items: start;
        }

        .discover-rushmore {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .discover-hero-controls {
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .discover-search-wrap {
          flex: 1 1 520px;
          min-width: min(100%, 320px);
          max-width: 620px;
        }

        .discover-count-pill {
          flex: 0 0 auto;
        }

        @media (max-width: 720px) {
          .discover-grid {
            grid-template-columns: 1fr;
          }

          .discover-rushmore {
            gap: 8px;
          }

          .discover-hero-controls {
            align-items: stretch;
          }

          .discover-count-pill {
            align-self: flex-start;
          }
        }

        @media (max-width: 560px) {
          .discover-grid {
            gap: 16px;
          }
        }
      `}</style>

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%), radial-gradient(circle at 85% 18%, rgba(255,255,255,0.06), transparent 22%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
          padding: "clamp(20px, 5vw, 28px) clamp(18px, 5vw, 30px) clamp(20px, 5vw, 24px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          marginBottom: 22,
        }}
      >
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
          Explore Users
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2.35rem, 8vw, 52px)",
            lineHeight: 0.98,
            letterSpacing: "-2px",
            fontWeight: 600,
            maxWidth: 720,
          }}
        >
          Discover public shelves across ReelShelf.
        </h1>

        <p
          style={{
            margin: "14px 0 0",
            color: "#c7c7c7",
            fontSize: "clamp(14px, 3.8vw, 16px)",
            lineHeight: 1.64,
            maxWidth: 700,
          }}
        >
          Browse shareable profiles, peek at the films that define each shelf,
          and follow the ones whose taste you want on your homepage.
        </p>

        <div className="discover-hero-controls">
          <div className="discover-search-wrap">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by username or display name"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.03) 100%)",
                color: "white",
                padding: "0 18px",
                fontSize: 15,
                outline: "none",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            />
          </div>

          <div
            className="discover-count-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#d1d5db",
              fontSize: 12,
              fontFamily: "Arial, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {filteredProfiles.length} shelf{filteredProfiles.length === 1 ? "" : "s"} visible
          </div>
        </div>
      </section>

      <PeopleToFollowSection variant="discover" />

      {filteredProfiles.length > 0 ? (
        <section className="discover-grid">
          {filteredProfiles.map((entry) => {
            const handle = getProfileHandle(entry.profile);
            const label = entry.profile.displayName || handle || "ReelShelf Profile";
            const initials = getProfileInitials(entry.profile);
            const href = entry.profile.username ? `/u/${entry.profile.username}` : "#";
            const featuredFilm =
              entry.profile.favouriteFilm ||
              entry.mountRushmore[0]?.title ||
              "No featured film yet";

            return (
              <article
                key={entry.profile.id}
                style={{
                  position: "relative",
                  borderRadius: 28,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 24%), linear-gradient(180deg, rgba(20,20,20,0.96) 0%, rgba(10,10,10,0.97) 100%)",
                  boxShadow: "0 20px 56px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.08) 100%)",
                    pointerEvents: "none",
                  }}
                />
                <Link
                  href={href}
                style={{
                    display: "block",
                    padding: 20,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        color: "#d1d5db",
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      Public Shelf
                    </span>

                    <span
                      style={{
                        color: "#9ca3af",
                        fontSize: 12,
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      {entry.counts.followers} follower
                      {entry.counts.followers === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 74,
                        height: 74,
                        borderRadius: 999,
                        overflow: "hidden",
                        flexShrink: 0,
                        background:
                          "radial-gradient(circle at top, rgba(255,255,255,0.09), transparent 60%), linear-gradient(180deg, #161616 0%, #090909 100%)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {entry.profile.avatarUrl ? (
                        <img
                          src={entry.profile.avatarUrl}
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
                            fontSize: 20,
                            fontWeight: 700,
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          {initials}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          color: "#9ca3af",
                          fontSize: 12,
                          lineHeight: 1.5,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {handle || "@reelshelf"}
                      </p>

                      <h2
                        style={{
                          margin: "6px 0 0",
                          fontSize: 30,
                          lineHeight: 0.98,
                          letterSpacing: "-1px",
                          fontWeight: 600,
                        }}
                      >
                        {label}
                      </h2>
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "#c7c7c7",
                      fontSize: 14,
                      lineHeight: 1.68,
                      minHeight: 72,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {entry.profile.bio?.trim()
                      ? entry.profile.bio.slice(0, 140) +
                        (entry.profile.bio.length > 140 ? "..." : "")
                      : "A public ReelShelf profile shaped by diary entries, favourites, and four defining films."}
                  </p>

                  <div
                    style={{
                      marginTop: 18,
                      display: "grid",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
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
                        Featured Film
                      </p>
                      <p
                        style={{
                          margin: 0,
                          color: "white",
                          fontSize: 17,
                          lineHeight: 1.35,
                          letterSpacing: "-0.3px",
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {featuredFilm}
                      </p>
                    </div>

                    <div>
                      <p
                        style={{
                          margin: "0 0 10px",
                          color: "#7f7f7f",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        Movie Mount Rushmore
                      </p>

                      <div className="discover-rushmore">
                        {Array.from({ length: 4 }).map((_, index) => {
                          const film = entry.mountRushmore[index];

                          return (
                            <div
                              key={`${entry.profile.id}-rushmore-${index}`}
                              style={{
                                position: "relative",
                                aspectRatio: "2 / 3",
                                borderRadius: 14,
                                overflow: "hidden",
                                background:
                                  "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              {film?.poster ? (
                                <img
                                  src={film.poster}
                                  alt={film.title}
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
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    padding: 10,
                                    background:
                                      "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "rgba(255,255,255,0.36)",
                                      fontSize: 8,
                                      letterSpacing: "0.22em",
                                      textTransform: "uppercase",
                                      fontFamily: "Arial, sans-serif",
                                    }}
                                  >
                                    ReelShelf
                                  </span>
                                  <div
                                    style={{
                                      alignSelf: "flex-start",
                                      minWidth: 28,
                                      height: 28,
                                      padding: "0 10px",
                                      borderRadius: 999,
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      background: "rgba(255,255,255,0.04)",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "rgba(255,255,255,0.58)",
                                      fontSize: 10,
                                      fontWeight: 600,
                                      fontFamily: "Arial, sans-serif",
                                    }}
                                  >
                                    {film?.title ? film.title.slice(0, 1).toUpperCase() : "+"}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Link>

                <div style={{ padding: "0 20px 20px" }}>
                  <FollowProfileButton
                    targetUserId={entry.profile.id}
                    initialIsFollowing={followingIds.includes(entry.profile.id)}
                    initialFollowerCount={entry.counts.followers}
                    initialFollowingCount={entry.counts.following}
                    isOwnProfile={currentUserId === entry.profile.id}
                    compact
                  />
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(18,18,18,0.92) 0%, rgba(10,10,10,0.94) 100%)",
            padding: 24,
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#7f7f7f",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "Arial, sans-serif",
            }}
          >
            No matches
          </p>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              letterSpacing: "-0.8px",
              fontWeight: 500,
            }}
          >
            No public shelves match that search yet.
          </h2>
          <p
            style={{
              margin: "12px 0 0",
              color: "#b3b3b3",
              fontSize: 14,
              lineHeight: 1.7,
              maxWidth: 680,
              fontFamily: "Arial, sans-serif",
            }}
          >
            Try a different username or display name, or clear the search to
            browse the latest public shelves from across ReelShelf.
          </p>
          {query.trim() ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{
                marginTop: 16,
                height: 40,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#f3f4f6",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Clear search
            </button>
          ) : null}
        </div>
      )}
    </main>
  );
}
