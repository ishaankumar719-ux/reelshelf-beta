"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ReviewCard from "./ReviewCard"
import {
  fetchFollowingReviewsForMedia,
  fetchPublicReviewsForMedia,
  type MediaReview,
} from "@/lib/supabase/mediaReviews"
import {
  getLikeCountsForEntries,
  getLikedDiaryEntryIds,
} from "@/lib/supabase/likes"
import { getCommentCountsForEntries } from "@/lib/supabase/comments"
import { getProfileInitials } from "@/lib/profile"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MediaReviewsSectionProps {
  mediaIds: string[]
  mediaType: "movie" | "tv" | "book"
  title: string
  year: number
  poster: string | null
  creator: string | null
  href: string
}

// ─── Social data ──────────────────────────────────────────────────────────────

type SocialData = Record<string, { likeCount: number; commentCount: number; isLiked: boolean }>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function SmallAvatar({
  avatarUrl,
  displayName,
  username,
  size = 36,
}: {
  avatarUrl?: string | null
  displayName?: string | null
  username?: string | null
  size?: number
}) {
  const [imgErr, setImgErr] = useState(false)
  const initials = getProfileInitials({
    displayName: displayName ?? null,
    username: username ?? null,
  })

  return avatarUrl && !imgErr ? (
    <img
      src={avatarUrl}
      alt={displayName || username || "avatar"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
      }}
      onError={() => setImgErr(true)}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#534AB7,#1D9E75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.9)",
        fontSize: size * 0.35,
        fontWeight: 600,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 16px",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.38)",
      }}
    >
      {children}
    </h2>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 13,
        color: "rgba(255,255,255,0.28)",
        fontStyle: "italic",
        padding: "18px 0",
      }}
    >
      {children}
    </p>
  )
}

// ─── Following review row ─────────────────────────────────────────────────────

