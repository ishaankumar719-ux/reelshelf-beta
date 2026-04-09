"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import NotificationsBell from "@/components/NotificationsBell"
import { useAuth } from "@/components/AuthProvider"
import { getProfileInitials } from "@/lib/profile"

const desktopLinks = [
  { href: "/movies", label: "Films" },
  { href: "/series", label: "Series" },
  { href: "/books", label: "Books" },
  { href: "/diary", label: "Diary" },
  { href: "/watchlist", label: "Watchlist" },
] as const

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AppNav() {
  const pathname = usePathname()
  const { user, profile, avatarUrl } = useAuth()
  const profileHref = profile?.username ? `/u/${encodeURIComponent(profile.username)}` : user ? "/settings/profile" : "/auth"

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
              <Link
                href={profileHref}
                className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-[11px] font-semibold text-white/85 no-underline"
                aria-label="Open profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>{getProfileInitials(profile)}</span>
                )}
              </Link>
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
