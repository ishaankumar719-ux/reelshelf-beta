"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import type { PublicDiaryEntry } from "../lib/publicProfiles";
import { getProfileInitials } from "../lib/profile";
import {
  createDiaryEntryComment,
  getCommentsForDiaryEntries,
  type PublicComment,
} from "../lib/supabase/comments";
import {
  getLikedDiaryEntryIds,
  toggleDiaryEntryLike,
} from "../lib/supabase/likes";

function formatLoggedDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getMediaBadge(mediaType: string) {
  if (mediaType === "movie") return "FILM";
  if (mediaType === "tv") return "SERIES";
  return "BOOK";
}

function formatRecency(date: string) {
  const deltaMs = Date.now() - new Date(date).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return formatLoggedDate(date);
}

export default function PublicDiaryEntriesGrid({
  entries,
  ownerUserId,
}: {
  entries: PublicDiaryEntry[];
  ownerUserId: string;
}) {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentsByEntry, setCommentsByEntry] = useState<Record<string, PublicComment[]>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [commentLoadingKey, setCommentLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    setLikeCounts(
      entries.reduce<Record<string, number>>((accumulator, entry) => {
        accumulator[entry.entryId] = entry.likeCount;
        return accumulator;
      }, {})
    );
    setCommentCounts(
      entries.reduce<Record<string, number>>((accumulator, entry) => {
        accumulator[entry.entryId] = entry.commentCount;
        return accumulator;
      }, {})
    );
  }, [entries]);

  useEffect(() => {
    if (!user) {
      setLikedIds([]);
      return;
    }

    let cancelled = false;

    async function loadLikes() {
      const next = await getLikedDiaryEntryIds(entries.map((entry) => entry.entryId));

      if (!cancelled) {
        setLikedIds(next);
      }
    }

    void loadLikes();

    return () => {
      cancelled = true;
    };
  }, [entries, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      const comments = await getCommentsForDiaryEntries(
        entries.map((entry) => entry.entryId)
      );

      if (cancelled) {
        return;
      }

      const nextCommentsByEntry = comments.reduce<Record<string, PublicComment[]>>(
        (accumulator, comment) => {
          if (!accumulator[comment.diaryEntryId]) {
            accumulator[comment.diaryEntryId] = [];
          }
          accumulator[comment.diaryEntryId].push(comment);
          return accumulator;
        },
        {}
      );

      setCommentsByEntry(nextCommentsByEntry);
      setCommentCounts((current) => {
        const next = { ...current };

        for (const entry of entries) {
          next[entry.entryId] = nextCommentsByEntry[entry.entryId]?.length || 0;
        }

        return next;
      });
    }

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [entries]);

  async function handleToggle(entryId: string) {
    if (!user || user.id === ownerUserId || loadingId) {
      return;
    }

    const currentlyLiked = likedIds.includes(entryId);
    setLoadingId(entryId);

    const result = await toggleDiaryEntryLike(entryId, currentlyLiked);

    setLoadingId(null);

    if (result.error) {
      return;
    }

    setLikedIds((current) =>
      result.liked
        ? Array.from(new Set([...current, entryId]))
        : current.filter((value) => value !== entryId)
    );
    setLikeCounts((current) => ({
      ...current,
      [entryId]: Math.max(
        0,
        (current[entryId] || 0) + (result.liked ? 1 : -1)
      ),
    }));
  }

  async function handlePostComment(entryId: string, parentCommentId?: string | null) {
    if (!user) {
      return;
    }

    const key = parentCommentId ? `${entryId}:${parentCommentId}` : entryId;
    const body = parentCommentId ? replyDrafts[key] || "" : commentDrafts[entryId] || "";

    setCommentLoadingKey(key);
    const result = await createDiaryEntryComment({
      diaryEntryId: entryId,
      parentCommentId: parentCommentId || null,
      body,
    });
    setCommentLoadingKey(null);

    if (result.error || !result.comment) {
      return;
    }

    setCommentsByEntry((current) => ({
      ...current,
      [entryId]: [...(current[entryId] || []), result.comment!],
    }));
    setCommentCounts((current) => ({
      ...current,
      [entryId]: (current[entryId] || 0) + 1,
    }));

    if (parentCommentId) {
      setReplyDrafts((current) => ({
        ...current,
        [key]: "",
      }));
      setReplyingTo((current) => ({
        ...current,
        [entryId]: null,
      }));
    } else {
      setCommentDrafts((current) => ({
        ...current,
        [entryId]: "",
      }));
    }
  }

  const likedIdSet = useMemo(() => new Set(likedIds), [likedIds]);

  return (
    <div className="public-profile-recent">
      {entries.map((entry) => {
        const liked = likedIdSet.has(entry.entryId);
        const likeCount = likeCounts[entry.entryId] ?? entry.likeCount;
        const comments = commentsByEntry[entry.entryId] || [];
        const rootComments = comments.filter((comment) => !comment.parentCommentId);
        const commentCount = commentCounts[entry.entryId] ?? entry.commentCount;

        return (
          <article
            key={entry.entryId}
            style={{
              height: "100%",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
              padding: 12,
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 0,
            }}
          >
            <Link
              href={entry.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: "2 / 3",
                  borderRadius: 14,
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
                  marginBottom: 12,
                }}
              >
                {entry.poster ? (
                  <img
                    src={entry.poster}
                    alt={entry.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                      objectFit: "cover",
                    }}
                  />
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    padding: "6px 8px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#e5e7eb",
                    fontSize: 10,
                    lineHeight: 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {getMediaBadge(entry.mediaType)}
                </span>
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: 12,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {formatLoggedDate(entry.savedAt)}
                </span>
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.2,
                  letterSpacing: "-0.3px",
                }}
              >
                {entry.title}
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#9ca3af",
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {entry.year}
                {entry.creator ? ` · ${entry.creator}` : ""}
              </p>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "#cfcfcf",
                  fontSize: 14,
                  lineHeight: 1.65,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {entry.review?.trim()
                  ? entry.review.slice(0, 140) +
                    (entry.review.length > 140 ? "..." : "")
                  : typeof entry.rating === "number"
                    ? `${entry.rating.toFixed(1)} / 10`
                    : "Logged to the shelf."}
              </p>
            </Link>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                style={{
                  color: "#9ca3af",
                  fontSize: 12,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {likeCount} like{likeCount === 1 ? "" : "s"}
              </span>
              <span
                style={{
                  color: "#9ca3af",
                  fontSize: 12,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {commentCount} comment{commentCount === 1 ? "" : "s"}
              </span>

              {user && user.id !== ownerUserId ? (
                <button
                  type="button"
                  onClick={() => void handleToggle(entry.entryId)}
                  disabled={loadingId === entry.entryId}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 999,
                    border: liked
                      ? "1px solid rgba(255,255,255,0.14)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: liked ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    color: liked ? "white" : "#d1d5db",
                    fontSize: 12,
                    fontFamily: "Arial, sans-serif",
                    cursor: loadingId === entry.entryId ? "wait" : "pointer",
                    opacity: loadingId === entry.entryId ? 0.75 : 1,
                  }}
                >
                  {loadingId === entry.entryId
                    ? "Saving..."
                    : liked
                      ? "Liked"
                      : "Like"}
                </button>
              ) : (
                <span
                  style={{
                    color: "#6b7280",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {user ? "Your entry" : "Sign in to like"}
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "grid",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#7f7f7f",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Discussion
                </p>

                {user ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <textarea
                      value={commentDrafts[entry.entryId] || ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [entry.entryId]: event.target.value,
                        }))
                      }
                      placeholder="Write a comment on this entry"
                      rows={3}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        minHeight: 84,
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        color: "white",
                        padding: "12px 14px",
                        fontSize: 13,
                        lineHeight: 1.6,
                        outline: "none",
                        fontFamily: "Arial, sans-serif",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => void handlePostComment(entry.entryId)}
                        disabled={commentLoadingKey === entry.entryId}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "white",
                          color: "black",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "Arial, sans-serif",
                          cursor:
                            commentLoadingKey === entry.entryId ? "wait" : "pointer",
                          opacity: commentLoadingKey === entry.entryId ? 0.75 : 1,
                        }}
                      >
                        {commentLoadingKey === entry.entryId ? "Posting..." : "Comment"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "#6b7280",
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    Sign in to join the conversation.
                  </p>
                )}
              </div>

              {rootComments.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {rootComments.map((comment) => {
                    const replies = comments.filter(
                      (reply) => reply.parentCommentId === comment.id
                    );
                    const replyKey = `${entry.entryId}:${comment.id}`;
                    const showReply = replyingTo[entry.entryId] === comment.id;

                    return (
                      <div
                        key={comment.id}
                        style={{
                          display: "grid",
                          gap: 10,
                          borderRadius: 18,
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(255,255,255,0.025)",
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              overflow: "hidden",
                              background:
                                "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              display: "grid",
                              placeItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            {comment.avatarUrl ? (
                              <img
                                src={comment.avatarUrl}
                                alt={comment.displayName || comment.username || "Comment avatar"}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  color: "rgba(255,255,255,0.7)",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  fontFamily: "Arial, sans-serif",
                                }}
                              >
                                {getProfileInitials({
                                  displayName: comment.displayName,
                                  username: comment.username,
                                })}
                              </span>
                            )}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  color: "#f3f4f6",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  fontFamily: "Arial, sans-serif",
                                }}
                              >
                                @{comment.username || "reelshelf"}
                              </span>
                              <span
                                style={{
                                  color: "#7f7f7f",
                                  fontSize: 11,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  fontFamily: "Arial, sans-serif",
                                }}
                              >
                                {formatRecency(comment.createdAt)}
                              </span>
                            </div>
                            <p
                              style={{
                                margin: "8px 0 0",
                                color: "#d1d5db",
                                fontSize: 13,
                                lineHeight: 1.65,
                                fontFamily: "Arial, sans-serif",
                              }}
                            >
                              {comment.body}
                            </p>
                            {user ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyingTo((current) => ({
                                    ...current,
                                    [entry.entryId]:
                                      current[entry.entryId] === comment.id
                                        ? null
                                        : comment.id,
                                  }))
                                }
                                style={{
                                  marginTop: 8,
                                  height: 30,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  background: "rgba(255,255,255,0.03)",
                                  color: "#d1d5db",
                                  fontSize: 11,
                                  fontFamily: "Arial, sans-serif",
                                  cursor: "pointer",
                                }}
                              >
                                {showReply ? "Cancel reply" : "Reply"}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {replies.length > 0 ? (
                          <div
                            style={{
                              marginLeft: 44,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            {replies.map((reply) => (
                              <div
                                key={reply.id}
                                style={{
                                  borderRadius: 16,
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  background: "rgba(255,255,255,0.02)",
                                  padding: 10,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "#f3f4f6",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      fontFamily: "Arial, sans-serif",
                                    }}
                                  >
                                    @{reply.username || "reelshelf"}
                                  </span>
                                  <span
                                    style={{
                                      color: "#7f7f7f",
                                      fontSize: 10,
                                      letterSpacing: "0.08em",
                                      textTransform: "uppercase",
                                      fontFamily: "Arial, sans-serif",
                                    }}
                                  >
                                    {formatRecency(reply.createdAt)}
                                  </span>
                                </div>
                                <p
                                  style={{
                                    margin: "8px 0 0",
                                    color: "#d1d5db",
                                    fontSize: 12,
                                    lineHeight: 1.65,
                                    fontFamily: "Arial, sans-serif",
                                  }}
                                >
                                  {reply.body}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {showReply ? (
                          <div
                            style={{
                              marginLeft: 44,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <textarea
                              value={replyDrafts[replyKey] || ""}
                              onChange={(event) =>
                                setReplyDrafts((current) => ({
                                  ...current,
                                  [replyKey]: event.target.value,
                                }))
                              }
                              placeholder={`Reply to @${comment.username || "user"}`}
                              rows={3}
                              style={{
                                width: "100%",
                                resize: "vertical",
                                minHeight: 78,
                                borderRadius: 16,
                                border: "1px solid rgba(255,255,255,0.08)",
                                background: "rgba(255,255,255,0.03)",
                                color: "white",
                                padding: "12px 14px",
                                fontSize: 13,
                                lineHeight: 1.6,
                                outline: "none",
                                fontFamily: "Arial, sans-serif",
                              }}
                            />
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  void handlePostComment(entry.entryId, comment.id)
                                }
                                disabled={commentLoadingKey === replyKey}
                                style={{
                                  height: 34,
                                  padding: "0 12px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  background: "white",
                                  color: "black",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: "Arial, sans-serif",
                                  cursor:
                                    commentLoadingKey === replyKey
                                      ? "wait"
                                      : "pointer",
                                  opacity: commentLoadingKey === replyKey ? 0.75 : 1,
                                }}
                              >
                                {commentLoadingKey === replyKey
                                  ? "Replying..."
                                  : "Reply"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "#6b7280",
                    fontSize: 12,
                    lineHeight: 1.6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  No comments yet. Start the conversation.
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
