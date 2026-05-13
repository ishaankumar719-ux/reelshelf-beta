"use client"

import { useState } from "react"
import type { DisplayBadge } from "@/lib/supabase/badges"
import {
  RARITY_COLOR,
  RARITY_GLOW,
  LEGACY_BORDER_COLOR,
  LEGACY_GLOW_COLOR,
  LEGACY_TEXT_COLOR,
  LEGACY_BG_GRADIENT,
  computeTotalXP,
  getTier,
} from "@/lib/supabase/badges"

const TIER_COLOR: Record<string, string> = {
  Collector:  "rgba(148,163,184,0.55)",
  Enthusiast: "rgba(96,165,250,0.7)",
  Critic:     "rgba(167,139,250,0.75)",
  Curator:    "rgba(251,191,36,0.8)",
  Auteur:     "rgba(251,191,36,1)",
}

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

// ─── Standard badge token ─────────────────────────────────────────────────────

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
            fontFamily: FONT,
          }}
        >
          {badge.earned ? badge.name : "???"}
        </span>
      </button>

      {hovered ? (
        <BadgeTooltip badge={badge} pos={tooltipPos} borderColor={rarityColor} />
      ) : null}
    </div>
  )
}

// ─── Legacy badge token ───────────────────────────────────────────────────────

function LegacyBadgeToken({ badge }: { badge: DisplayBadge }) {
  const [hovered, setHovered] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<"above" | "below">("above")

  function openTooltip(target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect()
    setTooltipPos(rect.top < 160 ? "below" : "above")
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
          gap: 8,
          background: "transparent",
          border: "none",
          padding: "4px 2px",
          cursor: "pointer",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Outer halo ring */}
        <div
          style={{
            position: "relative",
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: `conic-gradient(
              rgba(212,175,55,0.9) 0deg,
              rgba(255,236,130,0.95) 60deg,
              rgba(212,175,55,0.9) 120deg,
              rgba(180,140,30,0.85) 180deg,
              rgba(212,175,55,0.9) 240deg,
              rgba(255,236,130,0.95) 300deg,
              rgba(212,175,55,0.9) 360deg
            )`,
            padding: 1.5,
            boxShadow: hovered
              ? `0 0 24px ${LEGACY_GLOW_COLOR}, 0 0 48px rgba(212,175,55,0.12), 0 4px 20px rgba(0,0,0,0.5)`
              : `0 0 12px ${LEGACY_GLOW_COLOR}`,
            transition: "box-shadow 0.2s ease, transform 0.2s ease",
            transform: hovered ? "scale(1.1)" : "scale(1)",
          }}
        >
          {/* Inner obsidian circle */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: LEGACY_BG_GRADIENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
            }}
          >
            {badge.icon}
          </div>

          {/* Gold pip */}
          <div
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              width: 9,
              height: 9,
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
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: FONT,
          }}
        >
          {badge.name}
        </span>
      </button>

      {hovered ? (
        <LegacyBadgeTooltip badge={badge} pos={tooltipPos} />
      ) : null}
    </div>
  )
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────

function BadgeTooltip({
  badge,
  pos,
  borderColor,
}: {
  badge: DisplayBadge
  pos: "above" | "below"
  borderColor: string
}) {
  return (
    <div
      style={{
        position: "absolute",
        [pos === "above" ? "bottom" : "top"]: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        minWidth: 160,
        maxWidth: 210,
        borderRadius: 12,
        border: `0.5px solid ${badge.earned ? borderColor : "rgba(255,255,255,0.1)"}`,
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
        <span style={{ fontSize: 11, fontWeight: 600, color: badge.earned ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)", fontFamily: FONT }}>
          {badge.earned ? badge.name : "Locked"}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: badge.earned ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)", fontFamily: FONT }}>
        {badge.description}
      </p>
      {badge.earned ? (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: RARITY_COLOR[badge.rarity], flexShrink: 0 }} />
          <span style={{ fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: RARITY_COLOR[badge.rarity], fontFamily: FONT }}>
            {badge.rarity}  ·  +{badge.xp} XP
          </span>
        </div>
      ) : null}
    </div>
  )
}

function LegacyBadgeTooltip({ badge, pos }: { badge: DisplayBadge; pos: "above" | "below" }) {
  return (
    <div
      style={{
        position: "absolute",
        [pos === "above" ? "bottom" : "top"]: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        minWidth: 170,
        maxWidth: 220,
        borderRadius: 12,
        border: `0.5px solid ${LEGACY_BORDER_COLOR}`,
        background: "rgba(8,8,14,0.98)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        padding: "11px 13px",
        boxShadow: `0 16px 48px rgba(0,0,0,0.65), 0 0 16px ${LEGACY_GLOW_COLOR}`,
        pointerEvents: "none",
      }}
    >
      {/* "Legacy" label */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 15 }}>{badge.icon}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: LEGACY_TEXT_COLOR, fontFamily: FONT, letterSpacing: "0.01em" }}>
            {badge.name}
          </div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(212,175,55,0.55)", fontFamily: FONT, marginTop: 1 }}>
            Legacy · Founding Era
          </div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.58, color: "rgba(255,255,255,0.52)", fontFamily: FONT }}>
        {badge.description}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 8, borderTop: `0.5px solid rgba(212,175,55,0.15)` }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: LEGACY_BORDER_COLOR, flexShrink: 0 }} />
        <span style={{ fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: LEGACY_TEXT_COLOR, fontFamily: FONT }}>
          Exclusive  ·  +{badge.xp} XP
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BadgeShelf({ badges }: { badges: DisplayBadge[] }) {
  if (badges.length === 0) return null

  const legacyBadges  = badges.filter((b) => b.category === "legacy" && b.earned)
  const normalBadges  = badges.filter((b) => b.category !== "legacy")
  const earnedNormal  = normalBadges.filter((b) => b.earned)
  const totalXP       = computeTotalXP(badges)
  const tier          = getTier(totalXP)
  const tierColor     = TIER_COLOR[tier] ?? TIER_COLOR.Collector

  return (
    <div style={{ marginTop: 32 }}>

      {/* ── Legacy section (only if user has any) ── */}
      {legacyBadges.length > 0 ? (
        <div
          style={{
            marginBottom: 28,
            padding: "14px 16px",
            borderRadius: 14,
            border: `0.5px solid rgba(212,175,55,0.22)`,
            background: "rgba(212,175,55,0.04)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle corner glow */}
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(212,175,55,0.07), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Section label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: LEGACY_TEXT_COLOR,
                fontFamily: FONT,
              }}
            >
              Legacy
            </span>
            <div style={{ flex: 1, height: "0.5px", background: "rgba(212,175,55,0.18)" }} />
            <span style={{ fontSize: 9, color: "rgba(212,175,55,0.45)", fontFamily: FONT, letterSpacing: "0.04em" }}>
              Founding Era
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {legacyBadges.map((badge) => (
              <LegacyBadgeToken key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Normal badges section ── */}
      {normalBadges.length > 0 ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.34)",
              }}
            >
              Badges
            </span>

            {earnedNormal.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
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
                      fontFamily: FONT,
                    }}
                  >
                    {tier}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

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
            {normalBadges.map((badge) => (
              <BadgeToken key={badge.id} badge={badge} />
            ))}
          </div>

          {earnedNormal.length === 0 ? (
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.22)",
                fontStyle: "italic",
                margin: "8px 0 0",
                fontFamily: FONT,
              }}
            >
              No badges earned yet — start logging to unlock them.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
