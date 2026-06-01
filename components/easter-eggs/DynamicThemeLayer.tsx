"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { matchRegistryEntry, GLOBAL_KILL_SWITCH, type RegistryEntry } from "@/lib/easter-eggs/registry"
import { getThemeMode, THEME_MODE_KEY } from "@/lib/easterEggs"

// ─── Global keyframes ─────────────────────────────────────────────────────────
// All animations use transform/opacity only — never properties that trigger layout.

const KEYFRAMES = `
@keyframes rs2-fadein    { from { opacity:0 } to { opacity:1 } }
@keyframes rs2-shimmer   { from { background-position:-200% center } to { background-position:200% center } }
@keyframes rs2-pulse     { 0%,100%{opacity:1} 50%{opacity:0.32} }
@keyframes rs2-twinkle   { 0%,100%{opacity:0.9} 50%{opacity:0.45} }
@keyframes rs2-drift-x   { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
@keyframes rs2-drift-sand { 0%{transform:translateX(0) translateY(0)} 28%{transform:translateX(26px) translateY(-6px)} 60%{transform:translateX(-14px) translateY(4px)} 100%{transform:translateX(0) translateY(0)} }
@keyframes rs2-rise      { 0%{transform:translateY(0) scale(1);opacity:0} 12%{opacity:1} 88%{opacity:.8} 100%{transform:translateY(-54px) scale(.65);opacity:0} }
@keyframes rs2-spot      { 0%,100%{background-position:30% 70%} 50%{background-position:70% 30%} }
@keyframes rs2-frost     { 0%,100%{opacity:1} 50%{opacity:.42} }
@keyframes rs2-wave      { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-16px)} }
@keyframes rs2-glitch    { 0%,2.5%,5.5%,100%{opacity:0} 1%,4%{opacity:1} }
@keyframes rs2-sparkle   { 0%,100%{opacity:0;transform:scale(.4)} 12%,88%{opacity:1;transform:scale(1)} 50%{transform:scale(1.3)} }
@keyframes rs2-rain-fall { from{background-position:0 0} to{background-position:0 44px} }
@keyframes rs2-lightning { 0%,96%,100%{opacity:0} 97%{opacity:.28} 98%{opacity:.12} }

/* Kill all motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  .rs2-anim { animation: none !important; }
}
/* Mobile: hide excess particles */
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

function slugToTitle(slug: string): string {
  return decodeURIComponent(slug).replace(/[-_]/g, " ").trim()
}

function stripTmdbPrefix(segment: string): { numericId: string | null; raw: string } {
  if (/^\d+$/.test(segment)) return { numericId: segment, raw: segment }
  if (/^tmdb-(\d+)$/.test(segment)) return { numericId: segment.slice(5), raw: segment }
  return { numericId: null, raw: segment }
}

function parseMediaFromPath(pathname: string): ActiveMedia | null {
  const filmMatch = pathname.match(/^\/films\/([^/?#]+)/)
  if (filmMatch) {
    const { numericId, raw } = stripTmdbPrefix(filmMatch[1])
    return numericId
      ? { id: numericId, mediaType: "movie", title: null }
      : { id: raw, mediaType: "movie", title: slugToTitle(raw) }
  }
  const seriesMatch = pathname.match(/^\/series\/([^/?#]+)/)
  if (seriesMatch) {
    const { numericId, raw } = stripTmdbPrefix(seriesMatch[1])
    return numericId
      ? { id: numericId, mediaType: "tv", title: null }
      : { id: raw, mediaType: "tv", title: slugToTitle(raw) }
  }
  const bookMatch = pathname.match(/^\/books\/([^/?#]+)/)
  if (bookMatch) {
    const slug = decodeURIComponent(bookMatch[1])
    return { id: slug, mediaType: "book", title: slugToTitle(slug) }
  }
  return null
}

// ─── Effects ──────────────────────────────────────────────────────────────────
// All effects: position:fixed, pointer-events:none, z-index 1–5
// Intensity param (0–1) scales overall presence; base color values tuned so
// intensity=0.3 ("low") produces clearly perceptible atmospheric results.

// ── subtle_web ────────────────────────────────────────────────────────────────

function SubtleWeb({ intensity }: { intensity: number }) {
  return (
    <>
      {(["tl", "br"] as const).map((c) => (
        <div key={c} style={{
          position: "fixed",
          top: c === "tl" ? 58 : undefined, bottom: c === "br" ? 0 : undefined,
          left: c === "tl" ? 0  : undefined, right: c === "br" ? 0 : undefined,
          width: 140, height: 140, pointerEvents: "none", zIndex: 3,
          opacity: intensity,
        }}>
          <svg viewBox="0 0 140 140" width="140" height="140" style={{
            display: "block",
            transform: c === "br" ? "scale(-1,-1)" : undefined,
            transformOrigin: c === "br" ? "70px 70px" : undefined,
          }}>
            {/* Radial spokes */}
            <line x1="0" y1="0" x2="140" y2="0"   stroke="#c41e2a" strokeWidth="1.2" opacity="0.55"/>
            <line x1="0" y1="0" x2="0"   y2="140"  stroke="#c41e2a" strokeWidth="1.2" opacity="0.55"/>
            <line x1="0" y1="0" x2="140" y2="46"   stroke="#c41e2a" strokeWidth="0.9" opacity="0.42"/>
            <line x1="0" y1="0" x2="46"  y2="140"  stroke="#c41e2a" strokeWidth="0.9" opacity="0.42"/>
            <line x1="0" y1="0" x2="140" y2="140"  stroke="#c41e2a" strokeWidth="0.8" opacity="0.32"/>
            <line x1="0" y1="0" x2="96"  y2="140"  stroke="#c41e2a" strokeWidth="0.7" opacity="0.28"/>
            <line x1="0" y1="0" x2="140" y2="96"   stroke="#c41e2a" strokeWidth="0.7" opacity="0.28"/>
            {/* Concentric arcs */}
            <path d="M 32 0 Q 16 16 0 32"  fill="none" stroke="#c41e2a" strokeWidth="1.1" opacity="0.5"/>
            <path d="M 68 0 Q 34 34 0 68"  fill="none" stroke="#c41e2a" strokeWidth="0.9" opacity="0.4"/>
            <path d="M 104 0 Q 52 52 0 104" fill="none" stroke="#c41e2a" strokeWidth="0.75" opacity="0.3"/>
            <path d="M 140 0 Q 70 70 0 140" fill="none" stroke="#c41e2a" strokeWidth="0.6" opacity="0.22"/>
          </svg>
        </div>
      ))}
    </>
  )
}

// ── gold_shimmer ──────────────────────────────────────────────────────────────

function GoldShimmer({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Moving shimmer sweep */}
      <div className="rs2-anim" style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        background: "linear-gradient(120deg, transparent 20%, rgba(220,175,40,0.45) 50%, transparent 80%)",
        backgroundSize: "200% 100%",
        animation: "rs2-shimmer 5s ease-in-out infinite",
        opacity: intensity,
      }} />
      {/* Ambient gold tone — upper half */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "55%",
        pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(180deg, rgba(180,130,20,0.18) 0%, transparent 100%)",
        opacity: intensity,
      }} />
    </>
  )
}

// ── tempo_pulse ───────────────────────────────────────────────────────────────

function TempoPulse({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Main pulse bar — bottom edge */}
      <div className="rs2-anim" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, transparent 3%, rgba(255,230,0,0.75) 25%, rgba(255,245,80,1.0) 50%, rgba(255,230,0,0.75) 75%, transparent 97%)",
        pointerEvents: "none", zIndex: 3,
        animation: "rs2-pulse 2.2s ease-in-out infinite",
        opacity: intensity,
      }} />
      {/* Subtle glow bleed above the bar */}
      <div className="rs2-anim" style={{
        position: "fixed", bottom: 0, left: "5%", right: "5%", height: 18,
        background: "linear-gradient(0deg, rgba(255,220,0,0.18) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 2,
        animation: "rs2-pulse 2.2s ease-in-out infinite",
        opacity: intensity,
      }} />
    </>
  )
}

// ── starfield ─────────────────────────────────────────────────────────────────

const STARS = [
  "18px 95px","160px 240px","310px 55px","82px 420px","450px 170px",
  "198px 345px","530px 90px","70px 530px","385px 300px","248px 46px",
  "112px 185px","495px 365px","38px 285px","610px 215px","325px 485px",
  "172px 145px","435px 72px","26px 365px","565px 135px","92px 475px",
  "275px 195px","715px 315px","148px 62px","485px 425px","355px 125px",
  "80px 310px","540px 460px","220px 120px","680px 260px","400px 380px",
].map((s, i) =>
  `${s} ${i % 3 === 0 ? "2.5px" : "1.5px"} rgba(255,255,255,${i % 2 === 0 ? "0.9" : "0.65"})`
).join(",")

function Starfield({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 0%, rgba(10,20,70,0.38) 0%, transparent 65%)",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, left: 0, width: 1, height: 1,
        pointerEvents: "none", zIndex: 2,
        boxShadow: STARS,
        animation: "rs2-twinkle 6s ease-in-out infinite",
        opacity: intensity,
      }} />
    </>
  )
}

// ── sand_drift ────────────────────────────────────────────────────────────────
// Three visual layers required: particles drifting across lower/mid page,
// golden desert haze gradient, and a warm colour temperature shift.

const SAND_MOTES = [
  { left: "8%",  bottom: "12%", delay: "0s",   dur: "11s", size: 5, cls: "" },
  { left: "22%", bottom: "28%", delay: "1.8s", dur: "13s", size: 4, cls: "" },
  { left: "38%", bottom: "18%", delay: "0.5s", dur: "9s",  size: 6, cls: "" },
  { left: "54%", bottom: "35%", delay: "3.1s", dur: "12s", size: 4, cls: "" },
  { left: "68%", bottom: "22%", delay: "1.2s", dur: "10s", size: 5, cls: "" },
  { left: "82%", bottom: "14%", delay: "4.3s", dur: "14s", size: 4, cls: "" },
  { left: "15%", bottom: "45%", delay: "2.6s", dur: "16s", size: 3, cls: "rs2-particle-extra" },
  { left: "45%", bottom: "52%", delay: "0.9s", dur: "18s", size: 3, cls: "rs2-particle-extra" },
  { left: "72%", bottom: "42%", delay: "5.1s", dur: "15s", size: 3, cls: "rs2-particle-extra" },
  { left: "90%", bottom: "30%", delay: "3.7s", dur: "12s", size: 4, cls: "rs2-particle-extra" },
]

function SandDrift({ intensity }: { intensity: number }) {
  return (
    <>
      {/* 1. Warm colour temperature shift — full page tint */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "rgba(90,44,4,0.28)",
        opacity: intensity,
      }} />

      {/* 2. Golden desert haze — lower two-thirds of viewport */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        background: [
          "linear-gradient(0deg,",
          "  rgba(190,95,10,0.58) 0%,",
          "  rgba(165,80,8,0.42) 18%,",
          "  rgba(140,65,5,0.28) 38%,",
          "  rgba(110,50,2,0.14) 56%,",
          "  transparent 74%",
          ")",
        ].join(""),
        opacity: intensity,
      }} />

      {/* 3. Sand particle motes — drifting across lower and mid page */}
      {SAND_MOTES.map((m, i) => (
        <div key={i} className={`rs2-anim${m.cls ? " " + m.cls : ""}`} style={{
          position: "fixed", bottom: m.bottom, left: m.left,
          width: m.size, height: m.size, borderRadius: "50%",
          background: `rgba(${210 + (i % 3) * 8},${150 + (i % 4) * 6},${40 + (i % 3) * 8},0.88)`,
          boxShadow: `0 0 ${m.size * 2}px rgba(200,140,35,0.5)`,
          pointerEvents: "none", zIndex: 3,
          animation: `rs2-drift-sand ${m.dur} ease-in-out infinite`,
          animationDelay: m.delay,
          opacity: intensity * 0.92,
        }} />
      ))}

      {/* 4. Warm horizon glow at base */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "22%",
        pointerEvents: "none", zIndex: 2,
        background: "linear-gradient(0deg, rgba(160,72,5,0.22) 0%, transparent 100%)",
        opacity: intensity,
      }} />
    </>
  )
}

// ── noir_rain ─────────────────────────────────────────────────────────────────

function NoirRain({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "rgba(0,4,16,0.22)",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "repeating-linear-gradient(173deg, transparent 0%, transparent 96%, rgba(70,115,200,0.22) 96%, rgba(70,115,200,0.22) 100%)",
        backgroundSize: "3px 38px",
        animation: "rs2-rain-fall 1.8s linear infinite",
        opacity: intensity,
      }} />
    </>
  )
}

// ── neon_rain ─────────────────────────────────────────────────────────────────

function NeonRain({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "rgba(16,5,0,0.18)",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "repeating-linear-gradient(169deg, transparent 0%, transparent 95%, rgba(200,95,22,0.24) 95%, rgba(200,95,22,0.24) 100%)",
        backgroundSize: "3px 34px",
        animation: "rs2-rain-fall 1.5s linear infinite",
        opacity: intensity,
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "35%",
        background: "linear-gradient(0deg, rgba(110,55,0,0.28) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity,
      }} />
    </>
  )
}

// ── musical_spotlight ─────────────────────────────────────────────────────────

function MusicalSpotlight({ intensity }: { intensity: number }) {
  return (
    <div className="rs2-anim" style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: [
        "radial-gradient(ellipse 55% 60% at 30% 65%, rgba(175,120,255,0.42) 0%, transparent 60%),",
        "radial-gradient(ellipse 45% 50% at 75% 25%, rgba(100,60,200,0.32) 0%, transparent 55%)",
      ].join(""),
      backgroundSize: "200% 200%",
      animation: "rs2-spot 10s ease-in-out infinite",
      opacity: intensity,
    }} />
  )
}

// ── architecture_shadow ───────────────────────────────────────────────────────

function ArchitectureShadow({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(162deg, rgba(0,0,0,0.32) 0%, transparent 38%, rgba(0,0,0,0.18) 52%, transparent 68%)",
        opacity: intensity,
      }} />
      <div style={{
        position: "fixed", top: "30%", left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent 4%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.18) 82%, transparent 96%)",
        pointerEvents: "none", zIndex: 2,
        opacity: intensity,
      }} />
      <div style={{
        position: "fixed", top: "58%", left: 0, right: 0, height: "1px",
        background: "linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.12) 22%, rgba(255,255,255,0.12) 78%, transparent 92%)",
        pointerEvents: "none", zIndex: 2,
        opacity: intensity * 0.75,
      }} />
    </>
  )
}

// ── glitch_accent ─────────────────────────────────────────────────────────────

function GlitchAccent({ intensity }: { intensity: number }) {
  return (
    <div className="rs2-anim" style={{
      position: "fixed", top: 59, left: "4%", right: "4%", height: "1px",
      background: "linear-gradient(90deg, transparent 0%, rgba(80,140,255,0.85) 38%, rgba(150,40,255,0.75) 62%, transparent 100%)",
      pointerEvents: "none", zIndex: 3,
      animation: "rs2-glitch 72s linear infinite",
      opacity: intensity,
    }} />
  )
}

// ── comic_edge ────────────────────────────────────────────────────────────────

function ComicEdge({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Top panel line */}
      <div style={{
        position: "fixed", top: 58, left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent 2%, rgba(255,210,0,0.7) 18%, rgba(30,100,255,0.45) 50%, rgba(255,210,0,0.6) 82%, transparent 98%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity,
      }} />
      {/* Bottom panel line */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent 2%, rgba(30,100,255,0.45) 22%, rgba(255,210,0,0.55) 62%, transparent 98%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity * 0.85,
      }} />
      {/* Side accents */}
      <div style={{
        position: "fixed", top: 58, bottom: 0, left: 0, width: "2px",
        background: "linear-gradient(180deg, rgba(255,210,0,0.5) 0%, rgba(255,210,0,0.1) 30%, transparent 70%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity * 0.7,
      }} />
      <div style={{
        position: "fixed", top: 58, bottom: 0, right: 0, width: "2px",
        background: "linear-gradient(180deg, rgba(30,100,255,0.45) 0%, rgba(30,100,255,0.1) 30%, transparent 70%)",
        pointerEvents: "none", zIndex: 3,
        opacity: intensity * 0.7,
      }} />
    </>
  )
}

// ── order_slip_texture ────────────────────────────────────────────────────────

function OrderSlipTexture({ intensity }: { intensity: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(200,155,60,0.12) 0px, rgba(200,155,60,0.12) 1px, transparent 1px, transparent 28px)",
      opacity: intensity,
    }} />
  )
}

// ── periodic_grid ─────────────────────────────────────────────────────────────

function PeriodicGrid({ intensity }: { intensity: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: [
        "repeating-linear-gradient(0deg,  rgba(0,200,215,0.10) 0px, rgba(0,200,215,0.10) 1px, transparent 1px, transparent 52px)",
        "repeating-linear-gradient(90deg, rgba(0,200,215,0.10) 0px, rgba(0,200,215,0.10) 1px, transparent 1px, transparent 52px)",
      ].join(","),
      opacity: intensity,
    }} />
  )
}

// ── legal_texture ─────────────────────────────────────────────────────────────

function LegalTexture({ intensity }: { intensity: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(210,200,170,0.14) 0px, rgba(210,200,170,0.14) 1px, transparent 1px, transparent 24px)",
      opacity: intensity,
    }} />
  )
}

// ── element_particles ─────────────────────────────────────────────────────────

const ELEMENT_GLYPHS = ["水", "火", "土", "氣", "↑", "→", "∿", "△"]
const ELEMENT_POSITIONS = [
  { left: "8%",  top: "22%", delay: "0s",   dur: "12s", cls: "" },
  { left: "78%", top: "55%", delay: "3.1s", dur: "14s", cls: "" },
  { left: "44%", top: "70%", delay: "1.5s", dur: "11s", cls: "" },
  { left: "20%", top: "62%", delay: "5.2s", dur: "13s", cls: "rs2-particle-extra" },
  { left: "62%", top: "32%", delay: "2.8s", dur: "10s", cls: "rs2-particle-extra" },
  { left: "88%", top: "44%", delay: "4.4s", dur: "15s", cls: "rs2-particle-extra" },
]

function ElementParticles({ intensity }: { intensity: number }) {
  return (
    <>
      {ELEMENT_POSITIONS.map((p, i) => (
        <div key={i} className={`rs2-anim${p.cls ? " " + p.cls : ""}`} style={{
          position: "fixed", left: p.left, top: p.top,
          color: "rgba(100,210,255,0.75)",
          fontSize: 14, fontWeight: 400,
          fontFamily: "serif",
          pointerEvents: "none", zIndex: 2,
          animation: `rs2-drift-x ${p.dur} ease-in-out infinite`,
          animationDelay: p.delay,
          opacity: intensity * 0.9,
          userSelect: "none",
          textShadow: "0 0 8px rgba(80,200,255,0.5)",
        }}>
          {ELEMENT_GLYPHS[i % ELEMENT_GLYPHS.length]}
        </div>
      ))}
    </>
  )
}

// ── sterile_grid ──────────────────────────────────────────────────────────────

function SterileGrid({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(180deg, rgba(175,210,225,0.10) 0%, transparent 45%)",
        opacity: intensity,
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "repeating-linear-gradient(0deg, rgba(155,215,230,0.09) 0px, rgba(155,215,230,0.09) 1px, transparent 1px, transparent 46px)",
        opacity: intensity,
      }} />
    </>
  )
}

// ── frost_fire_edge ───────────────────────────────────────────────────────────

function FrostFireEdge({ intensity }: { intensity: number }) {
  return (
    <>
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, bottom: 0, left: 0, width: "14%",
        background: "linear-gradient(90deg, rgba(55,115,230,0.35) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 2,
        animation: "rs2-frost 8s ease-in-out infinite",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, bottom: 0, right: 0, width: "14%",
        background: "linear-gradient(270deg, rgba(210,40,18,0.35) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 2,
        animation: "rs2-frost 8s ease-in-out infinite 4s",
        opacity: intensity,
      }} />
    </>
  )
}

// ── spore_particles ───────────────────────────────────────────────────────────

const SPORE_CONFIGS = [
  { left: "12%", delay: "0s",   dur: "9s",  size: 6, cls: "" },
  { left: "38%", delay: "2.4s", dur: "11s", size: 5, cls: "" },
  { left: "62%", delay: "0.8s", dur: "8s",  size: 6, cls: "" },
  { left: "80%", delay: "4.0s", dur: "12s", size: 5, cls: "rs2-particle-extra" },
  { left: "5%",  delay: "3.2s", dur: "10s", size: 5, cls: "rs2-particle-extra" },
  { left: "52%", delay: "5.5s", dur: "14s", size: 4, cls: "rs2-particle-extra" },
]

function SporeParticles({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Ambient green haze */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 80%, rgba(40,120,50,0.18) 0%, transparent 60%)",
        opacity: intensity,
      }} />
      {SPORE_CONFIGS.map((s, i) => (
        <div key={i} className={`rs2-anim${s.cls ? " " + s.cls : ""}`} style={{
          position: "fixed", bottom: "10%", left: s.left,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "rgba(55,170,80,0.82)",
          boxShadow: `0 0 ${s.size * 2}px rgba(50,180,75,0.5)`,
          pointerEvents: "none", zIndex: 2,
          animation: `rs2-rise ${s.dur} ease-out infinite`,
          animationDelay: s.delay,
          opacity: intensity * 0.95,
        }} />
      ))}
    </>
  )
}

// ── science_grid ──────────────────────────────────────────────────────────────

function ScienceGrid({ intensity }: { intensity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        backgroundImage: "radial-gradient(rgba(30,200,182,0.22) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
        opacity: intensity,
      }} />
      {(["E=mc²", "v=Δd/t", "F=ma"] as const).map((f, i) => (
        <div key={f} style={{
          position: "fixed",
          left: `${20 + i * 28}%`,
          top: `${52 + i * 9}%`,
          color: "rgba(30,200,182,0.55)",
          fontSize: 11,
          fontFamily: "monospace",
          pointerEvents: "none", zIndex: 2,
          userSelect: "none",
          opacity: intensity,
          textShadow: "0 0 6px rgba(30,200,182,0.4)",
        }}>
          {f}
        </div>
      ))}
    </>
  )
}

// ── ember_spark ───────────────────────────────────────────────────────────────

const EMBER_CONFIGS = [
  { left: "22%", delay: "0s",   dur: "5s",  cls: "" },
  { left: "55%", delay: "4.5s", dur: "6s",  cls: "" },
  { left: "38%", delay: "9s",   dur: "4.5s",cls: "" },
  { left: "74%", delay: "14s",  dur: "6.5s",cls: "rs2-particle-extra" },
  { left: "10%", delay: "19s",  dur: "5s",  cls: "rs2-particle-extra" },
]

function EmberSpark({ intensity }: { intensity: number }) {
  return (
    <>
      {/* Warm ambient glow at lower page */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: "30%",
        background: "linear-gradient(0deg, rgba(180,60,5,0.15) 0%, transparent 100%)",
        pointerEvents: "none", zIndex: 1,
        opacity: intensity,
      }} />
      {EMBER_CONFIGS.map((e, i) => (
        <div key={i} className={`rs2-anim${e.cls ? " " + e.cls : ""}`} style={{
          position: "fixed", bottom: "18%", left: e.left,
          width: 3, height: 4, borderRadius: "40% 40% 60% 60%",
          background: "rgba(255,125,18,0.95)",
          boxShadow: "0 0 6px rgba(255,145,40,0.8)",
          pointerEvents: "none", zIndex: 3,
          animation: `rs2-rise ${e.dur} ease-out infinite`,
          animationDelay: e.delay,
          opacity: intensity * 0.95,
        }} />
      ))}
    </>
  )
}

// ── magic_spark ───────────────────────────────────────────────────────────────

const MAGIC_CONFIGS = [
  { left: "22%", top: "32%", delay: "0s",   dur: "8s",  cls: "" },
  { left: "68%", top: "46%", delay: "6s",   dur: "7.5s",cls: "" },
  { left: "44%", top: "63%", delay: "3s",   dur: "9s",  cls: "" },
  { left: "80%", top: "26%", delay: "12s",  dur: "7s",  cls: "rs2-particle-extra" },
  { left: "10%", top: "55%", delay: "16s",  dur: "8.5s",cls: "rs2-particle-extra" },
]

function MagicSpark({ intensity }: { intensity: number }) {
  return (
    <>
      {MAGIC_CONFIGS.map((m, i) => (
        <div key={i} className={`rs2-anim${m.cls ? " " + m.cls : ""}`} style={{
          position: "fixed", left: m.left, top: m.top,
          width: 4, height: 4, borderRadius: "50%",
          background: "rgba(255,225,80,0.95)",
          boxShadow: "0 0 8px rgba(255,235,110,0.7), 0 0 16px rgba(255,215,50,0.35)",
          pointerEvents: "none", zIndex: 3,
          animation: `rs2-sparkle ${m.dur} ease-in-out infinite`,
          animationDelay: m.delay,
          opacity: intensity * 0.95,
        }} />
      ))}
    </>
  )
}

// ── crow_shadow ───────────────────────────────────────────────────────────────

function CrowShadow({ intensity }: { intensity: number }) {
  return (
    <div style={{
      position: "fixed", top: 60, right: 0,
      width: 120, height: 110,
      pointerEvents: "none", zIndex: 3,
      opacity: intensity * 0.72,
    }}>
      <svg viewBox="0 0 120 110" width="120" height="110">
        <path d="M110 6 C88 18, 60 10, 30 32 C50 24, 76 27, 96 44 C80 32, 58 36, 40 58" fill="none" stroke="rgba(190,170,210,0.9)" strokeWidth="1.2"/>
        <path d="M116 20 C98 28, 78 24, 58 42 C72 32, 88 34, 102 52" fill="none" stroke="rgba(190,170,210,0.75)" strokeWidth="1.0"/>
        <path d="M118 38 C104 44, 88 40, 76 56" fill="none" stroke="rgba(190,170,210,0.6)" strokeWidth="0.8"/>
        <path d="M118 55 C108 59, 96 56, 88 66" fill="none" stroke="rgba(190,170,210,0.4)" strokeWidth="0.6"/>
        <path d="M76 4 C72 8 66 7 64 11 C69 9 75 10 78 15 C79 11 82 8 76 4 Z" fill="rgba(170,150,190,0.92)"/>
        <path d="M64 11 L61 17 M78 15 L81 20" stroke="rgba(170,150,190,0.7)" strokeWidth="1.0"/>
      </svg>
    </div>
  )
}

// ── typewriter_texture ────────────────────────────────────────────────────────

function TypewriterTexture({ intensity }: { intensity: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: [
        "repeating-linear-gradient(0deg, rgba(195,175,140,0.12) 0px, rgba(195,175,140,0.12) 1px, transparent 1px, transparent 22px)",
        "radial-gradient(rgba(195,175,140,0.08) 1px, transparent 1px)",
      ].join(","),
      backgroundSize: "100% 100%, 18px 18px",
      opacity: intensity,
    }} />
  )
}

// ── wave_lightning ────────────────────────────────────────────────────────────

function WaveLightning({ intensity }: { intensity: number }) {
  return (
    <>
      <div className="rs2-anim" style={{
        position: "fixed", bottom: 0, left: "-5%", right: "-5%", height: 4,
        background: "linear-gradient(90deg, transparent 4%, rgba(60,130,255,0.62) 28%, rgba(80,185,255,0.82) 50%, rgba(60,130,255,0.62) 72%, transparent 96%)",
        pointerEvents: "none", zIndex: 3, borderRadius: 2,
        animation: "rs2-wave 5.5s ease-in-out infinite",
        opacity: intensity,
      }} />
      <div className="rs2-anim" style={{
        position: "fixed", top: 0, bottom: 0, left: "50%", width: 1,
        background: "linear-gradient(180deg, transparent 8%, rgba(120,205,255,0.55) 38%, rgba(120,205,255,0.72) 50%, rgba(120,205,255,0.55) 62%, transparent 92%)",
        pointerEvents: "none", zIndex: 2,
        animation: "rs2-lightning 32s linear infinite",
        opacity: intensity,
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
  const [mode, setMode] = useState<"full" | "subtle" | "off">("subtle")
  const styleInjected = useRef(false)

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

  // Inject keyframes once into document head; clean up on unmount
  useEffect(() => {
    if (styleInjected.current) return
    styleInjected.current = true
    const style = document.createElement("style")
    style.setAttribute("data-rs-egg", "1")
    style.textContent = KEYFRAMES
    document.head.appendChild(style)
    return () => { style.remove(); styleInjected.current = false }
  }, [])

  const activeMedia = parseMediaFromPath(pathname)
  const entry = activeMedia
    ? matchRegistryEntry(activeMedia.id, activeMedia.mediaType, activeMedia.title)
    : null

  // Diagnostic logging — fires on every navigation to a media detail page
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    const media = parseMediaFromPath(pathname)
    if (!media) return
    const match = matchRegistryEntry(media.id, media.mediaType, media.title)
    console.log(`[EASTER_EGG] page mounted`)
    console.log(`[EASTER_EGG] title: ${media.title ?? "(none)"}`)
    console.log(`[EASTER_EGG] media_type: ${media.mediaType}`)
    console.log(`[EASTER_EGG] ${media.mediaType === "book" ? "book_id" : "tmdb_id"}: ${media.id}`)
    console.log(`[EASTER_EGG] matched config:`, match)
    console.log(`[EASTER_EGG] rendering effect: ${match?.effectKey ?? "none"}`)
  }, [pathname])

  if (GLOBAL_KILL_SWITCH || mode === "off") return null

  if (!entry) {
    if (process.env.NODE_ENV === "development" && activeMedia) {
      return (
        <div style={{
          position: "fixed", top: 12, right: 12, zIndex: 9999,
          background: "#dc2626", color: "white",
          fontSize: 10, fontFamily: "monospace",
          padding: "4px 9px", borderRadius: 5,
          border: "1px solid rgba(220,38,38,0.5)",
          pointerEvents: "none", userSelect: "none",
          letterSpacing: "0.02em",
        }}>
          NO EASTER EGG MATCH
        </div>
      )
    }
    return null
  }

  return (
    <>
      <EffectRenderer entry={entry} />
      {process.env.NODE_ENV === "development" && (
        <div style={{
          position: "fixed", top: 12, right: 12, zIndex: 9999,
          background: "#16a34a", color: "white",
          fontSize: 10, fontFamily: "monospace",
          padding: "4px 9px", borderRadius: 5,
          border: "1px solid rgba(22,163,74,0.5)",
          pointerEvents: "none", userSelect: "none",
          letterSpacing: "0.02em",
        }}>
          EASTER EGG: {entry.effectKey}
        </div>
      )}
    </>
  )
}
