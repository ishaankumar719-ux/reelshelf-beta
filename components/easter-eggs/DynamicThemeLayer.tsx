"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { matchRegistryEntry, GLOBAL_KILL_SWITCH, type RegistryEntry } from "@/lib/easter-eggs/registry"
import { getThemeMode, THEME_MODE_KEY } from "@/lib/easterEggs"
import { useDiaryLog } from "@/hooks/useDiaryLog"

// ─── Global keyframes ─────────────────────────────────────────────────────────
// Injected once. All animations use transform/opacity only — no layout props.

const KEYFRAMES = `
@keyframes rs2-fadein   { from { opacity:0 } to { opacity:1 } }
@keyframes rs2-shimmer  { from { background-position:-200% center } to { background-position:200% center } }
@keyframes rs2-pulse    { 0%,100%{opacity:1} 50%{opacity:0.28} }
@keyframes rs2-twinkle  { 0%,100%{opacity:0.85} 50%{opacity:0.35} }
@keyframes rs2-drift-x  { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
@keyframes rs2-rise     { 0%{transform:translateY(0) scale(1);opacity:0} 10%{opacity:1} 90%{opacity:.7} 100%{transform:translateY(-48px) scale(.7);opacity:0} }
@keyframes rs2-spot     { 0%,100%{background-position:30% 70%} 50%{background-position:70% 30%} }
@keyframes rs2-frost    { 0%,100%{opacity:1} 50%{opacity:.45} }
@keyframes rs2-wave     { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-12px)} }
@keyframes rs2-glitch   { 0%,3%,6%,100%{opacity:0} 1%,4%{opacity:1} }
@keyframes rs2-sparkle  { 0%,100%{opacity:0;transform:scale(.5)} 10%,90%{opacity:1;transform:scale(1)} 50%{transform:scale(1.2)} }
@keyframes rs2-space-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
@keyframes rs2-lightning { 0%,97%,100%{opacity:0} 98%{opacity:.22} 99%{opacity:.08} }
@keyframes rs2-rain-fall { from{background-position:0 0} to{background-position:0 40px} }

/* Disable all animations when user prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .rs2-anim { animation: none !important; }
}
/* Mobile: hide excess particles (nth-child n+4 hidden on narrow screens) */
@media (max-width: 767px) {
  .rs2-particle-extra { display: none !important; }
}
`

// ─── URL parser ───────────────────────────────────────────────────────────────

type ActiveMedia = {
  id: string
  mediaType: "movie" | "tv" | "book"
  title: string | null
}

function parseMediaFromPath(pathname: string): ActiveMedia | null {
  const filmMatch = pathname.match(/^\/films\/(\d+)/)
  if (filmMatch) return { id: filmMatch[1], mediaType: "movie", title: null }

  const seriesMatch = pathname.match(/^\/series\/(\d+)/)
  if (seriesMatch) return { id: seriesMatch[1], mediaType: "tv", title: null }

  const bookMatch = pathname.match(/^\/books\/([^/]+)/)
  if (bookMatch) {
    const slug = decodeURIComponent(bookMatch[1])
    // Infer title from slug for title-based matching
    const inferredTitle = slug.replace(/[-_]/g, " ")
    return { id: slug, mediaType: "book", title: inferredTitle }
  }

  return null
}

// ─── Effects ──────────────────────────────────────────────────────────────────
// Each effect: position:fixed, pointer-events:none, z-index 1–5
// Intensity param scales final opacity. No layout-triggering properties.

