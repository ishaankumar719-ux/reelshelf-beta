"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import type { ActivityEvent, ActivityType } from "@/lib/activity"
import { toggleDiaryEntryLike } from "@/lib/supabase/likes"
import {
  getCommentsForEntry,
  createDiaryEntryComment,
  type PublicComment,
} from "@/lib/supabase/comments"

// ─── types ───────────────────────────────────────────────────────────────────

interface ActivityCardProps {
  event: ActivityEvent
  initialLikeCount?: number
  initialCommentCount?: number
  initialHasLiked?: boolean
}

// ─── config ──────────────────────────────────────────────────────────────────

type TypeConfig = {
  label: string
  dotColor: string
  badgeColor: string
  badgeBg: string
  badgeBorder: string
  verb: string
}

const TYPE_CONFIG: Record<ActivityType, TypeConfig> = {
  logged: {
    label: "Watched",
    dotColor: "rgba(120,150,255,0.9)",
    badgeColor: "rgba(160,180,255,0.9)",
    badgeBg: "rgba(100,130,255,0.1)",
    badgeBorder: "rgba(100,130,255,0.22)",
    verb: "watched",
  },
  reviewed: {
    label: "Reviewed",
    dotColor: "rgba(250,199,117,0.85)",
    badgeColor: "rgba(250,199,117,0.9)",
    badgeBg: "rgba(250,199,117,0.09)",
    badgeBorder: "rgba(250,199,117,0.24)",
    verb: "reviewed",
  },
  watchlisted: {
    label: "Saved",
    dotColor: "rgba(60,200,140,0.85)",
    badgeColor: "rgba(160,220,160,0.9)",
    badgeBg: "rgba(29,158,117,0.1)",
    badgeBorder: "rgba(29,158,117,0.26)",
    verb: "saved to watchlist",
  },
  finished_series: {
    label: "Finished",
    dotColor: "rgba(190,140,255,0.85)",
    badgeColor: "rgba(200,160,255,0.9)",
    badgeBg: "rgba(160,100,255,0.1)",
    badgeBorder: "rgba(160,100,255,0.24)",
    verb: "finished",
  },
  rushmore: {
    label: "Rushmore",
    dotColor: "rgba(255,150,80,0.85)",
    badgeColor: "rgba(255,175,110,0.9)",
    badgeBg: "rgba(255,120,60,0.09)",
    badgeBorder: "rgba(255,120,60,0.24)",
    verb: "updated",
  },
  challenge_completed: {
    label: "Challenge",
    dotColor: "rgba(255,215,0,0.85)",
    badgeColor: "rgba(255,215,0,0.9)",
    badgeBg: "rgba(255,200,0,0.08)",
    badgeBorder: "rgba(255,200,0,0.22)",
    verb: "completed",
  },
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function resolveMediaHref(
  mediaType: string,
  mediaId: string | null | undefined
): string | null {
  if (!mediaId) return null
  const id = mediaId.replace(/^tmdb-/, "")
  if (mediaType === "tv") return `/series/${id}`
  if (mediaType === "movie") return `/films/${id}`
  return null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  })
}

// ─── icons ────────────────────────────────────────────────────────────────────

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ─── comment panel ───────────────────────────────────────────────────────────

function CommentAvatar({
  url,
  name,
}: {
  url: string | null
  name: string
}) {
  const [err, setErr] = useState(false)
  const initial = (name || "?").charAt(0).toUpperCase()

  if (url && !err) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setErr(true)}
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    )
  }
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        flexShrink: 0,
        background: "linear-gradient(135deg, #534AB7, #1D9E75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        color: "rgba(255,255,255,0.9)",
      }}
    >
      {initial}
    </div>
  )
}

function CommentRow({ comment }: { comment: PublicComment }) {
  const name = comment.displayName ?? comment.username ?? "Someone"
  const profileHref = comment.username ? `/u/${comment.username}` : null

  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        padding: "8px 0",
      }}
    >
      <CommentAvatar url={comment.avatarUrl} name={name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          {profileHref ? (
            <Link
              href={profileHref}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.78)",
                textDecoration: "none",
              }}
            >
              {name}
            </Link>
          ) : (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              {name}
            </span>
          )}
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          {comment.body}
        </p>
      </div>
    </div>
  )
}

