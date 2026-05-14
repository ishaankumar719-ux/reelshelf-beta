"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
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

// ─── Badge detail modal ───────────────────────────────────────────────────────
// Rendered via createPortal directly to document.body so it escapes every
// ancestor overflow / stacking-context / transform constraint.

function BadgeDetailModal({
  badge,
  onClose,
}: {
  badge: DisplayBadge
  onClose: () => void
}) {
  const isLegacy    = badge.category === "legacy"
  const rarityColor = isLegacy ? LEGACY_TEXT_COLOR : RARITY_COLOR[badge.rarity]
  const rarityGlow  = isLegacy ? LEGACY_GLOW_COLOR  : RARITY_GLOW[badge.rarity]
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log("[BadgeShelf] modal mounted — badge:", badge.id, badge.name)

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, badge.id, badge.name])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
  }

  if (!mounted) return null

  const backdrop = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={badge.earned ? badge.name : "Locked badge"}
      onPointerDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "bdFadeIn 0.18s ease both",
      }}
    >
      {/* Keyframe styles — injected at portal root */}
      <style>{`
        @keyframes bdFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes bdSlideUp { from { opacity:0; transform: translateY(18px) scale(0.96) } to { opacity:1; transform:none } }
        @keyframes xpGlow    { 0%,100% { box-shadow:0 0 0 rgba(29,200,120,0) } 50% { box-shadow:0 0 12px rgba(29,200,120,0.4) } }
      `}</style>

      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        role="document"
        onPointerDown={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 20,
          border: `1px solid ${badge.earned ? rarityColor.replace(/[\d.]+\)$/, "0.3)") : "rgba(255,255,255,0.1)"}`,
          background: isLegacy
            ? "radial-gradient(circle at 30% 20%, rgba(212,175,55,0.1) 0%, rgba(8,8,16,0.98) 60%)"
            : badge.earned
              ? `radial-gradient(circle at 30% 20%, ${rarityGlow} 0%, rgba(8,8,16,0.98) 60%)`
              : "rgba(10,10,18,0.98)",
          boxShadow: badge.earned
            ? `0 24px 80px rgba(0,0,0,0.7), 0 0 40px ${rarityGlow}`
            : "0 24px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
          animation: "bdSlideUp 0.22s ease both",
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onPointerDown={e => { e.stopPropagation(); onClose() }}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "0.5px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 14,
            fontFamily: FONT,
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* Icon area */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 32,
          paddingBottom: 20,
          background: isLegacy
            ? "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)"
            : badge.earned
              ? `radial-gradient(ellipse 100% 80% at 50% 0%, ${rarityGlow} 0%, transparent 70%)`
              : "none",
        }}>
          {isLegacy && badge.earned ? (
            <div style={{
              width: 88,
              height: 88,
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
              padding: 2,
              boxShadow: `0 0 24px ${LEGACY_GLOW_COLOR}, 0 0 48px rgba(212,175,55,0.1)`,
            }}>
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: LEGACY_BG_GRADIENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
              }}>
                {badge.icon}
              </div>
            </div>
          ) : (
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: `2px solid ${badge.earned ? rarityColor : "rgba(255,255,255,0.1)"}`,
              background: badge.earned
                ? `radial-gradient(circle at 40% 35%, ${rarityGlow}, rgba(10,10,18,0.95))`
                : "rgba(255,255,255,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              boxShadow: badge.earned ? `0 0 20px ${rarityGlow}` : "none",
              filter: badge.earned ? "none" : "grayscale(1)",
              opacity: badge.earned ? 1 : 0.35,
            }}>
              {badge.earned ? badge.icon : "🔒"}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "0 24px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <h2 style={{
              margin: "0 0 6px",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: badge.earned
                ? (isLegacy ? LEGACY_TEXT_COLOR : "rgba(255,255,255,0.96)")
                : "rgba(255,255,255,0.4)",
              fontFamily: FONT,
            }}>
              {badge.earned ? badge.name : (badge.hidden ? "???" : badge.name)}
            </h2>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {badge.earned ? (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                  color: rarityColor,
                  border: `0.5px solid ${rarityColor.replace(/[\d.]+\)$/, "0.3)")}`,
                  borderRadius: 4,
                  padding: "2px 7px",
                }}>
                  {isLegacy ? "Legacy · Founding Era" : badge.rarity}
                </span>
              ) : (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase" as const,
                  color: "rgba(255,255,255,0.28)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 4,
                  padding: "2px 7px",
                }}>
                  Locked
                </span>
              )}
              {badge.earned && (
                <span style={{
                  fontSize: 10,
                  color: "rgba(29,200,120,0.8)",
                  fontWeight: 600,
                  fontFamily: FONT,
                }}>
                  +{badge.xp} XP
                </span>
              )}
            </div>
          </div>

          <p style={{
            margin: "0 0 16px",
            fontSize: 13,
            lineHeight: 1.65,
            color: badge.earned ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.32)",
            textAlign: "center",
            fontFamily: FONT,
          }}>
            {badge.earned || !badge.hidden ? badge.description : "Keep exploring ReelShelf to discover this badge."}
          </p>

          {badge.earned && badge.unlocked_at && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingTop: 14,
              borderTop: `0.5px solid ${isLegacy ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.07)"}`,
            }}>
              <span style={{ fontSize: 12 }}>✓</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                Earned {formatDate(badge.unlocked_at)}
              </span>
            </div>
          )}

          {!badge.earned && !badge.hidden && (
            <div style={{ paddingTop: 14, borderTop: "0.5px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.22)", fontStyle: "italic", fontFamily: FONT }}>
                Keep going — you'll unlock this one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(backdrop, document.body)
}

// ─── Standard badge token ─────────────────────────────────────────────────────

function BadgeToken({
  badge,
  onSelect,
}: {
  badge: DisplayBadge
  onSelect: (badge: DisplayBadge) => void
}) {
  const [pressed, setPressed] = useState(false)
  const rarityColor = RARITY_COLOR[badge.rarity]
  const rarityGlow  = RARITY_GLOW[badge.rarity]

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    setPressed(true)
    console.log("[BadgeShelf] badge pointerDown — id:", badge.id, "name:", badge.name)
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.stopPropagation()
    setPressed(false)
    console.log("[BadgeShelf] badge pointerUp — calling onSelect")
    onSelect(badge)
  }

  function handlePointerLeave() {
    setPressed(false)
  }

  return (
    // Min 44px tap target on all sides
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      aria-label={badge.earned ? badge.name : (badge.hidden ? "Hidden badge" : `${badge.name} (locked)`)}
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        background: "transparent",
        border: "none",
        padding: "4px 4px",
        cursor: "pointer",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        // Ensure minimum 44px touch target height
        minHeight: 44,
        minWidth: 66,
        // Scale on press for immediate tactile feedback
        transform: pressed ? "scale(0.94)" : "scale(1)",
        transition: "transform 0.1s ease",
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
          boxShadow: badge.earned
            ? pressed
              ? `0 0 24px ${rarityGlow}, 0 2px 8px rgba(0,0,0,0.5)`
              : `0 0 8px ${rarityGlow}`
            : "none",
          filter: badge.earned ? "none" : "grayscale(1)",
          opacity: badge.earned ? 1 : 0.32,
          pointerEvents: "none",
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
              pointerEvents: "none",
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
          pointerEvents: "none",
        }}
      >
        {badge.earned ? badge.name : "???"}
      </span>
    </button>
  )
}