function SubtleWeb({ intensity }: { intensity: number }) {
  const o = intensity * 0.32
  return (
    <>
      {(["tl", "br"] as const).map((c) => (
        <div key={c} style={{
          position: "fixed",
          top: c === "tl" ? 58 : undefined, bottom: c === "br" ? 0 : undefined,
          left: c === "tl" ? 0  : undefined, right: c === "br" ? 0 : undefined,
          width: 100, height: 100, pointerEvents: "none", zIndex: 3, opacity: o,
        }}>
          <svg viewBox="0 0 100 100" width="100" height="100" style={{
            display: "block",
            transform: c === "br" ? "scale(-1,-1)" : undefined,
            transformOrigin: c === "br" ? "50px 50px" : undefined,
          }}>
            <line x1="0" y1="0" x2="100" y2="0"  stroke="#b01818" strokeWidth="0.5" opacity="0.2"/>
            <line x1="0" y1="0" x2="0"   y2="100" stroke="#b01818" strokeWidth="0.5" opacity="0.2"/>
            <line x1="0" y1="0" x2="100" y2="33"  stroke="#b01818" strokeWidth="0.4" opacity="0.14"/>
            <line x1="0" y1="0" x2="33"  y2="100" stroke="#b01818" strokeWidth="0.4" opacity="0.14"/>
            <line x1="0" y1="0" x2="100" y2="100" stroke="#b01818" strokeWidth="0.35" opacity="0.10"/>
            <path d="M 25 0 Q 12 12 0 25" fill="none" stroke="#b01818" strokeWidth="0.45" opacity="0.18"/>
            <path d="M 50 0 Q 25 25 0 50" fill="none" stroke="#b01818" strokeWidth="0.38" opacity="0.13"/>
            <path d="M 75 0 Q 37 37 0 75" fill="none" stroke="#b01818" strokeWidth="0.32" opacity="0.09"/>
          </svg>
        </div>
      ))}
    </>
  )
}

function GoldShimmer({ intensity }: { intensity: number }) {
  return (
    <div className="rs2-anim" style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
      background: "linear-gradient(120deg, transparent 30%, rgba(220,175,40,0.07) 50%, transparent 70%)",
      backgroundSize: "200% 100%",
      animation: "rs2-shimmer 6s ease-in-out infinite",
      opacity: intensity * 0.9,
    }} />
  )
}

function TempoPulse({ intensity }: { intensity: number }) {
  return (
    <div className="rs2-anim" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 2,
      background: "linear-gradient(90deg, transparent 5%, rgba(255,230,0,0.35) 30%, rgba(255,240,80,0.55) 50%, rgba(255,230,0,0.35) 70%, transparent 95%)",
      pointerEvents: "none", zIndex: 3,
      animation: "rs2-pulse 2.4s ease-in-out infinite",
      opacity: intensity,
    }} />
  )
}

const STARS = [
  "18px 95px","160px 240px","310px 55px","82px 420px","450px 170px",
  "198px 345px","530px 90px","70px 530px","385px 300px","248px 46px",
  "112px 185px","495px 365px","38px 285px","610px 215px","325px 485px",
  "172px 145px","435px 72px","26px 365px","565px 135px","92px 475px",
  "275px 195px","715px 315px","148px 62px","485px 425px","355px 125px",
].map((s, i) =>
  `${s} ${i % 3 === 0 ? "2px" : "1px"} rgba(255,255,255,${i % 2 === 0 ? "0.72" : "0.42"})`
).join(",")

function Starfield({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 0%, rgba(10,20,60,0.28) 0%, transparent 60%)",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, left: 0, width: 1, height: 1,
        pointerEvents: "none", zIndex: 2,
        boxShadow: STARS,
        animation: "rs2-twinkle 7s ease-in-out infinite",
        opacity: intensity * 0.9,
      }} />
    </>
  )
}

const SAND_MOTES = [
  { left: "12%", delay: "0s",   dur: "10s", size: 3, cls: "" },
  { left: "30%", delay: "2.1s", dur: "12s", size: 2, cls: "" },
  { left: "52%", delay: "0.7s", dur: "9s",  size: 3, cls: "" },
  { left: "70%", delay: "3.4s", dur: "11s", size: 2, cls: "rs2-particle-extra" },
  { left: "85%", delay: "1.5s", dur: "13s", size: 2, cls: "rs2-particle-extra" },
  { left: "4%",  delay: "4.0s", dur: "14s", size: 2, cls: "rs2-particle-extra" },
]

