"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { DisplayBadge } from "@/lib/supabase/badges";
import {
  RARITY_COLOR,
  RARITY_GLOW,
  LEGACY_GLOW_COLOR,
  LEGACY_TEXT_COLOR,
  LEGACY_BG_GRADIENT,
} from "@/lib/supabase/badges";
import type { BadgeEvalStats } from "@/types/badges";
import { getBadgeProgress } from "@/utils/badgeEvaluator";

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface BadgeDetailsModalProps {
  badge: DisplayBadge;
  onClose: () => void;
  stats?: BadgeEvalStats;
}

export default function BadgeDetailsModal({
  badge,
  onClose,
  stats,
}: BadgeDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  const isLegacy = badge.category === "legacy";
  const rarityColor = isLegacy ? LEGACY_TEXT_COLOR : RARITY_COLOR[badge.rarity];
  const rarityGlow  = isLegacy ? LEGACY_GLOW_COLOR  : RARITY_GLOW[badge.rarity];

  const progress = !badge.earned && !isLegacy && stats
    ? getBadgeProgress(badge.slug, stats)
    : null;

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  const panelBorder = badge.earned
    ? `1px solid ${rarityColor.replace(/[\d.]+\)$/, "0.3)")}`
    : "1px solid rgba(255,255,255,0.08)";

  const panelBackground = isLegacy
    ? "radial-gradient(circle at 30% 20%, rgba(212,175,55,0.1) 0%, rgba(8,8,16,0.99) 60%)"
    : badge.earned
      ? `radial-gradient(circle at 30% 20%, ${rarityGlow} 0%, rgba(8,8,16,0.99) 60%)`
      : "rgba(10,10,18,0.99)";

  const panelShadow = badge.earned
    ? `0 -8px 48px rgba(0,0,0,0.6), 0 0 32px ${rarityGlow}`
    : "0 -8px 48px rgba(0,0,0,0.6)";

  const modal = (
    <>
      <style>{`
        @keyframes bdFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes bsSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>

      {/* Backdrop — clicking closes the modal; flex-center on desktop */}
      <div
        className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm md:flex md:items-center md:justify-center"
        style={{ animation: "bdFadeIn 0.18s ease both" }}
        onPointerDown={onClose}
      >
        {/*
          Panel — on mobile: fixed bottom sheet anchored to viewport floor.
          On desktop (md+): relative inside the flex-center backdrop.
        */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={badge.earned ? badge.name : "Locked badge"}
          className="fixed bottom-0 left-0 right-0 w-full rounded-t-2xl overflow-hidden
                     md:relative md:bottom-auto md:left-auto md:right-auto
                     md:max-w-[360px] md:rounded-2xl"
          style={{
            border: panelBorder,
            background: panelBackground,
            boxShadow: panelShadow,
            animation: "bsSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) both",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Drag handle — mobile visual affordance */}
          <div className="flex justify-center pt-3 md:hidden">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.18)" }}
            />
          </div>

          {/* Close button */}
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close"
            className="absolute top-4 right-4"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "0.5px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
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

          {/* Badge icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 28,
              paddingBottom: 16,
              background: isLegacy
                ? "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)"
                : badge.earned
                  ? `radial-gradient(ellipse 100% 80% at 50% 0%, ${rarityGlow} 0%, transparent 70%)`
                  : "none",
            }}
          >
            {isLegacy && badge.earned ? (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  background: `conic-gradient(
                    rgba(212,175,55,0.9) 0deg, rgba(255,236,130,0.95) 60deg,
                    rgba(212,175,55,0.9) 120deg, rgba(180,140,30,0.85) 180deg,
                    rgba(212,175,55,0.9) 240deg, rgba(255,236,130,0.95) 300deg,
                    rgba(212,175,55,0.9) 360deg)`,
                  padding: 2,
                  boxShadow: `0 0 24px ${LEGACY_GLOW_COLOR}, 0 0 48px rgba(212,175,55,0.1)`,
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
                    fontSize: 34,
                  }}
                >
                  {badge.icon}
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: "50%",
                  border: `2px solid ${badge.earned ? rarityColor : "rgba(255,255,255,0.1)"}`,
                  background: badge.earned
                    ? `radial-gradient(circle at 40% 35%, ${rarityGlow}, rgba(10,10,18,0.95))`
                    : "rgba(255,255,255,0.03)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  boxShadow: badge.earned ? `0 0 20px ${rarityGlow}` : "none",
                  filter: badge.earned ? "none" : "grayscale(1) contrast(1.25)",
                  opacity: badge.earned ? 1 : 0.4,
                }}
              >
                {badge.earned ? badge.icon : "🔒"}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: "0 24px 32px" }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <h2
                style={{
                  margin: "0 0 6px",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: badge.earned
                    ? isLegacy ? LEGACY_TEXT_COLOR : "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.38)",
                  fontFamily: FONT,
                }}
              >
                {badge.earned ? badge.name : badge.hidden ? "???" : badge.name}
              </h2>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {badge.earned ? (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: rarityColor,
                      border: `0.5px solid ${rarityColor.replace(/[\d.]+\)$/, "0.3)")}`,
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontFamily: FONT,
                    }}
                  >
                    {isLegacy ? "Legacy · Founding Era" : badge.rarity}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.26)",
                      border: "0.5px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      padding: "2px 7px",
                      fontFamily: FONT,
                    }}
                  >
                    Locked
                  </span>
                )}
                {badge.earned && (
                  <span style={{ fontSize: 10, color: "rgba(29,200,120,0.8)", fontWeight: 600, fontFamily: FONT }}>
                    +{badge.xp} XP
                  </span>
                )}
              </div>
            </div>

            <p
              style={{
                margin: "0 0 16px",
                fontSize: 13,
                lineHeight: 1.65,
                color: badge.earned ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.3)",
                textAlign: "center",
                fontFamily: FONT,
              }}
            >
              {badge.earned || !badge.hidden
                ? badge.description
                : "Keep exploring ReelShelf to discover this badge."}
            </p>

            {/* Progress bar — locked, trackable badges only */}
            {progress && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
                    {progress.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.45)",
                      fontFamily: FONT,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 500,
                    }}
                  >
                    {progress.current} / {progress.max}
                    {progress.suffix ? ` ${progress.suffix}` : ""}
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (progress.current / progress.max) * 100)}%`,
                      borderRadius: 999,
                      background: rarityColor,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {badge.earned && badge.unlocked_at && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingTop: 14,
                  borderTop: `0.5px solid ${isLegacy ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.07)"}`,
                }}
              >
                <span style={{ fontSize: 12 }}>✓</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
                  Earned {formatDate(badge.unlocked_at)}
                </span>
              </div>
            )}

            {!badge.earned && !badge.hidden && !progress && (
              <div
                style={{
                  paddingTop: 14,
                  borderTop: "0.5px solid rgba(255,255,255,0.06)",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic", fontFamily: FONT }}>
                  Keep going — you'll unlock this one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