// ─── Legacy badge token ───────────────────────────────────────────────────────

function LegacyBadgeToken({
  badge,
  onSelect,
}: {
  badge: DisplayBadge
  onSelect: (badge: DisplayBadge) => void
}) {
  const [pressed, setPressed] = useState(false)

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    setPressed(true)
    console.log("[BadgeShelf] legacy badge pointerDown — id:", badge.id, "name:", badge.name)
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.stopPropagation()
    setPressed(false)
    console.log("[BadgeShelf] legacy badge pointerUp — calling onSelect")
    onSelect(badge)
  }

  function handlePointerLeave() {
    setPressed(false)
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      aria-label={badge.name}
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        background: "transparent",
        border: "none",
        padding: "4px 4px",
        cursor: "pointer",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        minHeight: 44,
        minWidth: 74,
        transform: pressed ? "scale(0.93)" : "scale(1)",
        transition: "transform 0.1s ease",
      }}
    >
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
          boxShadow: pressed
            ? `0 0 28px ${LEGACY_GLOW_COLOR}, 0 0 52px rgba(212,175,55,0.14), 0 2px 10px rgba(0,0,0,0.6)`
            : `0 0 12px ${LEGACY_GLOW_COLOR}`,
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
            fontSize: 26,
          }}
        >
          {badge.icon}
        </div>

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
          pointerEvents: "none",
        }}
      >
        {badge.name}
      </span>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BadgeShelf({ badges }: { badges: DisplayBadge[] }) {
  const [selectedBadge, setSelectedBadge] = useState<DisplayBadge | null>(null)
  // Track whether we've hydrated (portal requires document)
  const hydrated = useRef(false)
  useEffect(() => { hydrated.current = true }, [])

  if (badges.length === 0) return null

  const legacyBadges  = badges.filter((b) => b.category === "legacy" && b.earned)
  const normalBadges  = badges.filter((b) => b.category !== "legacy")
  const earnedNormal  = normalBadges.filter((b) => b.earned)
  const totalXP       = computeTotalXP(badges)
  const tier          = getTier(totalXP)
  const tierColor     = TIER_COLOR[tier] ?? TIER_COLOR.Collector

  function handleSelect(badge: DisplayBadge) {
    console.log("[BadgeShelf] handleSelect called — badge:", badge.id, badge.name)
    console.log("[BadgeShelf] setting selectedBadge state")
    setSelectedBadge(badge)
  }

  return (
    <div style={{ marginTop: 32 }}>

      {/* Modal — rendered via portal to document.body */}
      {selectedBadge ? (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => {
            console.log("[BadgeShelf] modal closed")
            setSelectedBadge(null)
          }}
        />
      ) : null}

      {/* ── Legacy section ── */}
      {legacyBadges.length > 0 ? (
        <div
          style={{
            marginBottom: 28,
            padding: "14px 16px",
            borderRadius: 14,
            border: `0.5px solid rgba(212,175,55,0.22)`,
            background: "rgba(212,175,55,0.04)",
            position: "relative",
          }}
        >
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

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: LEGACY_TEXT_COLOR,
              fontFamily: FONT,
            }}>
              Legacy
            </span>
            <div style={{ flex: 1, height: "0.5px", background: "rgba(212,175,55,0.18)" }} />
            <span style={{ fontSize: 9, color: "rgba(212,175,55,0.45)", fontFamily: FONT, letterSpacing: "0.04em" }}>
              Founding Era
            </span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {legacyBadges.map((badge) => (
              <LegacyBadgeToken key={badge.id} badge={badge} onSelect={handleSelect} />
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Normal badges ── */}
      {normalBadges.length > 0 ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.34)",
            }}>
              Badges
            </span>

            {earnedNormal.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.3)",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: FONT,
                }}>
                  {totalXP.toLocaleString()} XP
                </span>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 20,
                  padding: "0 8px",
                  borderRadius: 999,
                  border: `0.5px solid ${tierColor}`,
                  background: `${tierColor.replace(/[\d.]+\)$/, "0.1)")}`,
                }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: tierColor,
                    fontFamily: FONT,
                  }}>
                    {tier}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Scroll row — touch-friendly, -webkit-overflow-scrolling for iOS momentum */}
          <div
            style={{
              display: "flex",
              gap: 4,
              overflowX: "auto",
              overflowY: "visible",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              paddingBottom: 8,
              paddingTop: 4,
              // Negative margins let badges breathe without clipping hit areas
              marginLeft: -4,
              marginRight: -4,
              paddingLeft: 4,
              paddingRight: 4,
            } as React.CSSProperties}
            className="[&::-webkit-scrollbar]:hidden"
          >
            {normalBadges.map((badge) => (
              <BadgeToken key={badge.id} badge={badge} onSelect={handleSelect} />
            ))}
          </div>

          {earnedNormal.length === 0 ? (
            <p style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.22)",
              fontStyle: "italic",
              margin: "8px 0 0",
              fontFamily: FONT,
            }}>
              No badges earned yet — start logging to unlock them.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