function SandDrift({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(0deg, rgba(110,55,0,0.18) 0%, rgba(85,38,0,0.09) 30%, transparent 65%)",
        opacity: intensity,
      }} />
      {SAND_MOTES.map((m, i) => (
        <div key={i} className={`rs2-anim${m.cls ? " " + m.cls : ""}`} style={{
          position: "fixed", bottom: "5%", left: m.left,
          width: m.size, height: m.size, borderRadius: "50%",
          background: "rgba(215,165,55,0.65)",
          pointerEvents: "none", zIndex: 2,
          animation: `rs2-drift-x ${m.dur} ease-in-out infinite`,
          animationDelay: m.delay,
          opacity: intensity * 0.8,
        }} />
      ))}
    </>
  )
}

function NoirRain({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "rgba(0,5,18,0.14)",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "repeating-linear-gradient(173deg, transparent 0%, transparent 97%, rgba(70,110,190,0.045) 97%, rgba(70,110,190,0.045) 100%)",
        backgroundSize: "3px 38px",
        animation: "rs2-rain-fall 2s linear infinite",
        opacity: intensity * 0.85,
      }} />
    </>
  )
}

function NeonRain({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "rgba(18,6,0,0.12)",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "repeating-linear-gradient(169deg, transparent 0%, transparent 96%, rgba(190,90,22,0.048) 96%, rgba(190,90,22,0.048) 100%)",
        backgroundSize: "3px 34px",
        animation: "rs2-rain-fall 1.6s linear infinite",
        opacity: intensity * 0.9,
      }} />
      {/* Fog layer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "30%",
        background: "linear-gradient(0deg, rgba(100,50,0,0.12) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity * 0.7,
      }} />
    </>
  )
}

function MusicalSpotlight({ intensity }: { intensity: number }) {
  return (
    <div className="rs2-anim" style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: "radial-gradient(ellipse 55% 55% at 30% 70%, rgba(175,120,255,0.12) 0%, transparent 60%), radial-gradient(ellipse 45% 45% at 75% 25%, rgba(100,60,200,0.08) 0%, transparent 55%)",
      backgroundSize: "200% 200%",
      animation: "rs2-spot 10s ease-in-out infinite",
      opacity: intensity,
    }} />
  )
}

function ArchitectureShadow({ intensity }: { intensity: number }) {
  // Static diagonal lines suggesting levels — no animation
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(165deg, rgba(0,0,0,0.10) 0%, transparent 40%, rgba(0,0,0,0.06) 55%, transparent 70%)",
        opacity: intensity,
      }} />
      <div style={{
        position: "fixed", top: "30%", left: 0, right: 0, height: "0.5px",
        background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.045) 20%, rgba(255,255,255,0.045) 80%, transparent 95%)",
        pointerEvents: "none", zIndex: 2,
        opacity: intensity * 0.8,
      }} />
      <div style={{
        position: "fixed", top: "58%", left: 0, right: 0, height: "0.5px",
        background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.03) 75%, transparent 90%)",
        pointerEvents: "none", zIndex: 2,
        opacity: intensity * 0.6,
      }} />
    </>
  )
}

function GlitchAccent({ intensity }: { intensity: number }) {
  // Decorative line only — never on text or UI. Very infrequent flicker.
  return (
    <div className="rs2-anim" style={{
      position: "fixed", top: 59, left: "5%", right: "5%", height: "0.5px",
      background: "linear-gradient(90deg, transparent 0%, rgba(80,140,255,0.5) 40%, rgba(150,40,255,0.4) 60%, transparent 100%)",
      pointerEvents: "none", zIndex: 3,
      // 97-second loop: flicker at second 2–3 and again around second 50
      animation: "rs2-glitch 97s linear infinite",
      opacity: intensity * 0.9,
    }} />
  )
}

function ComicEdge({ intensity }: { intensity: number }) {
  // Panel-like border lines at page edges — static
  return (
    <>
      <div style={{
        position: "fixed", top: 58, left: 0, right: 0, height: "0.5px",
        background: "linear-gradient(90deg, transparent 3%, rgba(255,210,0,0.22) 20%, rgba(30,100,255,0.12) 50%, rgba(255,210,0,0.18) 80%, transparent 97%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity * 0.9,
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "0.5px",
        background: "linear-gradient(90deg, transparent 3%, rgba(30,100,255,0.12) 25%, rgba(255,210,0,0.16) 65%, transparent 97%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity * 0.7,
      }} />
    </>
  )
}

function OrderSlipTexture({ intensity }: { intensity: number }) {
  // Faint ruled paper lines — static
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(200,155,60,0.028) 0px, rgba(200,155,60,0.028) 1px, transparent 1px, transparent 28px)",
      opacity: intensity,
    }} />
  )
}

function PeriodicGrid({ intensity }: { intensity: number }) {
  // Periodic-table grid — static CSS grid pattern
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(0,200,215,0.022) 0px, rgba(0,200,215,0.022) 1px, transparent 1px, transparent 52px), repeating-linear-gradient(90deg, rgba(0,200,215,0.022) 0px, rgba(0,200,215,0.022) 1px, transparent 1px, transparent 52px)",
      opacity: intensity,
    }} />
  )
}

function LegalTexture({ intensity }: { intensity: number }) {
  // Ruled paper lines — static
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(210,200,170,0.032) 0px, rgba(210,200,170,0.032) 1px, transparent 1px, transparent 24px)",
      opacity: intensity,
    }} />
  )
}

const ELEMENT_GLYPHS = ["水", "火", "土", "氣", "↑", "→", "∿", "△"]
const ELEMENT_POSITIONS = [
  { left: "8%",  top: "20%", delay: "0s",   dur: "12s",  cls: "" },
  { left: "78%", top: "55%", delay: "3.1s", dur: "14s",  cls: "" },
  { left: "45%", top: "70%", delay: "1.5s", dur: "11s",  cls: "" },
  { left: "20%", top: "65%", delay: "5.2s", dur: "13s",  cls: "rs2-particle-extra" },
  { left: "62%", top: "30%", delay: "2.8s", dur: "10s",  cls: "rs2-particle-extra" },
  { left: "88%", top: "42%", delay: "4.4s", dur: "15s",  cls: "rs2-particle-extra" },
]

function ElementParticles({ intensity }: { intensity: number }) {
  return (
    <>
      {ELEMENT_POSITIONS.map((p, i) => (
        <div key={i} className={`rs2-anim${p.cls ? " " + p.cls : ""}`} style={{
          position: "fixed", left: p.left, top: p.top,
          color: "rgba(100,200,255,0.28)",
          fontSize: 10, fontWeight: 300,
          fontFamily: "serif",
          pointerEvents: "none", zIndex: 2,
          animation: `rs2-drift-x ${p.dur} ease-in-out infinite`,
          animationDelay: p.delay,
          opacity: intensity * 0.75,
          userSelect: "none",
        }}>
          {ELEMENT_GLYPHS[i % ELEMENT_GLYPHS.length]}
        </div>
      ))}
    </>
  )
}

function SterileGrid({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(180deg, rgba(175,210,225,0.04) 0%, transparent 45%)",
        opacity: intensity,
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "repeating-linear-gradient(0deg, rgba(155,210,225,0.022) 0px, rgba(155,210,225,0.022) 1px, transparent 1px, transparent 46px)",
        opacity: intensity,
      }} />
    </>
  )
}

function FrostFireEdge({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Cool left edge */}
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, bottom: 0, left: 0, width: "12%",
        background: "linear-gradient(90deg, rgba(60,120,220,0.1) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 2,
        animation: "rs2-frost 8s ease-in-out infinite",
        opacity: intensity,
      }} />
      {/* Warm right edge */}
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, bottom: 0, right: 0, width: "12%",
        background: "linear-gradient(270deg, rgba(200,40,20,0.1) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 2,
        animation: "rs2-frost 8s ease-in-out infinite 4s",
        opacity: intensity,
      }} />
    </>
  )
}

