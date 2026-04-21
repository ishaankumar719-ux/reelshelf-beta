"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { getPosterUrl, type PosterSize } from "@/src/lib/tmdb-image"

export interface MediaCardProps {
  title: string
  year?: string | number
  posterPath?: string | null
  posterUrl?: string | null
  mediaType: "film" | "series" | "book"
  rating?: number | null
  isWatched?: boolean
  isInWatchlist?: boolean
  href?: string
  onClick?: () => void
  onLogPress?: () => void
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClassMap: Record<NonNullable<MediaCardProps["size"]>, string> = {
  sm: "w-[100px]",
  md: "w-[150px]",
  lg: "w-[200px]",
}

const tmdbSizeMap: Record<NonNullable<MediaCardProps["size"]>, PosterSize> = {
  sm: "w154",
  md: "w342",
  lg: "w500",
}

const imageSizesMap: Record<NonNullable<MediaCardProps["size"]>, string> = {
  sm: "100px",
  md: "150px",
  lg: "200px",
}

const badgeClassMap: Record<MediaCardProps["mediaType"], string> = {
  film: "border-blue-300/20 bg-blue-400/15 text-blue-100",
  series: "border-emerald-300/20 bg-emerald-400/15 text-emerald-100",
  book: "border-fuchsia-300/20 bg-fuchsia-400/15 text-fuchsia-100",
}

function getMediaLabel(mediaType: MediaCardProps["mediaType"]) {
  if (mediaType === "film") return "FILM"
  if (mediaType === "series") return "SERIES"
  return "BOOK"
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M8 5v14" />
      <path d="M16 5v14" />
      <path d="M3.5 10h17" />
      <path d="M3.5 14h17" />
    </svg>
  )
}

function SeriesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="11" rx="2" />
      <path d="M9 19.5h6" />
      <path d="M12 16.5v3" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H18v15H7.5A2.5 2.5 0 0 0 5 21V6.5Z" />
      <path d="M5 6.5A2.5 2.5 0 0 0 2.5 9V19A2 2 0 0 0 4.5 21H5" />
      <path d="M9 8h5.5" />
      <path d="M9 11h5.5" />
    </svg>
  )
}

function FallbackIcon({ mediaType }: { mediaType: MediaCardProps["mediaType"] }) {
  if (mediaType === "film") return <FilmIcon />
  if (mediaType === "series") return <SeriesIcon />
  return <BookIcon />
}

function MediaCardInner({
  title,
  year,
  mediaType,
  rating,
  isWatched,
  isInWatchlist,
  size = "md",
  className,
  posterPath,
  posterUrl,
  onLogPress,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false)

  const resolvedPosterUrl = useMemo(() => {
    if (posterUrl && posterUrl.trim()) return posterUrl
    if (posterPath && posterPath.trim()) return getPosterUrl(posterPath, tmdbSizeMap[size])
    return null
  }, [posterPath, posterUrl, size])

  const showFallback = imgError || !resolvedPosterUrl

  return (
    <article className={["group", sizeClassMap[size], className].filter(Boolean).join(" ")}>
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0b0b12] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <div className="relative aspect-[2/3] bg-[#0d0d1a]">
          {!showFallback ? (
            <Image
              src={resolvedPosterUrl}
              alt={title}
              fill
              sizes={imageSizesMap[size]}
              className="object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_50%),linear-gradient(180deg,#131323_0%,#090912_100%)] px-3 text-center">
              <div className="text-white/60">
                <FallbackIcon mediaType={mediaType} />
              </div>
              <div className="space-y-1">
                <p className="line-clamp-2 text-xs leading-5 text-white/70">{title}</p>
                {year ? <p className="text-[10px] tracking-[0.16em] uppercase text-white/50">{year}</p> : null}
              </div>
            </div>
          )}

          <div className={`absolute left-2 top-2 inline-flex min-h-6 items-center rounded-full border px-2.5 text-[10px] tracking-[0.14em] ${badgeClassMap[mediaType]}`}>
            {getMediaLabel(mediaType)}
          </div>

          {typeof rating === "number" ? (
            <div className="absolute bottom-2 left-2 rounded-full border border-white/12 bg-black/55 px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-white">
              {rating.toFixed(1)} ★
            </div>
          ) : null}

          {onLogPress ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onLogPress()
              }}
              className="absolute bottom-2 left-2 rounded-full border border-[#1D9E75]/45 bg-[#1D9E75]/15 px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-[#9de3c7] opacity-0 transition group-hover:opacity-100"
            >
              + Log
            </button>
          ) : null}

          {isWatched ? (
            <div className="absolute right-2 top-2 rounded-full border border-white/12 bg-black/55 px-2 py-1 text-[10px] text-white/90">
              Watched
            </div>
          ) : null}

          {!isWatched && isInWatchlist ? (
            <div className="absolute right-2 top-2 rounded-full border border-white/12 bg-black/55 px-2 py-1 text-[10px] text-white/90">
              Saved
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/6 bg-[#0a0a10] px-3 py-3">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          {(year ?? null) !== null && year !== undefined && year !== "" ? (
            <p className="mt-1 truncate text-xs text-white/55">{year}</p>
          ) : (
            <p className="mt-1 text-xs text-white/40">No year</p>
          )}
        </div>
      </div>
    </article>
  )
}

export function MediaCard(props: MediaCardProps) {
  const inner = <MediaCardInner {...props} />

  if (props.href) {
    return (
      <Link href={props.href} onClick={props.onClick} className="inline-block align-top no-underline">
        {inner}
      </Link>
    )
  }

  if (props.onClick) {
    return (
      <button type="button" onClick={props.onClick} className="inline-block bg-transparent p-0 text-left align-top">
        {inner}
      </button>
    )
  }

  return inner
}

export function MediaCardSkeleton({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <>
      <style>{`
        @keyframes reelshelf-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      <div className={[sizeClassMap[size], className].filter(Boolean).join(" ")}>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0b0b12]">
          <div
            className="aspect-[2/3]"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.03) 100%)",
              backgroundSize: "200% 100%",
              animation: "reelshelf-shimmer 1.6s linear infinite",
            }}
          />
          <div className="space-y-2 border-t border-white/6 bg-[#0a0a10] px-3 py-3">
            <div
              className="h-4 rounded"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.03) 100%)",
                backgroundSize: "200% 100%",
                animation: "reelshelf-shimmer 1.6s linear infinite",
              }}
            />
            <div
              className="h-3 w-2/3 rounded"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.03) 100%)",
                backgroundSize: "200% 100%",
                animation: "reelshelf-shimmer 1.6s linear infinite",
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
