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
import { type AttachmentValue } from "@/components/AttachmentPicker"
import { uploadAttachment } from "@/lib/supabase/storage"

// ─── GIPHY ───────────────────────────────────────────────────────────────────

interface GiphyGif {
  id: string
  title: string
  images: {
    fixed_height_small: { url: string }
    downsized: { url: string }
  }
}

async function fetchGifs(query: string): Promise<GiphyGif[]> {
  const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? ""
  if (!key) return []
  try {
    const base = "https://api.giphy.com/v1/gifs"
    const endpoint = query.trim()
      ? `${base}/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=18&rating=g`
      : `${base}/trending?api_key=${key}&limit=18&rating=g`
    const res = await fetch(endpoint)
    if (!res.ok) return []
    const json = (await res.json()) as { data: GiphyGif[] }
    return json.data ?? []
  } catch {
    return []
  }
}

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

function EntryAttachment({ url, type }: { url: string; type: "image" | "gif" | null }) {
  const [err, setErr] = useState(false)
  if (err) return null
  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 10,
        overflow: "hidden",
        maxWidth: "100%",
        border: "0.5px solid rgba(255,255,255,0.08)",
        position: "relative",
      }}
    >
      {type === "gif" ? (
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background: "rgba(0,0,0,0.55)",
            borderRadius: 4,
            padding: "2px 5px",
            fontSize: 9,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          GIF
        </span>
      ) : null}
      <img
        src={url}
        alt="Attachment"
        style={{ width: "100%", display: "block", maxHeight: 240, objectFit: "cover" }}
        onError={() => setErr(true)}
      />
    </div>
  )
}

function inferAttachmentType(url: string): "image" | "gif" | null {
  try {
    const { hostname, pathname } = new URL(url)
    const ext = pathname.split(".").pop()?.toLowerCase() ?? ""
    if (hostname.includes("giphy.com") || hostname.includes("tenor.com") || ext === "gif") return "gif"
    if (["jpg", "jpeg", "png", "webp", "avif", "bmp"].includes(ext)) return "image"
    return null
  } catch {
    return null
  }
}

