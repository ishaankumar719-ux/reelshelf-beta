"use client";

import { useAuth } from "../AuthProvider";
import {
  useReviewReactions,
  REVIEW_REACTION_TYPES,
  type ReviewTargetType,
  type ReviewReactionType,
} from "../../hooks/useReviewReactions";

// ─── Reaction definitions ──────────────────────────────────────────────────────

const REACTIONS: { type: ReviewReactionType; emoji: string; label: string }[] =
  [
    { type: "love", emoji: "❤️", label: "Love" },
    { type: "fire", emoji: "🔥", label: "Fire" },
    { type: "cinema", emoji: "🎬", label: "Cinema" },
    { type: "funny", emoji: "😂", label: "Funny" },
    { type: "mind_blown", emoji: "🤯", label: "Mind blown" },
  ];

const SANS =
  '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReactionTray({
  targetType,
  targetId,
  compact = false,
  isOwn = false,
}: {
  targetType: ReviewTargetType;
  targetId: string;
  compact?: boolean;
  isOwn?: boolean;
}) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  // isOwn disables interaction (owner cannot react to their own review)
  const canReact = currentUserId !== null && !isOwn;

  const { reactions, userReactions, toggleReaction, isLoading } =
    useReviewReactions({ targetType, targetId, currentUserId });

  const hasAnyReaction = REVIEW_REACTION_TYPES.some(
    (t) => reactions[t] > 0 || userReactions.has(t)
  );

  // Invisible at rest when no reactions and viewer can't interact
  if (!canReact && !hasAnyReaction) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: compact ? 3 : 5,
        flexWrap: "wrap",
        padding: compact ? "5px 8px 5px" : "8px 16px 4px",
        borderTop: compact
          ? "none"
          : "0.5px solid rgba(255,255,255,0.05)",
      }}
    >
      {REACTIONS.map(({ type, emoji, label }) => {
        const count = reactions[type];
        const active = userReactions.has(type);

        // When the viewer can't react, only render buttons that have counts
        if (!canReact && count === 0) return null;

        return (
          <button
            key={type}
            type="button"
            title={label}
            aria-label={`${label}${count > 0 ? ` · ${count}` : ""}`}
            aria-pressed={active}
            disabled={!canReact}
            onClick={(e) => {
              console.log("[REACTION] clicked", { targetType, targetId, reactionType: type });
              // Prevent parent card click / Link navigation from firing
              e.stopPropagation();
              e.preventDefault();
              if (canReact) void toggleReaction(type);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: compact ? 3 : 5,
              height: compact ? 28 : 30,
              // Enforce 32px minimum tap target on mobile
              minWidth: 32,
              padding: compact ? "0 6px" : "0 10px",
              borderRadius: 999,
              border: `0.5px solid ${
                active
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(255,255,255,0.08)"
              }`,
              background: active
                ? "rgba(255,255,255,0.09)"
                : "rgba(255,255,255,0.025)",
              color: active
                ? "rgba(255,255,255,0.88)"
                : "rgba(255,255,255,0.5)",
              fontSize: 13,
              cursor: canReact ? "pointer" : "default",
              transition: "border-color 0.13s ease, background 0.13s ease, color 0.13s ease",
              fontFamily: SANS,
              opacity: isLoading ? 0.7 : 1,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span role="img" aria-hidden="true">{emoji}</span>
            {count > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: active
                    ? "rgba(255,255,255,0.62)"
                    : "rgba(255,255,255,0.38)",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: SANS,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