function FollowingReviewRow({ review }: { review: MediaReview }) {
  const [expanded, setExpanded] = useState(false)
  const EXCERPT = 160
  const reviewText = review.review.trim()
  const needsExpand = reviewText.length > EXCERPT
  const displayText = expanded ? reviewText : reviewText.slice(0, EXCERPT)

  const profileHref = review.username ? `/u/${encodeURIComponent(review.username)}` : "#"
  const name = review.displayName || review.username || "Someone"

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 0",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <Link href={profileHref} style={{ flexShrink: 0, textDecoration: "none" }}>
        <SmallAvatar
          avatarUrl={review.avatarUrl}
          displayName={review.displayName}
          username={review.username}
          size={36}
        />
      </Link>

      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <Link
            href={profileHref}
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {name}
          </Link>
          {review.username ? (
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 11 }}>
              @{review.username}
            </span>
          ) : null}
        </div>

        {/* Ratings row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          {review.rating !== null ? (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", fontVariantNumeric: "tabular-nums" }}>
              {review.rating.toFixed(1)}
              <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 11 }}>/10</span>
            </span>
          ) : null}
          {review.reelshelfScore !== null &&
          review.reelshelfScore !== review.rating ? (
            <span
              style={{
                fontSize: 12,
                color: "#EF9F27",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              RS {review.reelshelfScore.toFixed(1)}
            </span>
          ) : null}
          {review.watchedDate ? (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", marginLeft: "auto" }}>
              {formatDate(review.watchedDate)}
            </span>
          ) : null}
        </div>

        {/* Review excerpt */}
        {reviewText ? (
          <div style={{ marginTop: 6 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255,255,255,0.58)",
                fontStyle: "italic",
                lineHeight: 1.6,
              }}
            >
              {displayText}
              {needsExpand && !expanded ? "…" : ""}
            </p>
            {needsExpand ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  marginTop: 3,
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.32)",
                  fontSize: 11,
                }}
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Badges */}
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {review.favourite ? (
            <span style={{ color: "#fb7185", fontSize: 10 }}>♥ Favourite</span>
          ) : null}
          {review.rewatch ? (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 999,
                background: "rgba(245,158,11,0.1)",
                border: "0.5px solid rgba(245,158,11,0.2)",
                color: "#f8c16d",
                fontSize: 10,
              }}
            >
              ↺ Rewatch
            </span>
          ) : null}
          {review.containsSpoilers ? (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 999,
                background: "rgba(239,68,68,0.08)",
                border: "0.5px solid rgba(239,68,68,0.18)",
                color: "#fca5a5",
                fontSize: 10,
              }}
            >
              ⚠ Spoilers
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: 72,
            borderRadius: 10,
            background: "rgba(255,255,255,0.025)",
            border: "0.5px solid rgba(255,255,255,0.05)",
            animation: "pulse 1.4s ease-in-out infinite",
            animationDelay: `${i * 180}ms`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MediaReviewsSection({
  mediaIds,
  mediaType,
  title,
  year,
  poster,
  creator,
  href,
}: MediaReviewsSectionProps) {
  const [followingReviews, setFollowingReviews] = useState<MediaReview[]>([])
  const [publicReviews, setPublicReviews] = useState<MediaReview[]>([])
  const [social, setSocial] = useState<SocialData>({})
  const [loading, setLoading] = useState(true)

  const mediaIdKey = mediaIds.join(",")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const [following, everyone] = await Promise.all([
        fetchFollowingReviewsForMedia(mediaIds),
        fetchPublicReviewsForMedia(mediaIds, 20),
      ])

      if (cancelled) return

      setFollowingReviews(following)
      setPublicReviews(everyone)

      // Batch social data for the "everyone's reviews" section only
      const entryIds = everyone.map((r) => r.entryId)
      if (entryIds.length > 0) {
        const [likedIds, likeCounts, commentCounts] = await Promise.all([
          getLikedDiaryEntryIds(entryIds),
          getLikeCountsForEntries(entryIds),
          getCommentCountsForEntries(entryIds),
        ])

        if (cancelled) return

        const likedSet = new Set(likedIds)
        const next: SocialData = {}
        for (const id of entryIds) {
          next[id] = {
            likeCount: likeCounts[id] ?? 0,
            commentCount: commentCounts[id] ?? 0,
            isLiked: likedSet.has(id),
          }
        }
        setSocial(next)
      }

      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaIdKey])

  const isBook = mediaType === "book"
  const followingLabel = isBook ? "Read by people you follow" : "Watched by people you follow"

  return (
    <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 36 }}>
      {/* ── Following section ── */}
      <section>
        <SectionHeading>{followingLabel}</SectionHeading>
        {loading ? (
          <Skeleton />
        ) : followingReviews.length === 0 ? (
          <EmptyNote>
            {isBook
              ? "No one you follow has read this yet."
              : "No one you follow has logged this yet."}
          </EmptyNote>
        ) : (
          <div>
            {followingReviews.map((review) => (
              <FollowingReviewRow key={review.entryId} review={review} />
            ))}
          </div>
        )}
      </section>

      {/* ── Everyone's reviews ── */}
      <section>
        <SectionHeading>Everyone&apos;s reviews</SectionHeading>
        {loading ? (
          <Skeleton />
        ) : publicReviews.length === 0 ? (
          <EmptyNote>No public reviews yet. Be the first.</EmptyNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {publicReviews.map((review) => {
              const s = social[review.entryId]
              return (
                <ReviewCard
                  key={review.entryId}
                  entryId={review.entryId}
                  mediaId={mediaIds[0]}
                  mediaType={mediaType}
                  title={title}
                  year={year}
                  poster={poster}
                  creator={creator}
                  href={href}
                  rating={review.rating}
                  reelshelfScore={review.reelshelfScore}
                  review={review.review}
                  watchedDate={review.watchedDate}
                  savedAt={review.savedAt}
                  favourite={review.favourite}
                  rewatch={review.rewatch}
                  containsSpoilers={review.containsSpoilers}
                  reviewLayers={review.reviewLayers}
                  ownerUserId={review.userId}
                  ownerUsername={review.username}
                  ownerDisplayName={review.displayName}
                  ownerAvatarUrl={review.avatarUrl}
                  watchedInCinema={review.watchedInCinema}
                  initialLikeCount={s?.likeCount ?? 0}
                  initialCommentCount={s?.commentCount ?? 0}
                  isLiked={s?.isLiked ?? false}
                  attachmentUrl={review.attachmentUrl}
                  attachmentType={review.attachmentType}
                  reviewCoverUrl={review.reviewCoverUrl}
                  reviewCoverSource={review.reviewCoverSource}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
