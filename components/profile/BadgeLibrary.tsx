"use client"

import { createPortal } from "react-dom"
import { useEffect, useRef, useState } from "react"
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

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const RARITY_LABEL: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
}

const TIER_COLOR: Record<string, string> = {
  Collector:  "rgba(148,163,184,0.6)",
  Enthusiast: "rgba(96,165,250,0.75)",
  Critic:     "rgba(167,139,250,0.8)",
  Curator:    "rgba(251,191,36,0.85)",
  Auteur:     "rgba(251,191,36,1)",
}

// ── Category tabs ─────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",     label: "All"     },
  { key: "legacy",  label: "Legacy"  },
  { key: "logging", label: "Logging" },
  { key: "reviews", label: "Reviews" },
  { key: "social",  label: "Social"  },
  { key: "tv",      label: "TV"      },
  { key: "books",   label: "Books"   },
  { key: "hidden",  label: "Hidden"  },
] as const

type TabKey = (typeof TABS)[number]["key"]

function getSection(b: DisplayBadge): Exclude<TabKey, "all"> {
  if (b.hidden) return "hidden"
  switch (b.category) {
    case "legacy":  return "legacy"
    case "tv":      return "tv"
    case "book":    return "books"
    case "reviews": return "reviews"
    case "social":  return "social"
    default:        return "logging" // film, cinema, streaks, prestige, trivia
  }
}

// ── Requirement text helper ───────────────────────────────────────────────────