function CommentPanel({
  diaryEntryId,
  onCommentAdded,
}: {
  diaryEntryId: string
  onCommentAdded: () => void
}) {
  const [comments, setComments] = useState<PublicComment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLoading(true)
    getCommentsForEntry(diaryEntryId)
      .then(setComments)
      .finally(() => setLoading(false))
  }, [diaryEntryId])

  // Auto-focus textarea once loaded
  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus()
    }
  }, [loading])

  async function handleSubmit() {
    const trimmed = body.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    const result = await createDiaryEntryComment({ diaryEntryId, body: trimmed })
    if (result.error) {
      setSubmitError(result.error)
    } else if (result.comment) {
      setComments((prev) => [...prev, result.comment!])
      onCommentAdded()
      setBody("")
    }
    setSubmitting(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      {loading ? (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.22)",
            padding: "8px 0",
            margin: 0,
          }}
        >
          Loading…
        </p>
      ) : (
        <>
          {comments.length > 0 ? (
            <div>
              {comments.map((c) => (
                <CommentRow key={c.id} comment={c} />
              ))}
            </div>
          ) : (
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.2)",
                fontStyle: "italic",
                margin: "0 0 10px",
              }}
            >
              No comments yet — be the first.
            </p>
          )}

          {/* Composer */}
          <div
            style={{
              marginTop: comments.length > 0 ? 10 : 0,
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment… (⌘↵ to post)"
              rows={2}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
                color: "rgba(255,255,255,0.78)",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
              }}
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!body.trim() || submitting}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: body.trim() && !submitting ? "pointer" : "not-allowed",
                background:
                  body.trim() && !submitting
                    ? "rgba(29,158,117,0.85)"
                    : "rgba(255,255,255,0.06)",
                color:
                  body.trim() && !submitting
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.24)",
                transition: "background 0.15s ease, color 0.15s ease",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {submitting ? "…" : "Post"}
            </button>
          </div>

          {submitError ? (
            <p
              style={{
                fontSize: 11,
                color: "rgba(255,100,100,0.75)",
                margin: "5px 0 0",
              }}
            >
              {submitError}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

// ─── poster ───────────────────────────────────────────────────────────────────

function PosterThumbnail({
  event,
  mediaHref,
}: {
  event: ActivityEvent
  mediaHref: string | null
}) {
  const [err, setErr] = useState(false)

  const inner = event.poster && !err ? (
    <img
      src={event.poster}
      onError={() => setErr(true)}
      alt={event.title}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      loading="lazy"
    />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.12)",
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      {event.title.charAt(0).toUpperCase()}
    </div>
  )

  const shell = (
    <div
      style={{
        width: 52,
        height: 78,
        borderRadius: 8,
        overflow: "hidden",
        background: "linear-gradient(145deg, #14142a, #1c1c36)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}
    >
      {inner}
    </div>
  )

  if (mediaHref) {
    return (
      <Link
        href={mediaHref}
        style={{ display: "block", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {shell}
      </Link>
    )
  }

  return shell
}

// ─── main card ────────────────────────────────────────────────────────────────

export default function ActivityCard({
  event,
  initialLikeCount = 0,
  initialCommentCount = 0,
  initialHasLiked = false,
}: ActivityCardProps) {
  const [hovered, setHovered] = useState(false)
  const [liked, setLiked] = useState(initialHasLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [avatarErr, setAvatarErr] = useState(false)

  // Sync from feed when batch social data arrives
  useEffect(() => { setLiked(initialHasLiked) }, [initialHasLiked])
  useEffect(() => { setLikeCount(initialLikeCount) }, [initialLikeCount])
  useEffect(() => { setCommentCount(initialCommentCount) }, [initialCommentCount])

  const cfg = TYPE_CONFIG[event.type]
  const name = event.profile.display_name ?? event.profile.username ?? "You"
  const initial = name.charAt(0).toUpperCase()
  const profileHref = event.profile.username ? `/u/${event.profile.username}` : null
  const mediaHref = resolveMediaHref(event.media_type, event.media_id)

  const isDiaryEvent = Boolean(event.diary_entry_id)
  const isBatchLogging = event.isBatch && (event.batchCount ?? 0) >= 4
  const isRushmore = event.type === "rushmore"
  const isChallenge = event.type === "challenge_completed"
  const showPoster = !isRushmore && !isChallenge

  async function handleLike() {
    if (!event.diary_entry_id) return
    const next = !liked
    // Optimistic
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    const result = await toggleDiaryEntryLike(event.diary_entry_id, !next)
    if (result.error) {
      // Revert
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
    }
  }

  function renderActionLine() {
    if (isRushmore) {
      return <span style={{ color: "rgba(255,255,255,0.42)" }}>updated their Mount Rushmore</span>
    }
    if (isChallenge) {
      return <span style={{ color: "rgba(255,255,255,0.42)" }}>completed a weekly challenge 🏆</span>
    }
    if (isBatchLogging) {
      return (
        <span style={{ color: "rgba(255,255,255,0.42)" }}>
          {cfg.verb} <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{event.batchCount} films</strong>
        </span>
      )
    }
    return (
      <span style={{ color: "rgba(255,255,255,0.42)" }}>
        {cfg.verb}{" "}
        {mediaHref ? (
          <Link
            href={mediaHref}
            style={{ color: "rgba(255,255,255,0.76)", fontWeight: 500, textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            {event.title}
          </Link>
        ) : (
          <strong style={{ color: "rgba(255,255,255,0.76)", fontWeight: 500 }}>{event.title}</strong>
        )}
        {event.rating ? (
          <span style={{ color: "rgba(250,199,117,0.75)", marginLeft: 7, fontWeight: 500 }}>
            ★ {(event.rating / 2).toFixed(1)}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        padding: "14px 12px",
        margin: "0 -12px",
        transition:
          "background 0.14s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease",
        background: hovered ? "rgba(255,255,255,0.028)" : "transparent",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 6px 28px rgba(0,0,0,0.45)" : "none",
      }}
    >
      {/* ── Main row ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

        {/* Avatar + type dot */}
        <div style={{ flexShrink: 0, position: "relative" }}>
          {!avatarErr && event.profile.avatar_url ? (
            profileHref ? (
              <Link href={profileHref} onClick={(e) => e.stopPropagation()}>
                <img
                  src={event.profile.avatar_url}
                  alt={name}
                  onError={() => setAvatarErr(true)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </Link>
            ) : (
              <img
                src={event.profile.avatar_url}
                alt={name}
                onError={() => setAvatarErr(true)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )
          ) : (
            profileHref ? (
              <Link href={profileHref} onClick={(e) => e.stopPropagation()}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #534AB7, #1D9E75)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  {initial}
                </div>
              </Link>
            ) : (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #534AB7, #1D9E75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {initial}
              </div>
            )
          )}

          {/* Activity type dot */}
          <div
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: cfg.dotColor,
              boxShadow: `0 0 0 2px #08080f`,
            }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Header: name · badge · timestamp */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            {profileHref ? (
              <Link
                href={profileHref}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                  textDecoration: "none",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {name}
              </Link>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                {name}
              </span>
            )}

            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: cfg.badgeColor,
                background: cfg.badgeBg,
                border: `0.5px solid ${cfg.badgeBorder}`,
                borderRadius: 999,
                padding: "2px 7px",
                lineHeight: 1.2,
              }}
            >
              {cfg.label}
            </span>

            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.22)",
                marginLeft: "auto",
                whiteSpace: "nowrap",
              }}
            >
              {timeAgo(event.timestamp)}
            </span>
          </div>

          {/* Action line */}
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            {renderActionLine()}
          </p>

          {/* Review snippet */}
          {event.review && !event.isBatch ? (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 12.5,
                color: "rgba(255,255,255,0.5)",
                fontStyle: "italic",
                lineHeight: 1.58,
                borderLeft: "2px solid rgba(255,255,255,0.09)",
                paddingLeft: 10,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              {event.review}
            </p>
          ) : null}

          {/* Interaction bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 10,
            }}
          >
            {isDiaryEvent ? (
              <>
                {/* Like */}
                <button
                  type="button"
                  onClick={() => void handleLike()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 500,
                    color: liked
                      ? "rgba(255,90,90,0.9)"
                      : "rgba(255,255,255,0.3)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "color 0.15s ease, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)",
                    transform: liked ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  <HeartIcon filled={liked} />
                  {likeCount > 0 ? likeCount : "Like"}
                </button>

                {/* Comment */}
                <button
                  type="button"
                  onClick={() => setCommentsOpen((o) => !o)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 500,
                    color: commentsOpen
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.3)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "color 0.15s ease",
                  }}
                >
                  <ChatIcon />
                  {commentCount > 0
                    ? `${commentCount} comment${commentCount !== 1 ? "s" : ""}`
                    : "Comment"}
                </button>
              </>
            ) : null}

            {/* Open link */}
            {mediaHref && !isBatchLogging && !isRushmore && !isChallenge ? (
              <Link
                href={mediaHref}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.24)",
                  textDecoration: "none",
                  marginLeft: isDiaryEvent ? "auto" : undefined,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  transition: "color 0.12s ease",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                Open ↗
              </Link>
            ) : null}
          </div>
        </div>

        {/* Poster */}
        {showPoster ? (
          isBatchLogging ? (
            <div
              style={{
                width: 52,
                height: 78,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.08)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.28)",
                }}
              >
                ×{event.batchCount}
              </span>
            </div>
          ) : (
            <PosterThumbnail event={event} mediaHref={mediaHref} />
          )
        ) : null}
      </div>

      {/* ── Comment panel ── */}
      {commentsOpen && event.diary_entry_id ? (
        <CommentPanel
          diaryEntryId={event.diary_entry_id}
          onCommentAdded={() => setCommentCount((c) => c + 1)}
        />
      ) : null}
    </div>
  )
}
