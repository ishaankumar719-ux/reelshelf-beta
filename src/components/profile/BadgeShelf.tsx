"use client"

import { useState } from "react"
import type { DisplayBadge } from "@/lib/supabase/badges"
import { RARITY_COLOR, RARITY_GLOW, computeTotalXP, getTier } from "@/lib/supabase/badges"

const TIER_COLOR: Record<string, string> = {
  Collector:  "rgba(148,163,184,0.55)",
  Enthusiast: "rgba(96,165,250,0.7)",
  Critic:     "rgba(167,139,250,0.75)",
  Curator:    "rgba(251,191,36,0.8)",
  Auteur:     "rgba(251,191,36,1)",
}

function BadgeToken({ badge }: { badge: DisplayBadge }) {
  const [hovered, setHovered] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<"above" | "below">("above")
  const rarityColor = RARITY_COLOR[badge.rarity]
  const rarityGlow  = RARITY_GLOW[badge.rarity]

  function openTooltip(target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect()
    setTooltipPos(rect.top < 140 ? "below" : "above")
    setHovered(true)
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onMouseEnter={(e) => openTooltip(e.currentTarget)}
        onMouseLeave={() => setHovered(false)}
        onFocus={(e) => openTooltip(e.currentTarget)}
        onBlur={() => setHovered(false)}
        aria-label={badge.name}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          border: "none",
          padding: "4px 2px",
          cursor: badge.earned ? "pointer" : "default",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Circle */}
        <div
          style={{
            position: "relative",
            width: 62,
            height: 62,
            borderRadius: "50%",
            border: `1.5px solid ${badge.earned ? rarityColor : "rgba(255,255,255,0.1)"}`,
            background: badge.earned
              ? `radial-gradient(circle at 40% 35%, ${rarityGlow}, rgba(10,10,18,0.95))`
              : "rgba(255,255,255,0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            boxShadow: badge.earned && hovered
              ? `0 0 18px ${rarityGlow}, 0 4px 16px rgba(0,0,0,0.4)`
              : badge.earned
                ? `0 0 8px ${rarityGlow}`
                : "none",
            transition: "box-shadow 0.18s ease, transform 0.18s ease",
            transform: badge.earned && hovered ? "scale(1.08)" : "scale(1)",
            filter: badge.earned ? "none" : "grayscale(1)",
            opacity: badge.earned ? 1 : 0.28,
          }}
        >
          {badge.icon}

          {/* Rarity pip */}
          {badge.earned ? (
            <div
              style={{
                position: "absolute",
                bottom: 3,
                right: 3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: rarityColor,
                border: "1.5px solid rgba(10,10,18,1)",
              }}
            />
          ) : null}
        </div>

        {/* Name */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.03em",
            color: badge.earned ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.22)",
            textAlign: "center",
            maxWidth: 66,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          {badge.earned ? badge.name : "???"}
        </span>
      </button>

      {/* Tooltip */}
      {hovered ? (
        <div
          style={{
            position: "absolute",
            [tooltipPos === "above" ? "bottom" : "top"]: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 80,
            minWidth: 160,
            maxWidth: 210,
            borderRadius: 12,
            border: `0.5px solid ${badge.earned ? rarityColor : "rgba(255,255,255,0.1)"}`,
            background: "rgba(8,8,16,0.97)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: "10px 12px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 16 }}>{badge.icon}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: badge.earned ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {badge.earned ? badge.name : "Locked"}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.55,
              color: badge.earned ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {badge.description}
          </p>
          {badge.earned ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: RARITY_COLOR[badge.rarity],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: RARITY_COLOR[badge.rarity],
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {badge.rarity}  ·  +{badge.xp} XP
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function BadgeShelf({ badges }: { badges: DisplayBadge[] }) {
  if (badges.length === 0) return null

  const earnedBadges = badges.filter((b) => b.earned)
  const totalXP = computeTotalXP(badges)
  const tier = getTier(totalXP)
  const tierColor = TIER_COLOR[tier] ?? TIER_COLOR.Collector

  return (
    <div style={{ marginTop: 32 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span
          style={{
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.34)",
          }}
        >
          Badges
        </span>

        {earnedBadges.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                fontVariantNumeric: "tabular-nums",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
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
                background: `${tierColor.replace(/[\d.]+\)$/, "0.1)")}`,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tierColor,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {tier}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Scrollable badge row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 6,
          paddingTop: 2,
        }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {badges.map((badge) => (
          <BadgeToken key={badge.id} badge={badge} />
        ))}
      </div>

      {earnedBadges.length === 0 ? (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.22)",
            fontStyle: "italic",
            margin: "8px 0 0",
            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          }}
        >
          No badges earned yet — start logging to unlock them.
        </p>
      ) : null}
    </div>
  )
}
