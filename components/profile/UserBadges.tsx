"use client";

import { useState } from "react";
import type { DisplayBadge } from "@/lib/supabase/badges";
import {
  RARITY_COLOR,
  RARITY_GLOW,
  LEGACY_BORDER_COLOR,
  LEGACY_GLOW_COLOR,
  LEGACY_TEXT_COLOR,
  LEGACY_BG_GRADIENT,
  computeTotalXP,
  getTier,
} from "@/lib/supabase/badges";
import type { BadgeEvalStats } from "@/types/badges";
import { getBadgeProgress } from "@/utils/badgeEvaluator";
import BadgeDetailsModal from "./BadgeDetailsModal";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';

const TIER_COLOR: Record<string, string> = {
  Collector:  "rgba(148,163,184,0.55)",
  Enthusiast: "rgba(96,165,250,0.7)",
  Critic:     "rgba(167,139,250,0.75)",
  Curator:    "rgba(251,191,36,0.8)",
  Auteur:     "rgba(251,191,36,1)",
};

// Ordered display sections — legacy first, hidden last.
const CATEGORY_ROWS: Array<{ key: string; label: string }> = [
  { key: "legacy",  label: "Legacy"  },
  { key: "logging", label: "Logging" },
  { key: "reviews", label: "Reviews" },
  { key: "social",  label: "Social"  },
  { key: "tv",      label: "TV"      },
  { key: "books",   label: "Books"   },
  { key: "hidden",  label: "Hidden"  },
];

// Map the DB category string + hidden flag to a display section key.
function getDisplaySection(badge: DisplayBadge): string {
  if (badge.hidden) return "hidden";
  switch (badge.category) {
    case "legacy":  return "legacy";
    case "tv":      return "tv";
    case "book":    return "books";
    case "reviews": return "reviews";
    case "social":  return "social";
    default:        return "logging"; // film, cinema, streaks, prestige, trivia
  }
}

// ── Badge token ───────────────────────────────────────────────────────────────

function BadgeToken({
  badge,
  onSelect,
  stats,
}: {
  badge: DisplayBadge;
  onSelect: (badge: DisplayBadge) => void;
  stats?: BadgeEvalStats;
}) {
  const [pressed, setPressed] = useState(false);
  const isLegacy    = badge.category === "legacy";
  const rarityColor = RARITY_COLOR[badge.rarity];
  const rarityGlow  = RARITY_GLOW[badge.rarity];

  const progress = !badge.earned && !isLegacy && stats
    ? getBadgeProgress(badge.slug, stats)
    : null;

  // ── Legacy (earned) ─────────────────────────────────────────────────────────
  if (isLegacy && badge.earned) {
    return (
      <button
        type="button"
        onPointerDown={(e) => { e.stopPropagation(); setPressed(true); }}
        onPointerUp={(e) => { e.stopPropagation(); setPressed(false); onSelect(badge); }}
        onPointerLeave={() => setPressed(false)}
        aria-label={badge.name}
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          padding: "4px 6px",
          cursor: "pointer",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          minHeight: 44,
          minWidth: 76,
          transform: pressed ? "scale(0.93)" : "scale(1)",
          transition: "transform 0.1s ease",
        }}
      >
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: "50%",
            background: `conic-gradient(
              rgba(212,175,55,0.9) 0deg, rgba(255,236,130,0.95) 60deg,
              rgba(212,175,55,0.9) 120deg, rgba(180,140,30,0.85) 180deg,
              rgba(212,175,55,0.9) 240deg, rgba(255,236,130,0.95) 300deg,
              rgba(212,175,55,0.9) 360deg)`,
            padding: 1.5,
            boxShadow: pressed
              ? `0 0 28px ${LEGACY_GLOW_COLOR}, 0 0 52px rgba(212,175,55,0.14)`
              : `0 0 10px ${LEGACY_GLOW_COLOR}`,
            transition: "box-shadow 0.15s ease",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: LEGACY_BG_GRADIENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {badge.icon}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: LEGACY_BORDER_COLOR,
              border: "1.5px solid rgba(10,10,18,1)",
              boxShadow: `0 0 4px ${LEGACY_GLOW_COLOR}`,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: LEGACY_TEXT_COLOR,
            textAlign: "center",
            maxWidth: 70,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: FONT,
            pointerEvents: "none",
          }}
        >
          {badge.name}
        </span>
      </button>
    );
  }

  // ── Standard badge token ───────────────────────────────────────────────────
  return (
    <button
      type="button"
      onPointerDown={(e) => { e.stopPropagation(); setPressed(true); }}
      onPointerUp={(e) => { e.stopPropagation(); setPressed(false); onSelect(badge); }}
      onPointerLeave={() => setPressed(false)}
      aria-label={badge.earned ? badge.name : badge.hidden ? "Hidden badge" : `${badge.name} (locked)`}
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        background: "transparent",
        border: "none",
        padding: "4px 6px",
        cursor: "pointer",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        minHeight: 44,
        minWidth: 66,
        transform: pressed ? "scale(0.93)" : "scale(1)",
        transition: "transform 0.1s ease",
      }}
    >
      {/* Icon circle — locked: opacity-40 + grayscale + contrast-125 */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: `1.5px solid ${badge.earned ? rarityColor : "rgba(255,255,255,0.1)"}`,
          background: badge.earned
            ? `radial-gradient(circle at 40% 35%, ${rarityGlow}, rgba(10,10,18,0.95))`
            : "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: badge.earned
            ? pressed
              ? `0 0 22px ${rarityGlow}, 0 2px 8px rgba(0,0,0,0.5)`
              : `0 0 8px ${rarityGlow}`
            : "none",
          filter: badge.earned ? "none" : "grayscale(1) contrast(1.25)",
          opacity: badge.earned ? 1 : 0.4,
          position: "relative",
          pointerEvents: "none",
        }}
      >
        {badge.hidden && !badge.earned ? "?" : badge.icon}
        {badge.earned && (
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: rarityColor,
              border: "1.5px solid rgba(10,10,18,1)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Badge name */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.03em",
          color: badge.earned ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.22)",
          textAlign: "center",
          maxWidth: 66,
          lineHeight: 1.3,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: FONT,
          pointerEvents: "none",
        }}
      >
        {badge.hidden && !badge.earned ? "???" : badge.name}
      </span>

      {/* Locked indicator: progress text if trackable, else "Locked" */}
      {!badge.earned && (
        <span
          style={{
            fontSize: 8,
            color: "rgba(255,255,255,0.28)",
            fontFamily: FONT,
            letterSpacing: "0.02em",
            textAlign: "center",
            maxWidth: 70,
            lineHeight: 1.3,
            pointerEvents: "none",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {progress
            ? `${progress.current} / ${progress.max} ${progress.suffix}`
            : "Locked"}
        </span>
      )}
    </button>
  );
}