const SPORE_CONFIGS = [
  { left: "15%", delay: "0s",   dur: "9s",  size: 4, cls: "" },
  { left: "40%", delay: "2.5s", dur: "11s", size: 3, cls: "" },
  { left: "65%", delay: "0.9s", dur: "8s",  size: 4, cls: "" },
  { left: "82%", delay: "4.1s", dur: "12s", size: 3, cls: "rs2-particle-extra" },
  { left: "6%",  delay: "3.3s", dur: "10s", size: 3, cls: "rs2-particle-extra" },
  { left: "55%", delay: "5.8s", dur: "14s", size: 3, cls: "rs2-particle-extra" },
]

function SporeParticles({ intensity }: { intensity: number }) {
  return (
    <>
      {SPORE_CONFIGS.map((s, i) => (
        <div key={i} className={`rs2-anim${s.cls ? " " + s.cls : ""}`} style={{
          position: "fixed", bottom: "8%", left: s.left,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "rgba(60,160,80,0.55)",
          boxShadow: "0 0 4px rgba(60,180,80,0.25)",
          pointerEvents: "none", zIndex: 2,
          animation: `rs2-rise ${s.dur} ease-out infinite`,
          animationDelay: s.delay,
          opacity: intensity * 0.85,
        }} />
      ))}
    </>
  )
}

