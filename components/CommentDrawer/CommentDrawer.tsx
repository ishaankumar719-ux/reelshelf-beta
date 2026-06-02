"use client";

import { createPortal } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useAuth } from "../AuthProvider";
import { useReviewComments, type ReviewComment } from "../../hooks/useReviewComments";
import type { ReviewTargetType } from "../../hooks/useReviewReactions";
import { getProfileInitials } from "../../lib/profile";

// ─── Constants ─────────────────────────────────────────────────────────────────

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const MAX_CHARS = 500;
const COUNTER_WARN = 400;

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── MiniAvatar ────────────────────────────────────────────────────────────────

function MiniAvatar({
  avatarUrl,
  username,
  displayName,
  size = 28,
}: {
  avatarUrl: string | null;
  username: string | null;
  displayName: string | null;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        background: "#1e1e1e",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username ?? "User"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: SANS }}>
          {getProfileInitials({ displayName, username })}
        </span>
      )}
    </div>
  );
}

// ─── CommentRow ────────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: ReviewComment;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const isOwn = currentUserId !== null && comment.user_id === currentUserId;
  const displayName = comment.user.display_name || comment.user.username || "Someone";

  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        padding: "8px 0",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
      }}
    >
      <MiniAvatar
        avatarUrl={comment.user.avatar_url}
        username={comment.user.username}
        displayName={comment.user.display_name}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.82)", fontFamily: SANS }}>
            {comment.user.username ? `@${comment.user.username}` : displayName}
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: SANS }}>
            {timeAgo(comment.created_at)}
          </span>
        </div>

        {confirming ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: SANS }}>
              Delete this comment?
            </span>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onDelete(comment.id);
              }}
              style={{
                height: 22,
                padding: "0 8px",
                borderRadius: 999,
                border: "0.5px solid rgba(239,68,68,0.4)",
                background: "rgba(239,68,68,0.12)",
                color: "#fca5a5",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: SANS,
              }}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              style={{
                height: 22,
                padding: "0 8px",
                borderRadius: 999,
                border: "0.5px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.4)",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: SANS,
              }}
            >
              No
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 2 }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.55, fontFamily: SANS, flex: 1, wordBreak: "break-word" }}>
              {comment.body}
            </p>
            {isOwn && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Delete comment"
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "none",
                  padding: "2px 4px",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.22)",
                  fontSize: 12,
                  marginTop: 1,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CommentDrawer({
  isOpen,
  onClose,
  targetType,
  targetId,
  reviewAuthorId,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReviewTargetType;
  targetId: string;
  reviewAuthorId: string;
}) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { comments, addComment, deleteComment, isLoading, isSubmitting } =
    useReviewComments({ targetType, targetId });

  const [body, setBody] = useState("");
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Portal mount guard (matches DiaryToast/DiaryLogModal pattern)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Log open event and focus textarea
  useEffect(() => {
    if (!isOpen) return;
    console.log("[COMMENT] opened", { targetType, targetId });
    // Small delay so the slide-up animation starts before focus
    const t = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(t);
  }, [isOpen, targetType, targetId]);

  // Escape to close + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // Focus trap: Tab cycles within the panel
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || body.length > MAX_CHARS || isSubmitting) return;
    const draft = body;
    setBody("");
    await addComment(draft);
  }, [body, addComment, isSubmitting]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const canPost = body.trim().length > 0 && body.length <= MAX_CHARS && !isSubmitting && !!currentUserId;
  const showCounter = body.length > COUNTER_WARN;
  const counterOverLimit = body.length > MAX_CHARS;

  if (!mounted) return null;
  if (!isOpen) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes cd-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cd-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes cd-modal-in {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .cd-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.62);
          z-index: 9000;
          animation: cd-fade-in 0.18s ease;
        }
        .cd-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          height: 70vh;
          background: #111114;
          border-top: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 18px 18px 0 0;
          z-index: 9001;
          display: flex;
          flex-direction: column;
          animation: cd-slide-up 0.22s cubic-bezier(0.32,0.72,0,1);
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .cd-sheet {
            left: auto;
            right: 24px;
            bottom: 24px;
            width: 380px;
            height: auto;
            max-height: 72vh;
            border-radius: 16px;
            border: 0.5px solid rgba(255,255,255,0.1);
            animation: cd-modal-in 0.18s ease;
          }
        }
        .cd-list {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
          padding: 0 14px;
        }
        .cd-list::-webkit-scrollbar { width: 4px; }
        .cd-list::-webkit-scrollbar-track { background: transparent; }
        .cd-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Backdrop */}
      <div
        className="cd-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="cd-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
      >
        {/* Drag handle (mobile) */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 14px 10px",
            borderBottom: "0.5px solid rgba(255,255,255,0.07)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: SERIF,
              letterSpacing: "-0.3px",
            }}
          >
            Comments
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            style={{
              background: "none",
              border: "none",
              padding: "4px 6px",
              cursor: "pointer",
              color: "rgba(255,255,255,0.45)",
              fontSize: 17,
              lineHeight: 1,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Comment list */}
        <div className="cd-list">
          {isLoading && comments.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.08)",
                  borderTopColor: "rgba(255,255,255,0.38)",
                  animation: "cd-spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes cd-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : comments.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "rgba(255,255,255,0.24)",
                fontSize: 13,
                fontFamily: SANS,
                margin: "28px 0",
              }}
            >
              No comments yet. Be the first.
            </p>
          ) : (
            comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onDelete={deleteComment}
              />
            ))
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            padding: "10px 14px 14px",
            borderTop: "0.5px solid rgba(255,255,255,0.07)",
            background: "#111114",
          }}
        >
          {/* Character counter */}
          {showCounter && (
            <div
              style={{
                textAlign: "right",
                fontSize: 10,
                fontFamily: SANS,
                marginBottom: 5,
                color: counterOverLimit ? "#fca5a5" : "rgba(255,255,255,0.3)",
              }}
            >
              {body.length} / {MAX_CHARS}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment…"
              rows={1}
              aria-label="Write a comment"
              style={{
                flex: 1,
                resize: "none",
                minHeight: 36,
                maxHeight: 120,
                borderRadius: 10,
                border: `0.5px solid ${counterOverLimit ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.88)",
                padding: "8px 10px",
                fontSize: 13,
                lineHeight: 1.55,
                outline: "none",
                fontFamily: SANS,
                overflowY: "auto",
              }}
              onInput={(e) => {
                // Auto-expand
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canPost}
              aria-label="Post comment"
              style={{
                flexShrink: 0,
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                border: "none",
                background: canPost
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.08)",
                color: canPost ? "#0a0a0a" : "rgba(255,255,255,0.22)",
                fontSize: 12,
                fontWeight: 600,
                cursor: canPost ? "pointer" : "default",
                fontFamily: SANS,
                transition: "background 0.12s ease, color 0.12s ease",
              }}
            >
              {isSubmitting ? "…" : "Post"}
            </button>
          </div>

          {!currentUserId && (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: SANS }}>
              Sign in to comment.
            </p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
