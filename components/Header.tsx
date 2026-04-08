"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import NotificationsBell from "./NotificationsBell";
import { getProfileInitials } from "../lib/profile";
import {
  searchAllMedia,
  type UniversalSearchResult,
  type SearchMediaType,
} from "../lib/search";

type FilterType = "all" | "movie" | "tv" | "book";

function getLabel(type: SearchMediaType) {
  if (type === "movie") return "FILM";
  if (type === "tv") return "SERIES";
  if (type === "book") return "BOOK";
  return "User";
}

function SearchFilterButton({
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
        height: 32,
        padding: "0 12px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        color: active ? "white" : "#9ca3af",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {label}
    </button>
  );
}

function SearchResultCard({
  item,
  onSelect,
}: {
  item: UniversalSearchResult;
  onSelect: () => void;
}) {
  const card = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "68px 1fr",
        gap: 12,
        alignItems: "center",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        padding: 12,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 68,
          aspectRatio: "2 / 3",
          borderRadius: 12,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
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
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              ReelShelf
            </span>

            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {item.mediaType === "book" ? "B" : "R"}
            </div>
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              padding: "6px 9px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e5e7eb",
              fontSize: 10,
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {getLabel(item.mediaType)}
          </span>
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.4px",
            lineHeight: 1.1,
            color: "white",
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            margin: 0,
            marginTop: 6,
            fontSize: 12,
            color: "#aaaaaa",
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.55,
          }}
        >
          {item.year}
          {item.subtitle ? ` · ${item.subtitle}` : ""}
        </p>
      </div>
    </div>
  );

  return (
    <Link href={item.href} onClick={onSelect} style={{ textDecoration: "none" }}>
      {card}
    </Link>
  );
}

export default function Header() {
  const router = useRouter();
  const {
    user,
    profile,
    displayName,
    handle,
    avatarUrl,
    needsProfileCompletion,
    loading: authLoading,
    configured,
    syncing,
    signOut,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);

        try {
          const found = await searchAllMedia(query);
          setResults(found);
        } catch (error) {
          console.error(error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  const filteredResults = useMemo(() => {
    if (filter === "all") return results;
    return results.filter((item) => item.mediaType === filter);
  }, [results, filter]);

  async function handleSignOut() {
    await signOut();
    router.refresh();
  }

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(8,8,8,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
            }}
          >
            <Link
              href="/"
              style={{
                color: "white",
                textDecoration: "none",
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.4px",
                lineHeight: 1,
              }}
            >
              ReelShelf
            </Link>

            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Link
                href="/movies"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Films
              </Link>

              <Link
                href="/series"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Series
              </Link>

              <Link
                href="/books"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Books
              </Link>

              <Link
                href="/diary"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Diary
              </Link>

              <Link
                href="/watchlist"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Watchlist
              </Link>

              <Link
                href="/reading-shelf"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Reading Shelf
              </Link>

              <Link
                href="/profile"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Profile
              </Link>

              <Link
                href="/discover"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Discover
              </Link>
            </nav>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            {user ? <NotificationsBell /> : null}
            {configured ? (
              user ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 4px 4px 6px",
                    minHeight: 44,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      overflow: "hidden",
                      flexShrink: 0,
                      background:
                        "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName || handle || "Profile avatar"}
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
                          color: "rgba(255,255,255,0.7)",
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "Arial, sans-serif",
                        }}
                      >
                        {getProfileInitials(profile)}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: "#f3f4f6",
                        fontSize: 12,
                        fontFamily: "Arial, sans-serif",
                        maxWidth: 180,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {syncing
                        ? "Syncing…"
                        : handle ||
                          (needsProfileCompletion ? "Complete profile" : "Signed in")}
                    </div>
                    <div
                      style={{
                        color: "#7f7f7f",
                        fontSize: 10,
                        fontFamily: "Arial, sans-serif",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        maxWidth: 180,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginTop: 1,
                      }}
                    >
                      {displayName || "ReelShelf member"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    style={{
                      height: 28,
                      padding: "0 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "white",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: authLoading ? "#7f7f7f" : "#e5e7eb",
                    textDecoration: "none",
                    fontSize: 12,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {authLoading ? "Loading..." : "Sign In"}
                </Link>
              )
            ) : (
              <Link
                href="/auth"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#e5e7eb",
                  textDecoration: "none",
                  fontSize: 12,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Account Setup
              </Link>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              style={{
                width: 230,
                height: 36,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#8f8f8f",
                borderRadius: 999,
                padding: "0 14px",
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Search movies, series, books...
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 64,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(980px, calc(100vw - 40px))",
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(10,10,10,0.98) 100%)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 22,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  marginBottom: 10,
                  color: "#7f7f7f",
                  fontSize: 11,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Search the universe
              </p>

              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search films, series and books..."
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "white",
                  fontSize: 28,
                  letterSpacing: "-0.8px",
                  fontFamily: "serif",
                }}
              />
            </div>

            <div style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  gap: 16,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#9a9a9a",
                    fontSize: 13,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {query.trim()
                    ? `Results for "${query}"`
                    : "Start typing to search"}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: "#6f6f6f",
                    fontSize: 12,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Press ESC to close
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 18,
                  flexWrap: "wrap",
                }}
              >
                <SearchFilterButton
                  active={filter === "all"}
                  label="All"
                  onClick={() => setFilter("all")}
                />
                <SearchFilterButton
                  active={filter === "movie"}
                  label="Films"
                  onClick={() => setFilter("movie")}
                />
                <SearchFilterButton
                  active={filter === "tv"}
                  label="Series"
                  onClick={() => setFilter("tv")}
                />
                <SearchFilterButton
                  active={filter === "book"}
                  label="Books"
                  onClick={() => setFilter("book")}
                />
              </div>

              {loading ? (
                <div
                  style={{
                    padding: "0 0 14px",
                    color: "#8a8a8a",
                    fontSize: 13,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Searching…
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {filteredResults.length > 0 ? (
                  filteredResults.map((item) => (
                    <SearchResultCard
                      key={item.id}
                      item={item}
                      onSelect={() => setOpen(false)}
                    />
                  ))
                ) : query.trim().length > 1 && !loading ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      padding: "40px 10px",
                      textAlign: "center",
                      color: "#8a8a8a",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    No results found.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
