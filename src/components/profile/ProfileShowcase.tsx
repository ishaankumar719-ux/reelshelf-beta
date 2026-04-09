"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useProfileData } from "@/src/hooks/useProfileData"
import { MediaCard, MediaCardSkeleton } from "@/src/components/ui/MediaCard"

interface ProfileShowcaseProps {
  username: string
  isOwner: boolean
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "R"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
}

function formatJoinYear(createdAt: string) {
  const date = new Date(createdAt)
  return Number.isNaN(date.getTime()) ? "Joined recently" : `Joined ${date.getFullYear()}`
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

function ProfileAvatar({
  avatarUrl,
  label,
}: {
  avatarUrl: string | null
  label: string
}) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(label)

  return (
    <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full border border-white/12 bg-[linear-gradient(180deg,#1a2438_0%,#261336_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.34)]">
      {avatarUrl && !imgError ? (
        <Image
          src={avatarUrl}
          alt={label}
          fill
          sizes="72px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-lg font-semibold tracking-[0.08em] text-white/90">
          {initials}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 border-t border-white/8 pt-4">
      <p className="text-[10px] uppercase tracking-[0.26em] text-white/38">{children}</p>
    </div>
  )
}

function RushmorePlaceholder() {
  return (
    <div className="aspect-[2/3] overflow-hidden rounded-lg border border-dashed border-white/14 bg-[#1a1a2e]">
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/35">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 5v14" />
          <path d="M16 5v14" />
          <path d="M12 9v6" />
          <path d="M9 12h6" />
        </svg>
        <div>
          <p className="text-xs font-medium text-white/55">Rushmore slot</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">Not filled yet</p>
        </div>
      </div>
    </div>
  )
}

export default function ProfileShowcase({ username, isOwner }: ProfileShowcaseProps) {
  const { profile, isLoading, error } = useProfileData(username)
  const identityName = profile?.display_name || (profile ? `@${profile.username}` : "@reelshelf")
  const joinLine = profile ? `@${profile.username} · ${formatJoinYear(profile.created_at)}` : null
  const bio = profile?.bio?.trim() || "Still building a taste profile."

  const stats = useMemo(
    () =>
      profile
        ? [
            { label: "Films", value: profile.stats.films_watched },
            { label: "Series", value: profile.stats.series_watched },
            { label: "Books", value: profile.stats.books_read },
            { label: "Reviews", value: profile.stats.reviews_written },
            { label: "Following", value: profile.stats.following_count },
          ]
        : [],
    [profile]
  )

  return (
    <section className="mx-auto max-w-[1120px] pb-16">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#080910] shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <div className="relative h-[132px] bg-[linear-gradient(135deg,#0d1220_0%,#0d0d1a_55%,#1a0d2e_100%)] px-5 pt-5 sm:h-[144px] sm:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.18),transparent_22%)]" />
          {isOwner ? (
            <Link
              href="/settings/profile"
              className="relative z-10 inline-flex h-9 items-center rounded-full border border-white/14 bg-black/25 px-4 text-[11px] uppercase tracking-[0.16em] text-white/82 backdrop-blur"
            >
              Edit profile
            </Link>
          ) : null}
          <div className="absolute bottom-0 left-5 z-10 translate-y-1/2 sm:left-7">
            <ProfileAvatar avatarUrl={profile?.avatar_url || null} label={identityName} />
          </div>
        </div>

        <div className="px-5 pb-8 pt-12 sm:px-7">
          {isLoading ? (
            <>
              <div className="space-y-3">
                <div className="h-6 w-48 rounded bg-white/8" />
                <div className="h-4 w-40 rounded bg-white/6" />
                <div className="h-4 w-full max-w-[460px] rounded bg-white/5" />
              </div>
              <div className="mt-7 grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-2xl bg-white/[0.03] px-3 py-4">
                    <div className="h-5 w-9 rounded bg-white/8" />
                    <div className="mt-2 h-3 w-12 rounded bg-white/5" />
                  </div>
                ))}
              </div>
            </>
          ) : profile ? (
            <>
              <div className="max-w-[620px]">
                <h1 className="text-[17px] font-medium tracking-[0.01em] text-white/90">{identityName}</h1>
                {joinLine ? (
                  <p className="mt-1 text-xs text-white/45">{joinLine}</p>
                ) : null}
                <p className="mt-3 max-w-[720px] line-clamp-2 text-[13px] leading-6 text-white/55">{bio}</p>
              </div>

              <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-4">
                {stats.map((item) => (
                  <div key={item.label} className="min-w-0 rounded-2xl bg-white/[0.025] px-2 py-3 text-center sm:px-3 sm:py-4">
                    <p className="text-[15px] font-medium text-white/86 sm:text-base">{formatCount(item.value)}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/30 sm:text-[10px]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <SectionLabel>Mount Rushmore</SectionLabel>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {profile.mount_rushmore.map((slot) =>
                  slot.media_id && slot.media_type && slot.title ? (
                    <MediaCard
                      key={slot.position}
                      title={slot.title}
                      year={slot.year || undefined}
                      posterPath={slot.poster_path}
                      mediaType={slot.media_type}
                      size="md"
                    />
                  ) : (
                    <RushmorePlaceholder key={slot.position} />
                  )
                )}
              </div>

              <SectionLabel>Recently watched</SectionLabel>
              {profile.recent_activity.length > 0 ? (
                <div className="-mx-5 mt-4 overflow-x-auto px-5 pb-2 sm:-mx-7 sm:px-7">
                  <div className="flex min-w-max gap-3">
                    {profile.recent_activity.map((item) => (
                      <MediaCard
                        key={item.id}
                        title={item.title}
                        posterPath={item.poster_path}
                        mediaType={item.media_type}
                        rating={item.rating}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/42">No activity yet</p>
              )}

              {profile.favourite_shelf.length > 0 ? (
                <>
                  <SectionLabel>Favourites</SectionLabel>
                  <div className="-mx-5 mt-4 overflow-x-auto px-5 pb-2 sm:-mx-7 sm:px-7">
                    <div className="flex min-w-max gap-3">
                      {profile.favourite_shelf.map((item, index) => (
                        <MediaCard
                          key={`${item.media_type}-${item.media_id}-${index}`}
                          title={item.title}
                          posterPath={item.poster_path}
                          mediaType={item.media_type}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-5 py-6">
              <p className="text-sm text-white/70">{error || "This profile could not be loaded."}</p>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="-mx-1 mt-6 flex gap-3 overflow-hidden px-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <MediaCardSkeleton key={index} size="sm" />
          ))}
        </div>
      ) : null}
    </section>
  )
}