function ScienceGrid({ intensity }: { intensity: number }) {
  // Dot-grid + faint formula fragments
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        backgroundImage: "radial-gradient(rgba(30,200,182,0.08) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
        opacity: intensity * 0.7,
      }} />
      {/* Formula fragments */}
      {(["E=mc²", "v=Δd/t", "F=ma"] as const).map((f, i) => (
        <div key={f} style={{
          position: "fixed",
          left: `${20 + i * 28}%`,
          top: `${55 + i * 8}%`,
          color: "rgba(30,200,182,0.12)",
          fontSize: 9,
          fontFamily: "monospace",
          pointerEvents: "none", zIndex: 2,
          userSelect: "none",
          opacity: intensity,
        }}>
          {f}
        </div>
      ))}
    </>
  )
}

const EMBER_CONFIGS = [
  { left: "25%", delay: "0s",    dur: "6s",  cls: "" },
  { left: "60%", delay: "7.5s",  dur: "7s",  cls: "" },
  { left: "42%", delay: "14s",   dur: "5s",  cls: "" },
  { left: "78%", delay: "21s",   dur: "8s",  cls: "rs2-particle-extra" },
  { left: "12%", delay: "28s",   dur: "6s",  cls: "rs2-particle-extra" },
]

function EmberSpark({ intensity }: { intensity: number }) {
  return (
    <>
      {EMBER_CONFIGS.map((e, i) => (
        <div key={i} className={`rs2-anim${e.cls ? " " + e.cls : ""}`} style={{
          position: "fixed", bottom: "15%", left: e.left,
          width: 2, height: 2, borderRadius: "50%",
          background: "rgba(255,120,20,0.85)",
          boxShadow: "0 0 3px rgba(255,140,40,0.6)",
          pointerEvents: "none", zIndex: 3,
          animation: `rs2-rise ${e.dur} ease-out infinite`,
          animationDelay: e.delay,
          opacity: intensity * 0.9,
        }} />
      ))}
    </>
  )
}

const MAGIC_CONFIGS = [
  { left: "22%", top: "30%", delay: "0s",    dur: "9s",  cls: "" },
  { left: "68%", top: "45%", delay: "11s",   dur: "8s",  cls: "" },
  { left: "45%", top: "62%", delay: "5s",    dur: "10s", cls: "" },
  { left: "80%", top: "25%", delay: "18s",   dur: "7s",  cls: "rs2-particle-extra" },
  { left: "10%", top: "55%", delay: "24s",   dur: "9s",  cls: "rs2-particle-extra" },
]

function MagicSpark({ intensity }: { intensity: number }) {
  return (
    <>
      {MAGIC_CONFIGS.map((m, i) => (
        <div key={i} className={`rs2-anim${m.cls ? " " + m.cls : ""}`} style={{
          position: "fixed", left: m.left, top: m.top,
          width: 3, height: 3, borderRadius: "50%",
          background: "rgba(255,220,80,0.9)",
          boxShadow: "0 0 4px rgba(255,230,100,0.6)",
          pointerEvents: "none", zIndex: 3,
          animation: `rs2-sparkle ${m.dur} ease-in-out infinite`,
          animationDelay: m.delay,
          opacity: intensity * 0.85,
        }} />
      ))}
    </>
  )
}

