"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import NotificationsBell from "@/components/NotificationsBell"
import { useAuth } from "@/components/AuthProvider"
import AccountDropdown from "@/components/layout/AccountDropdown"

const desktopLinks = [
  { href: "/movies", label: "Films" },
  { href: "/series", label: "Series" },
  { href: "/books", label: "Books" },
  { href: "/diary", label: "Diary" },
  { href: "/watchlist", label: "Watchlist" },
] as const

// ─── Bottom nav items with SVG icons ─────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function DiaryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12h8M8 8h5M8 16h4" />
    </svg>
  )
}

function WatchlistIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" />
    </svg>
  )
}

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.2 8.8-2.6 5.2-5.2 2.6 2.6-5.2 5.2-2.6Z" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

const mobileNavItems = [
  { href: "/", label: "Home", Icon: HomeIcon, exact: true },
  { href: "/diary", label: "Diary", Icon: DiaryIcon, exact: false },
  { href: "/watchlist", label: "Watchlist", Icon: WatchlistIcon, exact: false },
  { href: "/discover", label: "Discover", Icon: DiscoverIcon, exact: false },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getNavAvatarInitial(displayName: string | null | undefined, username: string | null | undefined) {
  return (displayName ?? username ?? "R").trim().charAt(0).toUpperCase() || "R"
}

// ─── NavAvatar ────────────────────────────────────────────────────────────────

function NavAvatar({
  avatarUrl,
  initial,
  size = 36,
}: {
  avatarUrl: string | null
  initial: string
  size?: number
}) {
  const [imgError, setImgError] = useState(false)
  const showImage = !!avatarUrl && !imgError

  useEffect(() => {
    setImgError(false)
  }, [avatarUrl])

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1.5px solid rgba(255,255,255,0.15)",
    display: "block",
    flexShrink: 0,
  }

  return showImage ? (
    <img
      src={avatarUrl}
      alt="Profile"
      width={size}
      height={size}
      style={style}
      onError={() => setImgError(true)}
    />
  ) : (
    <div
      style={{
        ...style,
        background: "linear-gradient(135deg, #534AB7, #1D9E75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.9)",
        fontSize: size * 0.39,
        fontWeight: 500,
        userSelect: "none",
      }}
    >
      {initial}
    </div>
  )
}

// ─── AppNav ───────────────────────────────────────────────────────────────────

export default function AppNav() {
  const pathname = usePathname()
  const { user, profile, avatarUrl } = useAuth()
  const profileHref = profile?.username
    ? `/u/${encodeURIComponent(profile.username)}`
    : user
      ? "/settings/profile"
      : "/auth"
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const initial = getNavAvatarInitial(profile?.displayName, profile?.username)

  useEffect(() => {
    setDropdownOpen(false)
  }, [pathname])

  const profileActive = profileHref !== "/auth" && isActive(pathname, profileHref.split("?")[0] ?? profileHref)

  return (
    <>
      {/* ── Top header bar ── */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07070d]">
        <div className="mx-auto flex h-[52px] max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">

          {/* Left: wordmark + beta badge + desktop nav */}
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/"
              className="shrink-0 text-[16px] font-medium tracking-[0.08em] text-white no-underline"
            >
              ReelShelf
            </Link>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 18,
                padding: "0 7px",
                borderRadius: 999,
                border: "0.5px solid rgba(255,255,255,0.12)",
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.32)",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                flexShrink: 0,
              }}
            >
              Beta
            </span>

            <nav className="hidden items-center gap-5 md:flex">
              {desktopLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[13px] no-underline transition ${
                    isActive(pathname, item.href) ? "text-white/85" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: search (mobile) + notifications + avatar */}
          <div className="flex items-center gap-1">
            {/* Search — mobile only, 44×44 tap target */}
            <button
              type="button"
              className="md:hidden"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("rs:open-search"))
                }
              }}
              aria-label="Search"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "rgba(255,255,255,0.6)",
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            >
              <SearchIcon />
            </button>
            {/* Notifications visible on all screen sizes when logged in */}
            {user ? <NotificationsBell /> : null}

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((previous) => !previous)}
                  aria-label="Open account menu"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    borderRadius: "50%",
                    transition: "box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.1)"
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <NavAvatar avatarUrl={avatarUrl} initial={initial} />
                </button>

                {dropdownOpen ? (
                  <AccountDropdown
                    username={profile?.username ?? null}
                    onClose={() => setDropdownOpen(false)}
                  />
                ) : null}
              </div>
            ) : (
              <Link href="/auth" className="text-[13px] text-white/78 no-underline">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        aria-label="Main navigation"
        className="border-t border-white/8 bg-[#07070d] md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="mx-auto grid max-w-[1600px] grid-cols-5">
          {mobileNavItems.map(({ href, label, Icon, exact }) => {
            const active = exact ? pathname === href : isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  minHeight: 52,
                  paddingTop: 8,
                  paddingBottom: 8,
                  textDecoration: "none",
                  color: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)",
                  transition: "color 0.15s ease",
                  position: "relative",
                }}
              >
                {/* Active indicator dot */}
                {active ? (
                  <span
                    style={{
                      position: "absolute",
                      top: 5,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.7)",
                    }}
                  />
                ) : null}
                <Icon active={active} />
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.02em",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    fontWeight: active ? 500 : 400,
                    lineHeight: 1,
                  }}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Profile tab — uses avatar on mobile */}
          <Link
            href={user ? profileHref : "/auth"}
            aria-label="Profile"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              minHeight: 52,
              paddingTop: 8,
              paddingBottom: 8,
              textDecoration: "none",
              color: profileActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)",
              transition: "color 0.15s ease",
              position: "relative",
            }}
          >
            {profileActive ? (
              <span
                style={{
                  position: "absolute",
                  top: 5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                }}
              />
            ) : null}
            {user ? (
              <NavAvatar avatarUrl={avatarUrl} initial={initial} size={24} />
            ) : (
              <ProfileIcon active={profileActive} />
            )}
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.02em",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                fontWeight: profileActive ? 500 : 400,
                lineHeight: 1,
              }}
            >
              {user ? "Profile" : "Sign in"}
            </span>
          </Link>
        </div>
      </nav>
    </>
  )
}