// ── Category row ──────────────────────────────────────────────────────────────

function CategoryRow({
  label,
  badges,
  onSelect,
  stats,
}: {
  label: string;
  badges: DisplayBadge[];
  onSelect: (badge: DisplayBadge) => void;
  stats?: BadgeEvalStats;
}) {
  const isLegacy = label === "Legacy";
  const isHidden = label === "Hidden";

  const labelColor = isLegacy
    ? LEGACY_TEXT_COLOR
    : isHidden
      ? "rgba(167,139,250,0.6)"
      : "rgba(255,255,255,0.32)";

  const dividerColor = isLegacy
    ? "rgba(212,175,55,0.18)"
    : isHidden
      ? "rgba(167,139,250,0.1)"
      : "rgba(255,255,255,0.07)";

  const countColor = isLegacy
    ? "rgba(212,175,55,0.45)"
    : isHidden
      ? "rgba(167,139,250,0.35)"
      : "rgba(255,255,255,0.2)";

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: labelColor,
            fontFamily: FONT,
          }}
        >
          {label}
        </span>
        <div style={{ flex: 1, height: "0.5px", background: dividerColor }} />
        <span
          style={{
            fontSize: 9,
            color: countColor,
            fontFamily: FONT,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {badges.filter((b) => b.earned).length} / {badges.length}
        </span>
      </div>

      {/* Horizontal scroll rail — bleeds to parent edges on mobile, no scrollbar */}
      <div className="flex overflow-x-auto -mx-4 px-4 snap-x hide-scrollbar"
        style={{
          gap: 6,
          overflowY: "visible",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 8,
          paddingTop: 4,
        } as React.CSSProperties}
      >
        {badges.map((badge) => (
          <div key={badge.id} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
            <BadgeToken badge={badge} onSelect={onSelect} stats={stats} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface UserBadgesProps {
  badges: DisplayBadge[];
  isOwner?: boolean;
  stats?: BadgeEvalStats;
}

export default function UserBadges({ badges, isOwner = false, stats }: UserBadgesProps) {
  const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null);

  if (badges.length === 0) return null;

  // Group badges into display sections.
  // Rule: hidden locked badges are invisible to non-owners.
  const grouped = new Map<string, DisplayBadge[]>();
  for (const badge of badges) {
    if (badge.hidden && !badge.earned && !isOwner) continue;
    const section = getDisplaySection(badge);
    const existing = grouped.get(section) ?? [];
    existing.push(badge);
    grouped.set(section, existing);
  }

  const totalXP   = computeTotalXP(badges);
  const tier      = getTier(totalXP);
  const tierColor = TIER_COLOR[tier] ?? TIER_COLOR.Collector;
  const earned    = badges.filter((b) => b.earned).length;

  return (
    <div style={{ marginTop: 32 }}>
      {selectedBadge && (
        <BadgeDetailsModal
          badge={selectedBadge}
          stats={stats}
          onClose={() => setSelectedBadge(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.34)",
            fontFamily: FONT,
          }}
        >
          Achievements
        </span>

        {earned > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.28)",
                fontVariantNumeric: "tabular-nums",
                fontFamily: FONT,
              }}
            >
              {totalXP.toLocaleString()} XP
            </span>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 20,
                padding: "0 8px",
                borderRadius: 999,
                border: `0.5px solid ${tierColor}`,
                background: tierColor.replace(/[\d.]+\)$/, "0.1)"),
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tierColor,
                  fontFamily: FONT,
                }}
              >
                {tier}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Category sections — skip empty ones */}
      {CATEGORY_ROWS.filter(({ key }) => (grouped.get(key)?.length ?? 0) > 0).map(({ key, label }) => (
        <CategoryRow
          key={key}
          label={label}
          badges={grouped.get(key)!}
          onSelect={setSelectedBadge}
          stats={stats}
        />
      ))}

      {earned === 0 && (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.2)",
            fontStyle: "italic",
            margin: "8px 0 0",
            fontFamily: FONT,
          }}
        >
          No badges earned yet — start logging to unlock them.
        </p>
      )}
    </div>
  );
}