function CrowShadow({ intensity }: { intensity: number }) {
  // Static feather silhouette SVG at top-right corner
  return (
    <div style={{
      position: "fixed", top: 60, right: 0,
      width: 90, height: 80,
      pointerEvents: "none", zIndex: 3,
      opacity: intensity * 0.22,
    }}>
      <svg viewBox="0 0 90 80" width="90" height="80">
        {/* Simplified feather/crow shapes */}
        <path d="M80 5 C60 15, 40 8, 20 25 C35 18, 55 20, 70 35 C58 25, 42 28, 30 45" fill="none" stroke="rgba(180,160,200,0.9)" strokeWidth="0.8"/>
        <path d="M85 15 C70 22, 55 18, 40 32 C52 24, 65 26, 75 40" fill="none" stroke="rgba(180,160,200,0.7)" strokeWidth="0.6"/>
        <path d="M88 28 C76 33, 64 30, 55 42" fill="none" stroke="rgba(180,160,200,0.5)" strokeWidth="0.5"/>
        {/* Small crow silhouette */}
        <path d="M55 2 C52 5 48 4 46 7 C50 6 54 7 56 10 C57 7 59 5 55 2 Z" fill="rgba(160,140,180,0.85)"/>
        <path d="M46 7 L44 12 M56 10 L58 14" stroke="rgba(160,140,180,0.6)" strokeWidth="0.7"/>
      </svg>
    </div>
  )
}

function TypewriterTexture({ intensity }: { intensity: number }) {
  // Aged paper feel: horizontal lines + dot grid
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: [
        "repeating-linear-gradient(0deg, rgba(195,175,140,0.028) 0px, rgba(195,175,140,0.028) 1px, transparent 1px, transparent 22px)",
        "radial-gradient(rgba(195,175,140,0.04) 1px, transparent 1px)",
      ].join(","),
      backgroundSize: "100% 100%, 18px 18px",
      opacity: intensity,
    }} />
  )
}

function WaveLightning({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Wave at page base */}
      <div className="rs2-anim" style={{
        position: "fixed", bottom: 0, left: "-5%", right: "-5%", height: 3,
        background: "linear-gradient(90deg, transparent 5%, rgba(60,130,255,0.22) 30%, rgba(80,180,255,0.32) 50%, rgba(60,130,255,0.22) 70%, transparent 95%)",
        pointerEvents: "none", zIndex: 3, borderRadius: 2,
        animation: "rs2-wave 6s ease-in-out infinite",
        opacity: intensity,
      }} />
      {/* Rare lightning accent — vertical line, very infrequent */}
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, bottom: 0, left: "50%", width: 1,
        background: "linear-gradient(180deg, transparent 10%, rgba(120,200,255,0.18) 40%, rgba(120,200,255,0.25) 50%, rgba(120,200,255,0.18) 60%, transparent 90%)",
        pointerEvents: "none", zIndex: 2,
        animation: "rs2-lightning 40s linear infinite",
        opacity: intensity * 0.9,
      }} />
    </>
  )
}

// ─── Effect dispatcher ────────────────────────────────────────────────────────

