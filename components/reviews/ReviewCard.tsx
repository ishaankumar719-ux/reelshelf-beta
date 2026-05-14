"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "../AuthProvider";
import { getLayerDefs, hasReviewLayers, EMPTY_REVIEW_LAYERS } from "../../types/diary";
import type { ReviewLayers } from "../../types/diary";
import { toggleDiaryEntryLike } from "../../lib/supabase/likes";
import { createDiaryEntryComment } from "../../lib/supabase/comments";
import type { PublicComment } from "../../lib/supabase/comments";
import { getProfileInitials } from "../../lib/profile";
import AttachmentPicker, { type AttachmentValue } from "../AttachmentPicker";
import { deleteEntryByDbId } from "../../lib/supabase/persistence";
import { useDiaryLog } from "../../hooks/useDiaryLog";

export interface ReviewCardEntry {
  entryId: string;
  mediaId: string;
  mediaType: "movie" | "tv" | "book";
  title: string;
  year: number;
  poster: string | null;
  creator: string | null;
  href: string;
  rating: number | null;
  reelshelfScore: number | null;
  review: string;
  watchedDate: string;
  savedAt: string;
  favourite: boolean;
  rewatch: boolean;
  containsSpoilers: boolean;
  watchedInCinema?: boolean;
  reviewLayers: ReviewLayers | null;
  ownerUserId: string;
  ownerUsername?: string | null;
  ownerDisplayName?: string | null;
  ownerAvatarUrl?: string | null;
  initialLikeCount: number;
  initialCommentCount: number;
  isLiked?: boolean;
  initialComments?: PublicComment[];
  attachmentUrl?: string | null;
  attachmentType?: "image" | "gif" | null;
  reviewCoverUrl?: string | null;
  reviewCoverSource?: "default" | "tmdb_poster" | "tmdb_backdrop" | "upload" | null;
  onDeleted?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatWatchedDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMediaBadgeStyles(mediaType: "movie" | "tv" | "book") {
  if (mediaType === "movie") return { bg: "rgba(59,130,246,0.14)", border: "rgba(96,165,250,0.3)", color: "rgba(219,234,254,0.9)", label: "FILM" };
  if (mediaType === "tv") return { bg: "rgba(20,184,166,0.14)", border: "rgba(45,212,191,0.3)", color: "rgba(204,251,241,0.9)", label: "SERIES" };
  return { bg: "rgba(168,85,247,0.14)", border: "rgba(192,132,252,0.3)", color: "rgba(245,243,255,0.9)", label: "BOOK" };
}

function inferAttachmentType(url: string): "image" | "gif" | null {
  try {
    const { hostname, pathname } = new URL(url);
    const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
    if (hostname.includes("giphy.com") || hostname.includes("tenor.com") || ext === "gif") return "gif";
    if (["jpg", "jpeg", "png", "webp", "avif", "bmp"].includes(ext)) return "image";
    return null;
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniAvatar({
  avatarUrl,
  displayName,
  username,
  size = 32,
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: number;
}) {
  const [imgErr, setImgErr] = useState(false);
  const initials = getProfileInitials({ displayName: displayName ?? null, username: username ?? null });

  return avatarUrl && !imgErr ? (
    <img
      src={avatarUrl}
      alt={displayName || username || "avatar"}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
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
  );
}

function LayerBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.36)", width: 120, flexShrink: 0, lineHeight: 1.3 }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 2,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: "rgba(255,255,255,0.38)",
            borderRadius: 1,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.6)",
          width: 28,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
      </span>
    </div>
  );
}