function CommentRow({ comment }: { comment: PublicComment }) {
  const name = comment.displayName ?? comment.username ?? "Someone"
  const profileHref = comment.username ? `/u/${comment.username}` : null
  const [imgErr, setImgErr] = useState(false)

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
        {comment.attachmentUrl && !imgErr ? (
          <div
            style={{
              marginTop: 8,
              borderRadius: 8,
              overflow: "hidden",
              maxWidth: 240,
              border: "0.5px solid rgba(255,255,255,0.08)",
              position: "relative",
            }}
          >
            {comment.attachmentType === "gif" ? (
              <span
                style={{
                  position: "absolute",
                  top: 5,
                  left: 5,
                  background: "rgba(0,0,0,0.55)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                GIF
              </span>
            ) : null}
            <img
              src={comment.attachmentUrl}
              alt="Attachment"
              style={{ width: "100%", display: "block", maxHeight: 180, objectFit: "cover" }}
              onError={() => setImgErr(true)}
            />
          </div>
        ) : null}
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
  const [attachment, setAttachment] = useState<AttachmentValue | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearch, setGifSearch] = useState("")
  const [gifResults, setGifResults] = useState<GiphyGif[]>([])
  const [gifLoading, setGifLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getCommentsForEntry(diaryEntryId)
      .then(setComments)
      .finally(() => setLoading(false))
  }, [diaryEntryId])

  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus()
    }
  }, [loading])

  useEffect(() => {
    if (!showGifPicker) return
    const delay = gifSearch ? 400 : 0
    const timer = window.setTimeout(async () => {
      setGifLoading(true)
      const gifs = await fetchGifs(gifSearch)
      setGifResults(gifs)
      setGifLoading(false)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [gifSearch, showGifPicker])

  const canSubmit = (body.trim().length > 0 || attachment !== null) && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const result = await createDiaryEntryComment({
      diaryEntryId,
      body: body.trim(),
      attachmentUrl: attachment?.url ?? null,
      attachmentType: attachment?.type ?? null,
    })
    if (result.error) {
      setSubmitError(result.error)
    } else if (result.comment) {
      setComments((prev) => [...prev, result.comment!])
      onCommentAdded()
      setBody("")
      setAttachment(null)
      setShowGifPicker(false)
      setGifSearch("")
    }
    setSubmitting(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter posts; Shift+Enter inserts a newline (default behaviour)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!file) return
    setUploadError(null)
    setUploading(true)
    const result = await uploadAttachment(file)
    setUploading(false)
    if ("error" in result) {
      setUploadError(result.error)
    } else {
      setAttachment({ url: result.url, type: result.type })
    }
  }

  function selectGif(gif: GiphyGif) {
    setAttachment({ url: gif.images.downsized.url, type: "gif" })
    setShowGifPicker(false)
    setGifSearch("")
    setGifResults([])
  }

  function clearAttachment() {
    setAttachment(null)
    setShowGifPicker(false)
    setGifSearch("")
    setUploadError(null)
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
          <div style={{ marginTop: comments.length > 0 ? 10 : 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
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
                disabled={!canSubmit}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  background: canSubmit ? "rgba(29,158,117,0.85)" : "rgba(255,255,255,0.06)",
                  color: canSubmit ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.24)",
                  transition: "background 0.15s ease, color 0.15s ease",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {submitting ? "…" : "Post"}
              </button>
            </div>

            {/* ── Inline attachment controls ── */}
            <div style={{ marginTop: 8 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {attachment ? (
                /* Preview with remove */
                <div style={{ position: "relative", display: "inline-block", borderRadius: 8, overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.1)", maxWidth: 200 }}>
                  <img
                    src={attachment.url}
                    alt="Attachment preview"
                    style={{ width: "100%", display: "block", maxHeight: 130, objectFit: "cover" }}
                  />
                  {attachment.type === "gif" && (
                    <span style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.6)", borderRadius: 3, padding: "1px 5px", fontSize: 9, fontWeight: 700, color: "#fff" }}>GIF</span>
                  )}
                  <button
                    type="button"
                    onClick={clearAttachment}
                    style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.65)", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >×</button>
                </div>
              ) : (
                <>
                  {/* Button row: Image + GIF */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => { setUploadError(null); fileInputRef.current?.click() }}
                      disabled={uploading}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 26, padding: "0 10px", borderRadius: 999, border: "0.5px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: uploading ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)", fontSize: 11, cursor: uploading ? "default" : "pointer", fontFamily: "inherit" }}
                    >
                      <span>📷</span>
                      <span>{uploading ? "Uploading…" : "Image"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowGifPicker((v) => !v)}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 26, padding: "0 10px", borderRadius: 999, border: showGifPicker ? "0.5px solid rgba(255,210,0,0.55)" : "0.5px solid rgba(255,210,0,0.35)", background: showGifPicker ? "rgba(255,210,0,0.2)" : "rgba(255,210,0,0.08)", color: showGifPicker ? "rgba(255,210,0,1)" : "rgba(255,210,0,0.75)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      GIF
                    </button>
                  </div>

                  {/* GIF picker panel */}
                  {showGifPicker && (
                    <div style={{ marginTop: 8, borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.12)", background: "rgba(8,8,18,0.97)", overflow: "hidden" }}>
                      <div style={{ padding: "8px 8px 6px" }}>
                        <input
                          type="text"
                          value={gifSearch}
                          onChange={(e) => setGifSearch(e.target.value)}
                          placeholder="Search GIFs…"
                          autoFocus
                          style={{ width: "100%", borderRadius: 7, border: "0.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", padding: "6px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto", padding: "0 8px 8px" }}>
                        {gifLoading ? (
                          <p style={{ margin: 0, padding: "14px 0", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "inherit" }}>Loading…</p>
                        ) : gifResults.length === 0 ? (
                          <p style={{ margin: 0, padding: "14px 0", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "inherit" }}>
                            {gifSearch ? "No results" : "Loading trending…"}
                          </p>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                            {gifResults.map((gif) => (
                              <button
                                key={gif.id}
                                type="button"
                                onClick={() => selectGif(gif)}
                                style={{ padding: 0, border: "none", background: "rgba(255,255,255,0.04)", cursor: "pointer", borderRadius: 5, overflow: "hidden", aspectRatio: "4/3", display: "block" }}
                              >
                                <img src={gif.images.fixed_height_small.url} alt={gif.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "3px 8px 5px", textAlign: "right" }}>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "inherit" }}>Powered by GIPHY</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {uploadError && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,100,100,0.8)", fontFamily: "inherit" }}>{uploadError}</p>
              )}
            </div>
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
          <span style={{ marginLeft: 7, fontWeight: 400 }}>
            <span style={{ color: "rgba(255,255,255,0.72)", fontVariantNumeric: "tabular-nums" }}>
              {event.rating.toFixed(1)}
            </span>
            <span style={{ color: "rgba(255,255,255,0.28)", marginLeft: 2 }}>/10</span>
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

          {/* Entry attachment */}
          {event.attachmentUrl && !event.isBatch ? (
            <EntryAttachment url={event.attachmentUrl} type={event.attachmentType ?? null} />
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
