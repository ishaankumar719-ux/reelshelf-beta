"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { getPosterUrl } from "@/src/lib/tmdb-image"
import type {
  MountRushmoreSlot,
  PublicProfileActivityItem,
  PublicProfileShowcaseData,
  PublicProfileTopRatedItem,
} from "@/src/types/profile"

interface ProfileShowcaseProps {
  profile: PublicProfileShowcaseData | null
  isOwner: boolean
}

const INITIAL_COLORS = ["#1D9E75", "#534AB7", "#D85A30", "#D4537E"] as const

function getInitials(displayName: string | null, username: string) {
  const source = (displayName || username).trim()
  if (!source) return "R"

  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase()
}

function getAvatarColor(username: string) {
  const fallback = username.trim() || "reelshelf"
  return INITIAL_COLORS[fallback.charCodeAt(0) % INITIAL_COLORS.length] || INITIAL_COLORS[0]
}

function formatJoinYear(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Joined recently" : `joined ${date.getFullYear()}`
}

function formatAverageRating(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—"
}

function HeroAvatar({
  avatarUrl,
  displayName,
  username,
}: {
  avatarUrl: string | null
  displayName: string | null
  username: string
}) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(displayName, username)
  const bgColor = getAvatarColor(username)

  return (
    <div
      className="relative h-[72px] w-[72px] overflow-hidden rounded-full border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.36)]"
      style={{ background: `linear-gradient(180deg, ${bgColor}, rgba(10,10,20,0.92))` }}
    >
      {avatarUrl && !imgError ? (
        <Image
          src={avatarUrl}
          alt={displayName || username}
          fill
          sizes="72px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-semibold tracking-[0.08em] text-white/92">
          {initials}
        </div>
      )}
    </div>
  )
}