function ReviewLayersPanel({ mediaType, layers }: { mediaType: "movie" | "tv" | "book"; layers: ReviewLayers }) {
  const [open, setOpen] = useState(false);
  const defs = getLayerDefs(mediaType);
  const filled = defs.filter(({ key }) => layers[key] !== null && layers[key] !== undefined);
  if (filled.length === 0) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: open ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.3)",
          fontSize: 11,
          letterSpacing: "0.06em",
          transition: "color 0.15s ease",
        }}
      >
        <span
          style={{
            fontSize: 8,
            display: "inline-block",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
        Review layers · {filled.length} rated
      </button>

      {open ? (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.06)",
            display: "grid",
            gap: 11,
          }}
        >
          {filled.map(({ key, label }) => (
            <LayerBar key={key} label={label} value={layers[key]!} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentPreview({ url, type }: { url: string; type: "image" | "gif" | null }) {
  const [err, setErr] = useState(false);
  if (err || !url) return null;
  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 10,
        overflow: "hidden",
        maxWidth: 260,
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
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          GIF
        </span>
      ) : null}
      <img
        src={url}
        alt="Attachment"
        style={{ width: "100%", display: "block", maxHeight: 200, objectFit: "cover" }}
        onError={() => setErr(true)}
      />
    </div>
  );
}

function CommentComposer({
  placeholder,
  loading,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  loading: boolean;
  onSubmit: (body: string, attachmentUrl: string | null, attachmentType: "image" | "gif" | null) => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<AttachmentValue | null>(null);
  const canPost = (body.trim().length > 0 || attachment !== null) && !loading;

  function handleSubmit() {
    if (!canPost) return;
    onSubmit(body, attachment?.url ?? null, attachment?.type ?? null);
    setBody("");
    setAttachment(null);
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        placeholder={placeholder}
        rows={3}
        onKeyDown={(e) => {
          // Enter posts; Shift+Enter inserts newline
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        style={{
          width: "100%",
          resize: "none",
          minHeight: 80,
          borderRadius: 12,
          border: "0.5px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(255,255,255,0.82)",
          padding: "10px 12px",
          fontSize: 13,
          lineHeight: 1.6,
          outline: "none",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          boxSizing: "border-box",
        }}
      />

      <AttachmentPicker value={attachment} onChange={setAttachment} compact />

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 999,
              border: "0.5px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color: "rgba(255,255,255,0.38)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canPost}
          style={{
            height: 30,
            padding: "0 14px",
            borderRadius: 999,
            border: "none",
            background: canPost ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)",
            color: canPost ? "black" : "rgba(255,255,255,0.28)",
            fontSize: 12,
            fontWeight: 600,
            cursor: canPost ? "pointer" : "default",
            opacity: loading ? 0.7 : 1,
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          {loading ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  replies,
  currentUserId,
  onReplySubmit,
  replyLoading,
}: {
  comment: PublicComment;
  replies: PublicComment[];
  currentUserId: string | null;
  onReplySubmit: (parentId: string, body: string, attachUrl: string | null, attachType: "image" | "gif" | null) => Promise<void>;
  replyLoading: string | null;
}) {
  const [showReply, setShowReply] = useState(false);

  return (
    <div
      style={{
        borderRadius: 14,
        border: "0.5px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        padding: 12,
        display: "grid",
        gap: 10,
      }}
    >
      {/* Root comment */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <MiniAvatar avatarUrl={comment.avatarUrl} displayName={comment.displayName} username={comment.username} size={30} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
            {comment.username ? (
              <Link
                href={`/u/${encodeURIComponent(comment.username)}`}
                style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}
              >
                @{comment.username}
              </Link>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                @reelshelf
              </span>
            )}
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.68)", fontSize: 13, lineHeight: 1.6, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
            {comment.body}
          </p>
          {comment.attachmentUrl ? (
            <AttachmentPreview url={comment.attachmentUrl} type={comment.attachmentType} />
          ) : null}
          {currentUserId ? (
            <button
              type="button"
              onClick={() => setShowReply((v) => !v)}
              style={{
                marginTop: 8,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: showReply ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.28)",
                fontSize: 11,
                letterSpacing: "0.04em",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {showReply ? "Cancel" : "Reply"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 ? (
        <div style={{ marginLeft: 40, display: "grid", gap: 8 }}>
          {replies.map((reply) => (
            <div key={reply.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <MiniAvatar avatarUrl={reply.avatarUrl} displayName={reply.displayName} username={reply.username} size={24} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  {reply.username ? (
                    <Link
                      href={`/u/${encodeURIComponent(reply.username)}`}
                      style={{ color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}
                    >
                      @{reply.username}
                    </Link>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: 600, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                      @reelshelf
                    </span>
                  )}
                  <span style={{ color: "rgba(255,255,255,0.24)", fontSize: 10, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                    {timeAgo(reply.createdAt)}
                  </span>
                </div>
                <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 1.6, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                  {reply.body}
                </p>
                {reply.attachmentUrl ? (
                  <AttachmentPreview url={reply.attachmentUrl} type={reply.attachmentType} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Reply composer */}
      {showReply ? (
        <div style={{ marginLeft: 40 }}>
          <CommentComposer
            placeholder={`Reply to @${comment.username || "user"}…`}
            loading={replyLoading === comment.id}
            onSubmit={(body, attachUrl, attachType) => {
              void onReplySubmit(comment.id, body, attachUrl, attachType).then(() => setShowReply(false));
            }}
            onCancel={() => setShowReply(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

// ─── Main ReviewCard ──────────────────────────────────────────────────────────

const CARD_CSS = `
  .rs-review-card { transition: border-color 0.2s ease; }
  .rs-review-card:hover { border-color: rgba(255,255,255,0.13) !important; }
  .rs-like-btn:hover { background: rgba(255,255,255,0.1) !important; }
`;

export default function ReviewCard({
  entryId,
  mediaId,
  mediaType,
  title,
  year,
  poster,
  creator,
  href,
  rating,
  reelshelfScore,
  review,
  watchedDate,
  savedAt,
  favourite,
  rewatch,
  containsSpoilers,
  watchedInCinema = false,
  reviewLayers,
  ownerUserId,
  ownerUsername,
  ownerDisplayName,
  ownerAvatarUrl,
  initialLikeCount,
  initialCommentCount,
  isLiked = false,
  initialComments = [],
  attachmentUrl,
  attachmentType,
  reviewCoverUrl,
  reviewCoverSource,
  onDeleted,
}: ReviewCardEntry) {
  const { user } = useAuth();
  const { openLog } = useDiaryLog();
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState<PublicComment[]>(initialComments);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState<string | null>(null);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = !!user && user.id === ownerUserId;
  const badge = getMediaBadgeStyles(mediaType);
  const canLike = !!user && user.id !== ownerUserId;

  function handleEditClick() {
    setMenuOpen(false);
    openLog(
      {
        title,
        media_type: mediaType,
        year,
        poster,
        creator,
        media_id: mediaId,
      },
      {
        rating,
        review,
        watchedDate,
        favourite,
        rewatch,
        containsSpoilers,
        watchedInCinema,
        reviewLayers: reviewLayers ?? EMPTY_REVIEW_LAYERS,
        attachmentUrl: attachmentUrl ?? null,
        attachmentType: attachmentType ?? null,
      }
    );
  }

  async function handleDeleteConfirm() {
    setDeleteLoading(true);
    const { error } = await deleteEntryByDbId(entryId);
    setDeleteLoading(false);
    if (!error) {
      setDeleted(true);
      onDeleted?.();
    } else {
      setConfirmDelete(false);
    }
  }

  if (deleted) return null;
  const showScore = reelshelfScore !== null;
  const showRating = rating !== null;
  const scoresDiffer = showScore && showRating && reelshelfScore !== rating;
  const reviewTrimmed = review.trim();
  const reviewTruncated = reviewTrimmed.length > 220 ? reviewTrimmed.slice(0, 220) + "…" : reviewTrimmed;
  const needsExpand = reviewTrimmed.length > 220;

  const rootComments = comments.filter((c) => !c.parentCommentId);
  const getReplies = useCallback(
    (parentId: string) => comments.filter((c) => c.parentCommentId === parentId),
    [comments]
  );

  async function handleLike() {
    if (!canLike || likeLoading) return;
    setLikeLoading(true);
    const result = await toggleDiaryEntryLike(entryId, liked);
    setLikeLoading(false);
    if (!result.error) {
      setLiked(result.liked);
      setLikeCount((n) => Math.max(0, n + (result.liked ? 1 : -1)));
    }
  }

  async function handlePostComment(
    body: string,
    attachmentUrl: string | null,
    attachmentType: "image" | "gif" | null
  ) {
    setPostLoading(true);
    const result = await createDiaryEntryComment({ diaryEntryId: entryId, body, attachmentUrl, attachmentType });
    setPostLoading(false);
    if (!result.error && result.comment) {
      setComments((prev) => [...prev, result.comment!]);
      setCommentCount((n) => n + 1);
    }
  }

  async function handleReply(
    parentId: string,
    body: string,
    attachmentUrl: string | null,
    attachmentType: "image" | "gif" | null
  ) {
    setReplyLoading(parentId);
    const result = await createDiaryEntryComment({ diaryEntryId: entryId, body, parentCommentId: parentId, attachmentUrl, attachmentType });
    setReplyLoading(null);
    if (!result.error && result.comment) {
      setComments((prev) => [...prev, result.comment!]);
    }
  }

  return (
    <>
      <style>{CARD_CSS}</style>
      <article
        className="rs-review-card"
        style={{
          borderRadius: 16,
          border: "0.5px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.025)",
          overflow: "hidden",
        }}
      >
        {/* ── Header: owner info + time ── */}
        {ownerUsername ? (
          <div
            style={{
              padding: "12px 16px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <MiniAvatar avatarUrl={ownerAvatarUrl} displayName={ownerDisplayName} username={ownerUsername} size={28} />
            <Link
              href={`/u/${encodeURIComponent(ownerUsername)}`}
              style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 500, textDecoration: "none", fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}
            >
              @{ownerUsername}
            </Link>
            <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.24)", fontSize: 11, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
              {timeAgo(savedAt)}
            </span>
            {isOwner ? (
              <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => { setMenuOpen((v) => !v); setConfirmDelete(false); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.3)", fontSize: 16, lineHeight: 1,
                    padding: "4px 6px", borderRadius: 6,
                    transition: "color 0.12s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = menuOpen ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)"; }}
                  aria-label="Entry options"
                >
                  ···
                </button>
                {menuOpen ? (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 60 }}
                      onClick={() => setMenuOpen(false)}
                    />
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", right: 0,
                      zIndex: 61, minWidth: 130,
                      background: "#141420", border: "0.5px solid rgba(255,255,255,0.12)",
                      borderRadius: 10, overflow: "hidden",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                      <button
                        type="button"
                        onClick={handleEditClick}
                        style={{
                          width: "100%", display: "block", padding: "10px 14px",
                          background: "none", border: "none", cursor: "pointer",
                          textAlign: "left", fontSize: 13,
                          color: "rgba(255,255,255,0.78)",
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        Edit entry
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                        style={{
                          width: "100%", display: "block", padding: "10px 14px",
                          background: "none", border: "none", cursor: "pointer",
                          textAlign: "left", fontSize: 13,
                          color: "rgba(239,68,68,0.85)",
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                      >
                        Delete entry
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Delete confirmation ── */}
        {confirmDelete ? (
          <div style={{
            margin: "10px 16px 0",
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.06)",
            border: "0.5px solid rgba(239,68,68,0.2)",
          }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "rgba(255,255,255,0.78)", fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
              Delete this review? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleteLoading}
                style={{
                  padding: "7px 14px", borderRadius: 7, border: "none",
                  background: "rgba(239,68,68,0.75)", color: "white",
                  fontSize: 12, fontWeight: 600, cursor: deleteLoading ? "wait" : "pointer",
                  opacity: deleteLoading ? 0.7 : 1,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteLoading}
                style={{
                  padding: "7px 14px", borderRadius: 7,
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  background: "none", color: "rgba(255,255,255,0.5)",
                  fontSize: 12, cursor: "pointer",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Backdrop cover banner (only when source is tmdb_backdrop) ── */}
        {reviewCoverSource === "tmdb_backdrop" && reviewCoverUrl ? (
          <Link href={href} style={{ textDecoration: "none", display: "block" }}>
            <div style={{ position: "relative", width: "100%", height: 110, overflow: "hidden", background: "#0a0a14" }}>
              <img
                src={reviewCoverUrl}
                alt={title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)",
                pointerEvents: "none",
              }} />
            </div>
          </Link>
        ) : null}

        {/* ── Main body ── */}
        <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* Poster / cover thumbnail */}
          <Link href={href} style={{ textDecoration: "none", flexShrink: 0 }}>
            <div
              style={{
                width: 56,
                height: 84,
                borderRadius: 10,
                overflow: "hidden",
                background: "#18182a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              {(() => {
                const thumbUrl = reviewCoverSource && reviewCoverSource !== "default" && reviewCoverSource !== "tmdb_backdrop" && reviewCoverUrl
                  ? reviewCoverUrl
                  : poster;
                return thumbUrl ? (
                  <img src={thumbUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 20, fontWeight: 700 }}>
                    {title.charAt(0).toUpperCase()}
                  </span>
                );
              })()}
            </div>
          </Link>

          {/* Content */}
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <Link href={href} style={{ textDecoration: "none" }}>
                <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>
                  {title}
                </span>
              </Link>
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: badge.bg,
                  border: `0.5px solid ${badge.border}`,
                  color: badge.color,
                  fontSize: 9,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {badge.label}
              </span>
            </div>

            {/* Meta */}
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.36)", fontSize: 12, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
              {year || ""}
              {creator ? ` · ${creator}` : ""}
            </p>

            {/* Scores */}
            {(showScore || showRating) ? (
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                {showScore ? (
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 3, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                      ReelShelf Score
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 300, letterSpacing: "-0.5px", color: "#EF9F27", fontVariantNumeric: "tabular-nums" }}>
                      {reelshelfScore!.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(239,159,39,0.45)", marginLeft: 3 }}>/10</span>
                  </div>
                ) : null}
                {showRating && (scoresDiffer || !showScore) ? (
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 3, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                      {showScore ? "Your Rating" : "Rating"}
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 300, letterSpacing: "-0.5px", color: "rgba(255,255,255,0.82)", fontVariantNumeric: "tabular-nums" }}>
                      {rating!.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginLeft: 3 }}>/10</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Review text */}
            {reviewTrimmed ? (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.65, fontStyle: "italic", fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                  {reviewExpanded ? reviewTrimmed : reviewTruncated}
                </p>
                {needsExpand ? (
                  <button
                    type="button"
                    onClick={() => setReviewExpanded((v) => !v)}
                    style={{
                      marginTop: 4,
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.36)",
                      fontSize: 11,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    {reviewExpanded ? "Show less" : "Read more"}
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* Entry attachment */}
            {attachmentUrl ? (
              <AttachmentPreview url={attachmentUrl} type={attachmentType ?? null} />
            ) : null}

            {/* Tags + date */}
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {favourite ? (
                <span style={{ color: "#fb7185", fontSize: 11, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>♥ Favourite</span>
              ) : null}
              {rewatch ? (
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(245,158,11,0.12)",
                    border: "0.5px solid rgba(245,158,11,0.22)",
                    color: "#f8c16d",
                    fontSize: 10,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  ↺ Rewatch
                </span>
              ) : null}
              {containsSpoilers ? (
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "rgba(239,68,68,0.1)",
                    border: "0.5px solid rgba(239,68,68,0.2)",
                    color: "#fca5a5",
                    fontSize: 10,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  ⚠ Spoilers
                </span>
              ) : null}
              <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif', marginLeft: "auto" }}>
                Watched {formatWatchedDate(watchedDate)}
              </span>
            </div>

            {/* Review layers */}
            {hasReviewLayers(reviewLayers) ? (
              <ReviewLayersPanel mediaType={mediaType} layers={reviewLayers!} />
            ) : null}
          </div>
        </div>

        {/* ── Footer: social ── */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "0.5px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Like */}
          <button
            type="button"
            className="rs-like-btn"
            onClick={() => void handleLike()}
            disabled={!canLike || likeLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              border: liked ? "0.5px solid rgba(251,113,133,0.4)" : "0.5px solid rgba(255,255,255,0.1)",
              background: liked ? "rgba(251,113,133,0.1)" : "rgba(255,255,255,0.03)",
              color: liked ? "#fb7185" : "rgba(255,255,255,0.45)",
              fontSize: 12,
              cursor: canLike ? "pointer" : "default",
              opacity: likeLoading ? 0.6 : 1,
              transition: "all 0.15s ease",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            <span style={{ fontSize: 13 }}>{liked ? "♥" : "♡"}</span>
            <span>{likeCount > 0 ? likeCount : ""} {likeCount === 1 ? "like" : likeCount > 1 ? "likes" : user && user.id !== ownerUserId ? "Like" : ""}</span>
          </button>

          {/* Comments toggle */}
          <button
            type="button"
            onClick={() => setDiscussionOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              border: discussionOpen ? "0.5px solid rgba(255,255,255,0.15)" : "0.5px solid rgba(255,255,255,0.08)",
              background: discussionOpen ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
              color: discussionOpen ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            <span>💬</span>
            <span>
              {commentCount > 0 ? `${commentCount} comment${commentCount === 1 ? "" : "s"}` : "Discuss"}
            </span>
          </button>
        </div>

        {/* ── Discussion panel ── */}
        {discussionOpen ? (
          <div
            style={{
              padding: "0 16px 16px",
              display: "grid",
              gap: 12,
            }}
          >
            {/* Comment composer */}
            {user ? (
              <CommentComposer
                placeholder="Write a comment…"
                loading={postLoading}
                onSubmit={(body, attachUrl, attachType) => void handlePostComment(body, attachUrl, attachType)}
              />
            ) : (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                <Link href="/auth" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline" }}>Sign in</Link> to join the conversation.
              </p>
            )}

            {/* Comment threads */}
            {rootComments.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {rootComments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    replies={getReplies(comment.id)}
                    currentUserId={user?.id ?? null}
                    onReplySubmit={handleReply}
                    replyLoading={replyLoading}
                  />
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.24)", fontSize: 12, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif' }}>
                No comments yet. Start the conversation.
              </p>
            )}
          </div>
        ) : null}
      </article>
    </>
  );
}