function fmtRequirement(type: string, value: number): string {
  const map: Record<string, (n: number) => string> = {
    manual:          ()  => "Manually awarded",
    film_count:      (n) => `Log ${n} film${n > 1 ? "s" : ""}`,
    tv_count:        (n) => `Log ${n} TV show${n > 1 ? "s" : ""}`,
    book_count:      (n) => `Log ${n} book${n > 1 ? "s" : ""}`,
    review_count:    (n) => `Write ${n} review${n > 1 ? "s" : ""}`,
    streak_days:     (n) => `${n}-day logging streak`,
    cinema_count:    (n) => `Log ${n} cinema visit${n > 1 ? "s" : ""}`,
    badge_count:     (n) => `Earn ${n} badge${n > 1 ? "s" : ""}`,
    follower_count:  (n) => `Gain ${n} follower${n > 1 ? "s" : ""}`,
    list_count:      (n) => `Create ${n} list${n > 1 ? "s" : ""}`,
  }
  return (map[type] ?? ((n: number) => `${type.replace(/_/g, " ")} × ${n}`))(value)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({
  badge,
  selected,
  onSelect,
}: {
  badge: DisplayBadge
  selected: boolean
  onSelect: () => void
}) {
  const isLegacy    = badge.category === "legacy"
  const rarityColor = RARITY_COLOR[badge.rarity] ?? "rgba(148,163,184,0.75)"
  const rarityGlow  = RARITY_GLOW[badge.rarity]  ?? "rgba(148,163,184,0.12)"
  const [pressed, setPressed] = useState(false)

  const borderColor = selected
    ? isLegacy ? "rgba(212,175,55,0.55)" : rarityColor.replace(/[\d.]+\)$/, "0.45)")
    : badge.earned
      ? isLegacy ? "rgba(212,175,55,0.22)" : rarityColor.replace(/[\d.]+\)$/, "0.14)")
      : "rgba(255,255,255,0.07)"

  const bgColor = selected && badge.earned
    ? isLegacy
      ? "radial-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(10,10,18,0.97) 70%)"
      : `radial-gradient(135deg, ${rarityGlow} 0%, rgba(10,10,18,0.97) 70%)`
    : badge.earned
      ? isLegacy ? "rgba(212,175,55,0.04)" : "rgba(255,255,255,0.025)"
      : "rgba(255,255,255,0.015)"

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      aria-label={badge.earned ? badge.name : badge.hidden ? "Hidden badge" : `${badge.name} — locked`}
      style={{
        flexShrink: 0,
        width: 128,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "20px 12px 16px",
        borderRadius: 16,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        boxShadow: selected && badge.earned
          ? isLegacy
            ? `0 0 28px rgba(212,175,55,0.12), 0 4px 24px rgba(0,0,0,0.4)`
            : `0 0 24px ${rarityGlow}, 0 4px 24px rgba(0,0,0,0.4)`
          : "none",
        cursor: "pointer",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        transform: pressed ? "scale(0.95)" : "scale(1)",
        transition: "transform 0.1s ease, border-color 0.18s, background 0.18s, box-shadow 0.18s",
        scrollSnapAlign: "center",
      }}
    >
      {/* Icon wrapper */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {isLegacy && badge.earned ? (
          // Gold conic-gradient ring for legacy
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: `conic-gradient(
                rgba(212,175,55,0.9) 0deg, rgba(255,236,130,0.95) 60deg,
                rgba(212,175,55,0.9) 120deg, rgba(180,140,30,0.85) 180deg,
                rgba(212,175,55,0.9) 240deg, rgba(255,236,130,0.95) 300deg,
                rgba(212,175,55,0.9) 360deg)`,
              padding: 2,
              boxShadow: selected
                ? `0 0 24px ${LEGACY_GLOW_COLOR}, 0 0 48px rgba(212,175,55,0.1)`
                : `0 0 10px ${LEGACY_GLOW_COLOR}`,
              transition: "box-shadow 0.2s",
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
                fontSize: 28,
              }}
            >
              {badge.icon}
            </div>
          </div>
        ) : (
          // Standard icon
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              border: `1.5px solid ${badge.earned ? rarityColor : "rgba(255,255,255,0.1)"}`,
              background: badge.earned
                ? `radial-gradient(circle at 40% 35%, ${rarityGlow}, rgba(10,10,18,0.96))`
                : "rgba(255,255,255,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              boxShadow: badge.earned
                ? selected
                  ? `0 0 22px ${rarityGlow}, 0 0 44px ${rarityGlow}`
                  : `0 0 8px ${rarityGlow}`
                : "none",
              filter: badge.earned ? "none" : "grayscale(1) contrast(1.25)",
              opacity: badge.earned ? 1 : 0.35,
              transition: "box-shadow 0.2s",
            }}
          >
            {badge.hidden && !badge.earned ? "?" : badge.icon}
          </div>
        )}

        {/* Lock overlay */}
        {!badge.earned && !badge.hidden && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.28)",
              backdropFilter: "blur(1.5px)",
            }}
          >
            <span style={{ fontSize: 16, opacity: 0.65 }}>🔒</span>
          </div>
        )}

        {/* Earned rarity pip */}
        {badge.earned && (
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: isLegacy ? LEGACY_BORDER_COLOR : rarityColor,
              border: "2.5px solid rgba(10,10,18,1)",
              boxShadow: isLegacy
                ? `0 0 5px ${LEGACY_GLOW_COLOR}`
                : `0 0 5px ${rarityColor}`,
            }}
          />
        )}
      </div>

      {/* Badge name */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.01em",
          lineHeight: 1.35,
          textAlign: "center",
          color: badge.earned
            ? isLegacy ? LEGACY_TEXT_COLOR : "rgba(255,255,255,0.9)"
            : "rgba(255,255,255,0.26)",
          fontFamily: FONT,
          maxWidth: 104,
          wordBreak: "break-word",
        }}
      >
        {badge.hidden && !badge.earned ? "???" : badge.name}
      </span>

      {/* Rarity + earned indicator */}
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: badge.earned
            ? isLegacy ? LEGACY_TEXT_COLOR : rarityColor
            : "rgba(255,255,255,0.16)",
          fontFamily: FONT,
        }}
      >
        {badge.earned ? (RARITY_LABEL[badge.rarity] ?? badge.rarity) : "Locked"}
      </span>
    </button>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  badge,
  onDismiss,
}: {
  badge: DisplayBadge
  onDismiss: () => void
}) {
  const isLegacy    = badge.category === "legacy"
  const rarityColor = isLegacy ? LEGACY_TEXT_COLOR : RARITY_COLOR[badge.rarity]
  const rarityGlow  = isLegacy ? LEGACY_GLOW_COLOR  : RARITY_GLOW[badge.rarity]

  return (
    <div
      style={{
        borderTop: "0.5px solid rgba(255,255,255,0.07)",
        background: "rgba(8,8,14,0.98)",
        padding: "20px 20px 24px",
        animation: "detailIn 0.2s cubic-bezier(0.32,0.72,0,1) both",
        flexShrink: 0,
      }}
    >
      <style>{`@keyframes detailIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }`}</style>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", maxWidth: 680, margin: "0 auto" }}>
        {/* Large icon */}
        <div style={{ fontSize: 48, lineHeight: 1, flexShrink: 0, opacity: badge.earned ? 1 : 0.4, filter: badge.earned ? "none" : "grayscale(1)" }}>
          {badge.hidden && !badge.earned ? "❓" : badge.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: badge.earned ? "rgba(255,255,255,0.93)" : "rgba(255,255,255,0.36)", fontFamily: FONT }}>
                {badge.hidden && !badge.earned ? "???" : badge.name}
              </p>
              {badge.earned && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 3,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: rarityColor,
                    border: `0.5px solid ${rarityColor.replace(/[\d.]+\)$/, "0.3)")}`,
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontFamily: FONT,
                  }}
                >
                  {isLegacy ? "Legacy" : (RARITY_LABEL[badge.rarity] ?? badge.rarity)}
                </span>
              )}
            </div>

            {/* XP chip */}
            {badge.earned && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(29,200,120,0.85)", flexShrink: 0, fontFamily: FONT }}>
                +{badge.xp} XP
              </span>
            )}
          </div>

          <p style={{ margin: "6px 0 14px", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.46)", fontFamily: FONT }}>
            {badge.earned || !badge.hidden ? badge.description : "Keep exploring ReelShelf to discover this badge."}
          </p>

          {/* Metadata grid */}
          <div style={{ display: "flex", gap: "12px 28px", flexWrap: "wrap" }}>
            <MetaItem
              label="Requirement"
              value={fmtRequirement(badge.requirement_type, badge.requirement_value)}
            />
            {badge.earned && badge.unlocked_at ? (
              <MetaItem
                label="Unlocked"
                value={fmtDate(badge.unlocked_at)}
                valueColor="rgba(29,200,120,0.8)"
              />
            ) : (
              <MetaItem label="Status" value="Locked" />
            )}
            {!isLegacy && (
              <MetaItem
                label="Rarity"
                value={RARITY_LABEL[badge.rarity] ?? badge.rarity}
                valueColor={badge.earned ? rarityColor : undefined}
              />
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "0.5px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.38)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function MetaItem({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div>
      <span style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.26)", marginBottom: 3, fontFamily: FONT }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: valueColor ?? "rgba(255,255,255,0.58)", fontFamily: FONT }}>
        {value}
      </span>
    </div>
  )
}