function PosterTile({
  src,
  alt,
  title,
  year,
  width = "w-full",
}: {
  src: string | null
  alt: string
  title: string
  year?: string | number | null
  width?: string
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className={width}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/8 bg-[#10111c]">
        {src && !imgError ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 40vw, 220px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#141622_0%,#0b0c14_100%)] px-4 text-center">
            <div>
              <p className="line-clamp-2 text-xs font-medium text-white/72">{title}</p>
              {year ? <p className="mt-1 text-[10px] text-white/42">{year}</p> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityCard({ item }: { item: PublicProfileActivityItem }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="w-20 shrink-0">
      <div className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/8 bg-[#10111c]">
        {item.poster && !imgError ? (
          <Image
            src={item.poster}
            alt={item.title}
            fill
            sizes="80px"
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,#141622_0%,#0b0c14_100%)] px-2 text-center">
            <p className="line-clamp-3 text-[10px] leading-4 text-white/68">{item.title}</p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 py-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <p className="line-clamp-2 text-[10px] leading-4 text-white/90">{item.title}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyRushmoreTile({ text }: { text?: string | null }) {
  return (
    <div className="aspect-[2/3] overflow-hidden rounded-xl border border-dashed border-white/14 bg-[#141522]">
      <div className="flex h-full items-center justify-center px-4 text-center">
        {text ? (
          <p className="line-clamp-3 text-sm font-medium text-white/68">{text}</p>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/34">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M12 7v10" />
              <path d="M7 12h10" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: string }) {
  return <p className="text-[10px] uppercase tracking-[0.24em] text-white/30">{children}</p>
}

function TasteRow({ items }: { items: PublicProfileTopRatedItem[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="w-[60px] shrink-0">
          <PosterTile src={item.poster} alt={item.title} title={item.title} width="w-[60px]" />
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/72">{item.title}</p>
        </div>
      ))}
    </div>
  )
}

export default function ProfileShowcase({ profile, isOwner }: ProfileShowcaseProps) {
  const rushmoreSlots = useMemo(() => {
    if (!profile) return [] as MountRushmoreSlot[]

    return [1, 2, 3, 4].map((position) => {
      const found = profile.mount_rushmore.find((slot) => slot.position === position)
      return (
        found || {
          position: position as 1 | 2 | 3 | 4,
          media_id: null,
          media_type: null,
          title: null,
          year: null,
          poster_path: null,
        }
      )
    })
  }, [profile])

  if (!profile) {
    return (
      <section className="mx-auto max-w-[980px] pb-16">
        <div className="rounded-[28px] border border-white/10 bg-[#0a0a14] px-6 py-14 text-center shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
          <h1 className="text-xl font-medium text-white/88">No user found</h1>
          <p className="mt-3 text-sm text-white/52">That profile doesn’t exist or is no longer available.</p>
        </div>
      </section>
    )
  }

  const identityName = profile.display_name || profile.username
  const hasRushmore = profile.mount_rushmore.length > 0
  const fallbackTiles = [
    profile.favourite_film,
    profile.favourite_series,
    profile.favourite_book,
    null,
  ]

  const stats = [
    { label: "Films", value: profile.stats.films },
    { label: "Series", value: profile.stats.series },
    { label: "Reviews", value: profile.stats.reviews },
    { label: "Avg rating", value: formatAverageRating(profile.stats.avg_rating) },
  ]

  return (
    <section className="mx-auto max-w-[980px] pb-16">
      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#080910] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
        <div className="relative h-40 bg-[#0a0a14] px-5 pt-4 sm:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,rgba(12,14,22,0.7),rgba(10,10,20,0.95))]" />
          {isOwner ? (
            <Link
              href="/profile"
              className="relative z-10 inline-flex h-9 items-center rounded-full border border-white/12 bg-black/25 px-4 text-[11px] uppercase tracking-[0.16em] text-white/82"
            >
              Edit profile
            </Link>
          ) : null}
          <div className="absolute bottom-0 left-5 z-10 translate-y-1/2 sm:left-7">
            <HeroAvatar avatarUrl={profile.avatar_url} displayName={profile.display_name} username={profile.username} />
          </div>
        </div>

        <div className="px-5 pb-8 pt-11 sm:px-7">
          <div className="max-w-[720px]">
            <h1 className="text-[17px] font-medium text-white/90">{identityName}</h1>
            <p className="mt-1 text-xs text-white/35">
              @{profile.username} · {formatJoinYear(profile.created_at)}
            </p>
            {profile.bio ? (
              <p className="mt-3 line-clamp-2 max-w-[660px] text-[13px] leading-6 text-white/55">{profile.bio}</p>
            ) : null}
            {profile.website_url ? (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs text-[#67d7b2] transition hover:text-[#8be7c8]"
              >
                {profile.website_url}
              </a>
            ) : null}
          </div>

          <div className="mt-6 flex items-start justify-between gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stats.map((item) => (
              <div key={item.label} className="min-w-[72px] shrink-0 text-center">
                <p className="text-base font-medium text-white/85">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-white/8 pt-4">
            <SectionHeader>Mount Rushmore</SectionHeader>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {hasRushmore
                ? rushmoreSlots.map((slot) => {
                    const src = slot.media_id ? getPosterUrl(slot.poster_path, "w342") : null
                    return (
                      <div key={slot.position}>
                        {slot.media_id ? (
                          <>
                            <PosterTile
                              src={src}
                              alt={slot.title || `Rushmore slot ${slot.position}`}
                              title={slot.title || "Rushmore title"}
                              year={slot.year}
                            />
                            <div className="mt-2 min-h-[32px] px-1">
                              <p className="line-clamp-2 text-xs font-medium text-white/82">{slot.title || "Rushmore title"}</p>
                              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/40">{slot.year || "—"}</p>
                            </div>
                          </>
                        ) : (
                          <EmptyRushmoreTile />
                        )}
                      </div>
                    )
                  })
                : fallbackTiles.map((text, index) => (
                    <div key={`fallback-${index}`}>
                      <EmptyRushmoreTile text={text} />
                    </div>
                  ))}
            </div>

            {!hasRushmore && isOwner ? (
              <div className="mt-4">
                <Link href="/profile" className="text-sm text-[#67d7b2] transition hover:text-[#8be7c8]">
                  Add your picks →
                </Link>
              </div>
            ) : null}
          </div>

          {profile.recent_activity.length > 0 ? (
            <div className="mt-8 border-t border-white/8 pt-4">
              <SectionHeader>Recently watched</SectionHeader>
              <div className="-mx-5 mt-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-7 sm:px-7">
                <div className="flex gap-3">
                  {profile.recent_activity.map((item) => (
                    <ActivityCard key={`${item.title}-${item.watched_date || item.id}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {profile.stats.films >= 10 && profile.highest_rated.length > 0 ? (
            <div className="mt-8 border-t border-white/8 pt-4">
              <SectionHeader>Highest rated</SectionHeader>
              <div className="mt-4">
                <TasteRow items={profile.highest_rated} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