function EffectRenderer({ entry }: { entry: RegistryEntry }) {
  const { effectKey, intensity } = entry

  if (effectKey === "subtle_web")          return <SubtleWeb intensity={intensity} />
  if (effectKey === "gold_shimmer")        return <GoldShimmer intensity={intensity} />
  if (effectKey === "tempo_pulse")         return <TempoPulse intensity={intensity} />
  if (effectKey === "starfield")           return <Starfield intensity={intensity} />
  if (effectKey === "sand_drift")          return <SandDrift intensity={intensity} />
  if (effectKey === "noir_rain")           return <NoirRain intensity={intensity} />
  if (effectKey === "neon_rain")           return <NeonRain intensity={intensity} />
  if (effectKey === "musical_spotlight")   return <MusicalSpotlight intensity={intensity} />
  if (effectKey === "architecture_shadow") return <ArchitectureShadow intensity={intensity} />
  if (effectKey === "glitch_accent")       return <GlitchAccent intensity={intensity} />
  if (effectKey === "comic_edge")          return <ComicEdge intensity={intensity} />
  if (effectKey === "order_slip_texture")  return <OrderSlipTexture intensity={intensity} />
  if (effectKey === "periodic_grid")       return <PeriodicGrid intensity={intensity} />
  if (effectKey === "legal_texture")       return <LegalTexture intensity={intensity} />
  if (effectKey === "element_particles")   return <ElementParticles intensity={intensity} />
  if (effectKey === "sterile_grid")        return <SterileGrid intensity={intensity} />
  if (effectKey === "frost_fire_edge")     return <FrostFireEdge intensity={intensity} />
  if (effectKey === "spore_particles")     return <SporeParticles intensity={intensity} />
  if (effectKey === "science_grid")        return <ScienceGrid intensity={intensity} />
  if (effectKey === "ember_spark")         return <EmberSpark intensity={intensity} />
  if (effectKey === "magic_spark")         return <MagicSpark intensity={intensity} />
  if (effectKey === "crow_shadow")         return <CrowShadow intensity={intensity} />
  if (effectKey === "typewriter_texture")  return <TypewriterTexture intensity={intensity} />
  if (effectKey === "wave_lightning")      return <WaveLightning intensity={intensity} />
  return null
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function DynamicThemeLayer() {
  const pathname = usePathname()
  const { isOpen: diaryOpen, media: diaryMedia } = useDiaryLog()
  const [mode, setMode] = useState<"full" | "subtle" | "off">("subtle")
  const styleInjected = useRef(false)

  // Sync ThemeMode from localStorage
  useEffect(() => {
    setMode(getThemeMode())
    function onStorage(e: StorageEvent) {
      if (e.key === THEME_MODE_KEY && e.newValue) {
        const v = e.newValue
        if (v === "full" || v === "subtle" || v === "off") setMode(v)
      }
    }
    function onThemeChange() { setMode(getThemeMode()) }
    window.addEventListener("storage", onStorage)
    window.addEventListener("rs-theme-change", onThemeChange)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("rs-theme-change", onThemeChange)
    }
  }, [])

  // Inject keyframes once
  useEffect(() => {
    if (styleInjected.current) return
    styleInjected.current = true
    const style = document.createElement("style")
    style.setAttribute("data-rs-egg", "1")
    style.textContent = KEYFRAMES
    document.head.appendChild(style)
    return () => { style.remove(); styleInjected.current = false }
  }, [])

  // Resolve active media from diary modal (title available) or URL
  const activeMedia: { id: string; mediaType: "movie" | "tv" | "book" | null; title: string | null } | null =
    diaryOpen && diaryMedia
      ? {
          id: String(diaryMedia.media_id ?? diaryMedia.tmdb_id ?? ""),
          mediaType: diaryMedia.media_type as "movie" | "tv" | "book" | null,
          title: diaryMedia.title ?? null,
        }
      : parseMediaFromPath(pathname)

  // Match against the registry
  const entry = activeMedia
    ? matchRegistryEntry(activeMedia.id, activeMedia.mediaType, activeMedia.title)
    : null

  // Dev logging
  if (process.env.NODE_ENV === "development" && activeMedia) {
    if (entry) {
      console.log(
        `[EASTER EGG] ✓ match: "${entry.displayName}" → effect "${entry.effectKey}" at intensity ${entry.intensity}`,
        { id: activeMedia.id, type: activeMedia.mediaType }
      )
    } else {
      console.log(
        "[EASTER EGG] no match for",
        { id: activeMedia.id, type: activeMedia.mediaType, title: activeMedia.title }
      )
    }
  }

  // Kill switches: GLOBAL_KILL_SWITCH (code), ThemeMode "off" (user), no match
  if (GLOBAL_KILL_SWITCH || mode === "off" || !entry || diaryOpen) return null

  return <EffectRenderer entry={entry} />
}
