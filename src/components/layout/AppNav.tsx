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

let cachedProfile: { avatarUrl: string | null; initial: string } | null = null

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getNavAvatarInitial(displayName: string | null | undefined, username: string | null | undefined) {
  return (displayName ?? username ?? "R").trim().charAt(0).toUpperCase() || "R"
}

function NavAvatar({
  avatarUrl,
  initial,
  profileLoaded,
}: {
  avatarUrl: string | null
  initial: string
  profileLoaded: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const showImage = profileLoaded && Boolean(avatarUrl) && !imgError

  useEffect(() => {
    setImgError(false)
    setImgLoaded(false)
  }, [avatarUrl])

  useEffect(() => {
    console.log("[NAV AVATAR] branch:", showImage ? "image" : "initials", "| avatarUrl:", avatarUrl)
  }, [showImage, avatarUrl])

  return (
    <div
      className="relative h-9 w-9 shrink-0"
      style={{ width: "36px", height: "36px", flexShrink: 0 }}
    >
      <style>{`
        @keyframes navAvatarPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      <div
        className="flex h-9 w-9 select-none items-center justify-center rounded-full"
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #534AB7, #1D9E75)",
          border: "1.5px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.9)",
          fontSize: "14px",
          fontWeight: 500,
          flexShrink: 0,
          userSelect: "none",
          animation: profileLoaded ? "none" : "navAvatarPulse 1.5s ease-in-out infinite",
        }}
      >
        {initial}
      </div>
      {showImage ? (
        <img
          src={avatarUrl ?? ""}
          alt="Profile"
          className="absolute inset-0 block h-9 w-9 rounded-full object-cover"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "1.5px solid rgba(255,255,255,0.15)",
            display: "block",
            flexShrink: 0,
            opacity: imgLoaded ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            console.log("[NAV AVATAR] image load failed, switching to initials")
            setImgError(true)
          }}
        />
      ) : null}
    </div>
  )
}

export default function AppNav() {
  const pathname = usePathname()
  const { user, profile, avatarUrl } = useAuth()
  const profileHref = profile?.username ? `/u/${encodeURIComponent(profile.username)}` : user ? "/settings/profile" : "/auth"
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(cachedProfile?.avatarUrl ?? null)
  const [initial, setInitial] = useState<string>(cachedProfile?.initial ?? "R")
  const [profileLoaded, setProfileLoaded] = useState(Boolean(cachedProfile))

  useEffect(() => {
    if (!user) {
      cachedProfile = null
      setResolvedAvatarUrl(null)
      setInitial("R")
      setProfileLoaded(false)
      return
    }

    if (cachedProfile) {
      setResolvedAvatarUrl(cachedProfile.avatarUrl)
      setInitial(cachedProfile.initial)
      setProfileLoaded(true)
    }

    const nextInitial = getNavAvatarInitial(profile?.displayName, profile?.username)
    const nextAvatarUrl = avatarUrl ?? null

    setInitial(nextInitial)

    if (profile?.username || profile?.displayName || nextAvatarUrl) {
      cachedProfile = {
        avatarUrl: nextAvatarUrl,
        initial: nextInitial,
      }

      setResolvedAvatarUrl(nextAvatarUrl)
      setProfileLoaded(true)
      console.log("[NAV AVATAR] profile loaded:", {
        username: profile?.username ?? null,
        hasAvatar: !!nextAvatarUrl,
      })
    }
  }, [user, profile?.displayName, profile?.username, avatarUrl])

  useEffect(() => {
    setDropdownOpen(false)
  }, [pathname])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07070d]">
        <div className="mx-auto flex h-[52px] max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="shrink-0 text-[16px] font-medium tracking-[0.08em] text-white no-underline">
              ReelShelf
            </Link>

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

          <div className="flex items-center gap-2">
            <div className="hidden md:block">{user ? <NotificationsBell /> : null}</div>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    console.log("[NAV DROPDOWN] toggling, was:", dropdownOpen)
                    setDropdownOpen((previous) => !previous)
                  }}
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
                  <NavAvatar
                    avatarUrl={resolvedAvatarUrl}
                    initial={initial}
                    profileLoaded={profileLoaded}
                  />
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

      <nav className="border-t border-white/8 bg-[#07070d] md:hidden">
        <div className="mx-auto grid max-w-[1600px] grid-cols-5 px-2">
          {[
            { href: "/", label: "Home" },
            { href: "/diary", label: "Diary" },
            { href: "/watchlist", label: "Watchlist" },
            { href: "/discover", label: "Discover" },
            { href: user ? profileHref : "/auth", label: "Profile" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 items-center justify-center text-[11px] no-underline ${
                item.href === "/"
                  ? pathname === "/"
                    ? "text-white/90"
                    : "text-white/42"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "text-white/90"
                    : "text-white/42"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