// ── Main library overlay ──────────────────────────────────────────────────────

interface BadgeLibraryProps {
  badges: DisplayBadge[]
  onClose: () => void
}

export default function BadgeLibrary({ badges, onClose }: BadgeLibraryProps) {
  const [mounted, setMounted]         = useState(false)
  const [activeTab, setActiveTab]     = useState<TabKey>("all")
  const [selected, setSelected]       = useState<DisplayBadge | null>(null)
  const carouselRef                   = useRef<HTMLDivElement>(null)
  const tabBarRef                     = useRef<HTMLDivElement>(null)

  const totalXP   = computeTotalXP(badges)
  const tier      = getTier(totalXP)
  const tierColor = TIER_COLOR[tier] ?? TIER_COLOR.Collector
  const earned    = badges.filter((b) => b.earned).length

  // ── Mount + Escape key ──────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // ── Mouse-wheel → horizontal scroll ────────────────────────────────────────

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      // If the user is explicitly scrolling horizontally, let it pass naturally.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      e.preventDefault()
      el!.scrollLeft += e.deltaY
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [mounted, activeTab]) // re-attach when tab changes re-renders the carousel

  // ── Filtered badges for current tab ────────────────────────────────────────

  const visibleBadges =
    activeTab === "all"
      ? badges
      : badges.filter((b) => getSection(b) === activeTab)

  // Badge count per tab for the count chips
  const countByTab: Partial<Record<TabKey, number>> = {}
  for (const b of badges) {
    const s = getSection(b)
    countByTab[s] = (countByTab[s] ?? 0) + 1
  }
  countByTab["all"] = badges.length

  if (!mounted) return null

  return createPortal(
    <>
      <style>{`
        @keyframes libIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes libUp  { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
      `}</style>

      {/* ── Full-screen overlay ─────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Badge Library"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "radial-gradient(ellipse at 50% 0%, rgba(30,20,60,0.9) 0%, rgba(5,5,10,0.98) 60%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: FONT,
          animation: "libIn 0.2s ease both",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 14px",
            borderBottom: "0.5px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close badge library"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "0.5px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
              }}
            >
              ✕
            </button>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Badge Library
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
              {earned} / {badges.length}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.24)" }}>·</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
              {totalXP.toLocaleString()} XP
            </span>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 22,
                padding: "0 9px",
                borderRadius: 999,
                border: `0.5px solid ${tierColor}`,
                background: tierColor.replace(/[\d.]+\)$/, "0.1)"),
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: tierColor }}>
                {tier}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────────── */}
        <div
          ref={tabBarRef}
          style={{
            display: "flex",
            gap: 2,
            padding: "10px 16px",
            overflowX: "auto",
            scrollbarWidth: "none",
            flexShrink: 0,
            borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          }}
          className="[&::-webkit-scrollbar]:hidden"
        >
          {TABS.filter(({ key }) => key === "all" || (countByTab[key] ?? 0) > 0).map(({ key, label }) => {
            const isActive = activeTab === key
            const count = countByTab[key] ?? 0
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key)
                  setSelected(null)
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: isActive ? "1px solid rgba(255,255,255,0.16)" : "1px solid transparent",
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.38)",
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: "0.01em",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.12s",
                  fontFamily: FONT,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {label}
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontVariantNumeric: "tabular-nums",
                      color: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.22)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Carousel ───────────────────────────────────────────────────────── */}
        <div
          ref={carouselRef}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            overflowX: "auto",
            overflowY: "hidden",
            padding: "24px 20px",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x proximity",
            cursor: "grab",
            minHeight: 0, // allow flex shrink
          }}
          className="[&::-webkit-scrollbar]:hidden"
          onPointerDown={(e) => {
            const el = e.currentTarget
            el.style.cursor = "grabbing"
            el.style.scrollSnapType = "none"
          }}
          onPointerUp={(e) => {
            e.currentTarget.style.cursor = "grab"
            e.currentTarget.style.scrollSnapType = "x proximity"
          }}
        >
          {visibleBadges.length === 0 ? (
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.2)",
                fontSize: 13,
                fontStyle: "italic",
                fontFamily: FONT,
              }}
            >
              No badges in this category yet.
            </div>
          ) : (
            visibleBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                selected={selected?.id === badge.id}
                onSelect={() =>
                  setSelected((prev) => (prev?.id === badge.id ? null : badge))
                }
              />
            ))
          )}
        </div>

        {/* ── Detail panel ───────────────────────────────────────────────────── */}
        {selected && (
          <DetailPanel badge={selected} onDismiss={() => setSelected(null)} />
        )}
      </div>
    </>,
    document.body
  )
}
