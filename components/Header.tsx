"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MediaCard } from "../src/components/ui/MediaCard";
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
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
  const mediaType =
    item.mediaType === "movie" ? "film" : item.mediaType === "tv" ? "series" : "book";

  const card = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr",
        gap: 12,
        alignItems: "center",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        padding: 12,
      }}
    >
      <div style={{ width: 80, flexShrink: 0 }}>
        <MediaCard
          title={item.title}
          year={item.year}
          posterUrl={item.poster}
          mediaType={mediaType}
          size="sm"
        />
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
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </svg>
  );
}

function DiaryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4.5h11a1.5 1.5 0 0 1 1.5 1.5v13.5H7.5A1.5 1.5 0 0 0 6 21V4.5Z" />
      <path d="M6 4.5A2.5 2.5 0 0 0 3.5 7V19A2 2 0 0 0 5.5 21H6" />
      <path d="M9 8.5h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4h10a1 1 0 0 1 1 1v16l-6-4-6 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m14.8 9.2-1.8 5.6-5.6 1.8 1.8-5.6 5.6-1.8Z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </svg>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f4f6",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function SearchTriggerButton({
  mobile = false,
  onClick,
}: {
  mobile?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={!mobile ? "header-search-trigger header-desktop-search" : undefined}
      style={{
        height: mobile ? 40 : 42,
        minWidth: mobile ? 98 : 280,
        width: mobile ? "auto" : 320,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#a3a3a3",
        borderRadius: 999,
        padding: mobile ? "0 14px" : "0 16px",
        fontSize: 12,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <SearchIcon />
      <span>{mobile ? "Search" : "Search films, series, books..."}</span>
    </button>
  );
}

export default function Header() {
  const pathname = usePathname();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
    router.refresh();
  }

  const mobileNavItems = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/diary", label: "Diary", icon: <DiaryIcon /> },
    { href: "/watchlist", label: "Watchlist", icon: <BookmarkIcon /> },
    { href: "/discover", label: "Discover", icon: <CompassIcon /> },
    { href: user ? "/profile" : "/auth", label: "Profile", icon: <ProfileIcon /> },
  ];

  return (
    <>
      <style>{`
        .header-shell {
          max-width: 1600px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 22px;
          min-width: 0;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .header-user-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 4px 4px 6px;
          min-height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          max-width: min(100%, 320px);
        }

        .header-search-trigger {
          width: 320px;
          height: 42px;
        }

        .header-desktop-nav,
        .header-desktop-account,
        .header-desktop-search {
          display: contents;
        }

        .mobile-topbar-actions,
        .mobile-bottom-nav,
        .mobile-account-sheet {
          display: none;
        }

        .header-search-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 1080px) {
          .header-shell {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .header-left,
          .header-right {
            width: 100%;
          }

          .header-right {
            justify-content: space-between;
            flex-wrap: wrap;
          }

          .header-search-trigger {
            flex: 1 1 320px;
            width: auto;
            min-width: 220px;
          }
        }

        @media (max-width: 760px) {
          .header-shell {
            padding: 12px 16px;
            gap: 12px;
            align-items: center;
            flex-direction: row;
          }

          .header-left {
            width: auto;
            flex: 1 1 auto;
            min-width: 0;
          }

          .header-right {
            display: none;
          }

          .header-desktop-nav {
            display: none;
          }

          .mobile-topbar-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }

          .mobile-bottom-nav {
            position: fixed;
            left: 14px;
            right: 14px;
            bottom: calc(env(safe-area-inset-bottom, 0px) + 4px);
            z-index: 45;
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 8px;
            padding: 8px 8px calc(env(safe-area-inset-bottom, 0px) + 6px);
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(10,10,10,0.94);
            backdrop-filter: blur(18px);
            box-shadow: 0 18px 44px rgba(0,0,0,0.34);
          }

          .mobile-bottom-nav a {
            min-height: 56px;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            text-decoration: none;
            color: #9ca3af;
            font-size: 11px;
            font-family: Arial, sans-serif;
            letter-spacing: 0.02em;
          }

          .mobile-bottom-nav a.active {
            color: white;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.1);
          }

          .mobile-account-sheet {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 90;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
          }

          .mobile-account-card {
            position: absolute;
            top: 70px;
            right: 16px;
            width: min(320px, calc(100vw - 32px));
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,0.08);
            background: linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%);
            box-shadow: 0 28px 70px rgba(0,0,0,0.42);
            padding: 16px;
          }

          .header-search-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .header-shell {
            padding: 10px 14px;
          }
        }
      `}</style>
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
        <div className="header-shell">
          <div className="header-left">
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

            <nav className="header-nav header-desktop-nav">
              <Link
                href="/movies"
                style={{
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Discover
              </Link>
            </nav>
          </div>

          <div className="header-right">
            <SearchTriggerButton onClick={() => setOpen(true)} />
            {user ? <NotificationsBell /> : null}
            {configured ? (
              user ? (
                <div className="header-user-chip header-desktop-account">
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
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                        }}
                      >
                        {getProfileInitials(profile)}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="header-user-copy-primary"
                      style={{
                        color: "#f3f4f6",
                        fontSize: 12,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                      className="header-user-copy-secondary"
                      style={{
                        color: "#7f7f7f",
                        fontSize: 10,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Account Setup
              </Link>
            )}
          </div>

          <div className="mobile-topbar-actions">
            <SearchTriggerButton mobile onClick={() => setOpen(true)} />
            {user ? <NotificationsBell /> : null}
            <IconButton
              label={user ? "Open account menu" : "Open account options"}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {user ? (
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || handle || "Profile avatar"}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    {getProfileInitials(profile)}
                  </span>
                )
              ) : (
                <MenuIcon />
              )}
            </IconButton>
          </div>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {mobileMenuOpen ? (
        <div
          className="mobile-account-sheet"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="mobile-account-card"
            onClick={(event) => event.stopPropagation()}
          >
            {user ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      overflow: "hidden",
                      background:
                        "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
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
                      <span
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                        }}
                      >
                        {getProfileInitials(profile)}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        color: "white",
                        fontSize: 14,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      {displayName || "ReelShelf member"}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "#7f7f7f",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      {syncing
                        ? "Syncing…"
                        : handle ||
                          (needsProfileCompletion ? "Complete profile" : "Signed in")}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      color: "white",
                      minHeight: 44,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 14px",
                      fontSize: 14,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Open profile
                  </Link>
                  <Link
                    href="/activity"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      color: "white",
                      minHeight: 44,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 14px",
                      fontSize: 14,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Open activity
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    style={{
                      minHeight: 44,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 14px",
                      fontSize: 14,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      cursor: "pointer",
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#d1d5db",
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  Sign in to sync your diary, saved lists, and social activity.
                </p>
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    textDecoration: "none",
                    color: "black",
                    minHeight: 44,
                    borderRadius: 14,
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}

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
                  padding: "20px clamp(16px, 3vw, 22px)",
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
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                    fontSize: "clamp(22px, 6vw, 28px)",
                    letterSpacing: "-0.8px",
                    fontFamily: "serif",
                  }}
                />
              </div>

            <div style={{ padding: "20px clamp(16px, 3vw, 22px)" }}>
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
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  Searching…
                </div>
              ) : null}

              <div className="header-search-grid">
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
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
