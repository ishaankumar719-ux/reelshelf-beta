"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { matchTheme, type MediaForMatching } from "@/lib/easter-eggs/matcher"
import { getThemeMode, recordSecretView, THEME_MODE_KEY, type ThemeMode } from "@/lib/easterEggs"
import { useDiaryLog } from "@/hooks/useDiaryLog"
import type { EggTheme } from "@/lib/easter-eggs/themes"

// ── Pre-computed starfield (Interstellar) ─────────────────────────────────────

const STAR_SHADOW = [
  "12px 88px","156px 234px","303px 52px","78px 412px","445px 167px",
  "192px 340px","520px 88px","67px 520px","380px 295px","244px 44px",
  "108px 180px","490px 360px","35px 280px","600px 210px","320px 480px",
  "168px 140px","430px 70px","22px 360px","560px 130px","88px 470px",
  "270px 190px","710px 310px","145px 60px","480px 420px","350px 120px",
  "630px 380px","195px 260px","520px 240px","80px 140px","420px 510px",
  "290px 330px","650px 80px","110px 310px","740px 200px","360px 450px",
].map((s, i) =>
  `${s} ${i % 3 === 0 ? "2px" : "1px"} rgba(255,255,255,${i % 2 === 0 ? "0.75" : "0.45"})`
).join(", ")

// ── Effect components ─────────────────────────────────────────────────────────

function SpiderWebCorners({ opacity }: { opacity: number }) {
  return (
    <>
      {(["tl", "br"] as const).map((corner) => {
        const top    = corner === "tl" ? 60 : undefined
        const bottom = corner === "br" ? 0  : undefined
        const left   = corner === "tl" ? 0  : undefined
        const right  = corner === "br" ? 0  : undefined
        const scaleX = corner === "br" ? -1 : 1
        const scaleY = corner === "br" ? -1 : 1
        return (
          <div
            key={corner}
            style={{
              position: "fixed", top, bottom, left, right,
              width: 90, height: 90,
              pointerEvents: "none", zIndex: 44,
              opacity, animation: "rs-egg-fadein 2s ease forwards",
            }}
          >
            <svg viewBox="0 0 90 90" width="90" height="90"
              style={{ transform: `scale(${scaleX},${scaleY})`, transformOrigin: "45px 45px", display: "block" }}
            >
              <line x1="0" y1="0" x2="95" y2="0"   stroke="#c41e3a" strokeWidth="0.5" opacity="0.18"/>
              <line x1="0" y1="0" x2="0"  y2="95"  stroke="#c41e3a" strokeWidth="0.5" opacity="0.18"/>
              <line x1="0" y1="0" x2="90" y2="30"  stroke="#c41e3a" strokeWidth="0.4" opacity="0.13"/>
              <line x1="0" y1="0" x2="30" y2="90"  stroke="#c41e3a" strokeWidth="0.4" opacity="0.13"/>
              <line x1="0" y1="0" x2="90" y2="90"  stroke="#c41e3a" strokeWidth="0.35" opacity="0.10"/>
              <path d="M 22 0 Q 11 11 0 22"  fill="none" stroke="#c41e3a" strokeWidth="0.45" opacity="0.16"/>
              <path d="M 44 0 Q 22 22 0 44"  fill="none" stroke="#c41e3a" strokeWidth="0.4"  opacity="0.12"/>
              <path d="M 66 0 Q 33 33 0 66"  fill="none" stroke="#c41e3a" strokeWidth="0.35" opacity="0.09"/>
            </svg>
          </div>
        )
      })}
    </>
  )
}

const MOTE_CONFIGS = [
  { left: "15%", delay: "0s",   dur: "9s",  size: 3 },
  { left: "35%", delay: "2.2s", dur: "11s", size: 2 },
  { left: "55%", delay: "0.8s", dur: "8s",  size: 4 },
  { left: "72%", delay: "3.5s", dur: "12s", size: 2 },
  { left: "88%", delay: "1.6s", dur: "10s", size: 3 },
  { left: "6%",  delay: "4.1s", dur: "13s", size: 2 },
]

function SandEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(0deg, rgba(120,60,0,0.22) 0%, rgba(90,40,0,0.1) 30%, transparent 70%)",
        opacity, animation: "rs-egg-fadein 2s ease forwards",
      }} />
      {MOTE_CONFIGS.map((m, i) => (
        <div key={i} style={{
          position: "fixed", bottom: 0, left: m.left,
          width: m.size, height: m.size, borderRadius: "50%",
          background: "rgba(220,170,60,0.6)",
          pointerEvents: "none", zIndex: 2,
          animationName: "rs-sand-drift",
          animationDuration: m.dur,
          animationDelay: m.delay,
          animationTimingFunction: "ease-out",
          animationIterationCount: "infinite",
          animationFillMode: "both",
        }} />
      ))}
    </>
  )
}

function StarfieldEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 0%, rgba(20,30,80,0.3) 0%, transparent 65%)",
        opacity, animation: "rs-egg-fadein 2.5s ease forwards",
      }} />
      <div style={{
        position: "fixed", top: 0, left: 0, width: 1, height: 1,
        pointerEvents: "none", zIndex: 2,
        boxShadow: STAR_SHADOW,
        opacity, animation: "rs-stars-twinkle 6s ease-in-out infinite, rs-egg-fadein 2s ease forwards",
      }} />
    </>
  )
}

function ComicEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", top: 60, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 5%, rgba(255,210,0,0.18) 30%, rgba(30,100,255,0.10) 65%, transparent 95%)",
        pointerEvents: "none", zIndex: 44,
        opacity: opacity * 0.9, animation: "rs-egg-fadein 1.4s ease forwards",
      }} />
      <div style={{
        position: "fixed", bottom: 80, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 5%, rgba(30,100,255,0.10) 35%, rgba(255,210,0,0.14) 70%, transparent 95%)",
        pointerEvents: "none", zIndex: 44,
        opacity: opacity * 0.75, animation: "rs-egg-fadein 1.8s ease forwards",
      }} />
    </>
  )
}

const SPARKLE_CONFIGS = [
  { left: "22%", bottom: "25%", delay: "0s",   dur: "7s",  size: 4 },
  { left: "68%", bottom: "40%", delay: "1.8s", dur: "9s",  size: 3 },
  { left: "45%", bottom: "60%", delay: "0.5s", dur: "8s",  size: 5 },
  { left: "80%", bottom: "30%", delay: "3.2s", dur: "6s",  size: 3 },
  { left: "10%", bottom: "50%", delay: "2.1s", dur: "10s", size: 4 },
  { left: "55%", bottom: "20%", delay: "4s",   dur: "7s",  size: 3 },
]

function DreamyEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 30% 70%, rgba(80,20,160,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(40,60,200,0.12) 0%, transparent 50%)",
        opacity, animation: "rs-egg-fadein 2s ease forwards",
      }} />
      {SPARKLE_CONFIGS.map((s, i) => (
        <div key={i} style={{
          position: "fixed", left: s.left, bottom: s.bottom,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "rgba(200,160,255,0.9)",
          pointerEvents: "none", zIndex: 2,
          animationName: "rs-sparkle-float",
          animationDuration: s.dur,
          animationDelay: s.delay,
          animationTimingFunction: "ease-out",
          animationIterationCount: "infinite",
          animationFillMode: "both",
        }} />
      ))}
    </>
  )
}

function RainEffect({ theme, opacity }: { theme: EggTheme; opacity: number }) {
  const isBatman = theme.key === "the-batman"
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: isBatman ? "rgba(0,5,20,0.18)" : "rgba(20,8,0,0.15)",
        opacity, animation: "rs-egg-fadein 1.5s ease forwards",
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: `repeating-linear-gradient(
          ${isBatman ? "173deg" : "168deg"},
          transparent 0%, transparent 97%,
          ${isBatman ? "rgba(80,120,200,0.05)" : "rgba(200,100,30,0.05)"} 97%,
          ${isBatman ? "rgba(80,120,200,0.05)" : "rgba(200,100,30,0.05)"} 100%
        )`,
        backgroundSize: "3px 36px",
        opacity, animation: "rs-rain-fall 1.8s linear infinite",
      }} />
    </>
  )
}

function SpaceGlowEffect({ theme, opacity }: { theme: EggTheme; opacity: number }) {
  const accent = theme.accentColor
  const dimmed = accent.replace(/[\d.]+\)$/, "0.15)")
  const dimmer = accent.replace(/[\d.]+\)$/, "0.08)")
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: `radial-gradient(ellipse at 60% 40%, ${dimmed} 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, ${dimmer} 0%, transparent 50%)`,
      opacity, animation: "rs-space-pulse 8s ease-in-out infinite, rs-egg-fadein 2s ease forwards",
    }} />
  )
}

// ── New effects ───────────────────────────────────────────────────────────────

function DrumLightEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 100%, rgba(30,20,0,0.08) 0%, transparent 60%)",
        opacity, animation: "rs-egg-fadein 2s ease forwards",
      }} />
      {/* Left beam — 1px, very faint */}
      <div style={{
        position: "fixed", top: 60, left: "18%", pointerEvents: "none", zIndex: 2,
        width: 1, height: "30vh",
        background: "linear-gradient(180deg, rgba(255,230,80,0.10) 0%, transparent 100%)",
        transformOrigin: "top center",
        transform: "rotate(-10deg)",
        opacity, animation: "rs-drum-pulse 2.8s ease-in-out infinite",
      }} />
      {/* Center beam */}
      <div style={{
        position: "fixed", top: 60, left: "50%", pointerEvents: "none", zIndex: 2,
        width: 1, height: "35vh",
        background: "linear-gradient(180deg, rgba(255,240,100,0.09) 0%, transparent 100%)",
        transformOrigin: "top center",
        transform: "rotate(1deg)",
        opacity, animation: "rs-drum-pulse 2.2s ease-in-out infinite 0.5s",
      }} />
      {/* Right beam */}
      <div style={{
        position: "fixed", top: 60, right: "20%", pointerEvents: "none", zIndex: 2,
        width: 1, height: "28vh",
        background: "linear-gradient(180deg, rgba(255,220,60,0.08) 0%, transparent 100%)",
        transformOrigin: "top center",
        transform: "rotate(9deg)",
        opacity, animation: "rs-drum-pulse 2.5s ease-in-out infinite 1.1s",
      }} />
    </>
  )
}

function GoldGrainEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(180deg, rgba(100,68,4,0.18) 0%, rgba(80,50,2,0.12) 40%, transparent 75%)",
        opacity, animation: "rs-egg-fadein 2s ease forwards",
      }} />
      {/* Gold shimmer hairline below nav */}
      <div style={{
        position: "fixed", top: 60, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(220,175,40,0.4) 30%, rgba(220,175,40,0.6) 50%, rgba(220,175,40,0.4) 70%, transparent 100%)",
        pointerEvents: "none", zIndex: 44,
        opacity, animation: "rs-egg-fadein 2s ease forwards",
      }} />
      {/* Film grain noise layer */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)' opacity='0.06'/%3E%3C/svg%3E\")",
        backgroundSize: "180px 180px",
        opacity: opacity * 0.65,
        animation: "rs-grain-shift 0.14s steps(1) infinite",
        mixBlendMode: "overlay" as const,
      }} />
    </>
  )
}

function RingGlowEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 50%, rgba(180,130,20,0.1) 0%, transparent 65%)",
        opacity, animation: "rs-ring-breathe 6s ease-in-out infinite, rs-egg-fadein 2s ease forwards",
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        width: 240, height: 240,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: "0.5px solid rgba(220,170,40,0.12)",
        boxShadow: "0 0 70px 24px rgba(180,130,20,0.05), inset 0 0 40px 10px rgba(180,130,20,0.04)",
        pointerEvents: "none", zIndex: 2,
        opacity, animation: "rs-ring-breathe 6s ease-in-out infinite, rs-egg-fadein 2s ease forwards",
      }} />
    </>
  )
}

function GlitchEffect({ opacity }: { opacity: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: "radial-gradient(ellipse at 70% 30%, rgba(200,40,80,0.07) 0%, transparent 55%)",
      opacity, animation: "rs-egg-fadein 1.5s ease forwards",
    }} />
  )
}

function ChemGlowEffect({ opacity }: { opacity: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: "radial-gradient(ellipse at 40% 60%, rgba(0,200,220,0.1) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(0,160,180,0.07) 0%, transparent 45%)",
      opacity, animation: "rs-space-pulse 7s ease-in-out infinite, rs-egg-fadein 2s ease forwards",
    }} />
  )
}

function SterileEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(180deg, rgba(180,215,230,0.05) 0%, transparent 50%)",
        opacity, animation: "rs-egg-fadein 2s ease forwards",
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2,
        backgroundImage: "repeating-linear-gradient(0deg, rgba(160,215,230,0.025) 0px, rgba(160,215,230,0.025) 1px, transparent 1px, transparent 48px)",
        opacity, animation: "rs-egg-fadein 2.5s ease forwards",
      }} />
    </>
  )
}

function TicketEffect({ opacity }: { opacity: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
      background: "radial-gradient(ellipse at 50% 0%, rgba(200,155,60,0.12) 0%, transparent 55%)",
      opacity, animation: "rs-space-pulse 9s ease-in-out infinite, rs-egg-fadein 2s ease forwards",
    }} />
  )
}

function CorpGoldEffect({ opacity }: { opacity: number }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at 50% 0%, rgba(5,15,60,0.15) 0%, transparent 55%)",
        opacity, animation: "rs-egg-fadein 2s ease forwards",
      }} />
      <div style={{
        position: "fixed", top: 60, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 5%, rgba(200,165,40,0.5) 30%, rgba(200,165,40,0.7) 50%, rgba(200,165,40,0.5) 70%, transparent 95%)",
        pointerEvents: "none", zIndex: 44,
        opacity, animation: "rs-egg-fadein 1.5s ease forwards",
      }} />
    </>
  )
}

// ── Secret toast ──────────────────────────────────────────────────────────────

function SecretToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 4200)
    return () => window.clearTimeout(t)
  }, [])
  if (!visible) return null
  return (
    <div style={{
      position: "fixed",
      bottom: "calc(env(safe-area-inset-bottom, 0px) + 130px)",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 90,
      padding: "10px 18px",
      borderRadius: 999,
      border: "0.5px solid rgba(195,28,28,0.4)",
      background: "rgba(10,4,4,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      color: "rgba(255,255,255,0.88)",
      fontSize: 12,
      letterSpacing: "0.03em",
      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
      pointerEvents: "none",
      animation: "rs-egg-fadein 0.4s ease forwards",
      whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  )
}

// ── Effect dispatcher ─────────────────────────────────────────────────────────

function EffectRenderer({ theme, mode }: { theme: EggTheme; mode: ThemeMode }) {
  const o = mode === "full" ? 1 : 0.55
  const { effectType } = theme

  if (effectType === "spiderweb") return <SpiderWebCorners opacity={o * 0.25} />
  if (effectType === "sand")      return <SandEffect opacity={o} />
  if (effectType === "starfield") return <StarfieldEffect opacity={o} />
  if (effectType === "comic")     return <ComicEffect opacity={o} />
  if (effectType === "dreamy")    return <DreamyEffect opacity={o} />
  if (effectType === "rain")      return <RainEffect theme={theme} opacity={o} />
  if (effectType === "spaceglow") return <SpaceGlowEffect theme={theme} opacity={o} />
  if (effectType === "drumlight") return <DrumLightEffect opacity={o} />
  if (effectType === "goldgrain") return <GoldGrainEffect opacity={o} />
  if (effectType === "ringglow")  return <RingGlowEffect opacity={o} />
  if (effectType === "glitch")    return <GlitchEffect opacity={o} />
  if (effectType === "chemglow")  return <ChemGlowEffect opacity={o} />
  if (effectType === "sterile")   return <SterileEffect opacity={o} />
  if (effectType === "ticket")    return <TicketEffect opacity={o} />
  if (effectType === "corpgold")  return <CorpGoldEffect opacity={o} />
  return null
}

// ── URL parser ────────────────────────────────────────────────────────────────

function parseMediaFromPath(pathname: string): MediaForMatching | null {
  const filmMatch = pathname.match(/^\/films\/(\d+)/)
  if (filmMatch) return { id: filmMatch[1], media_type: "movie" }
  const seriesMatch = pathname.match(/^\/series\/(\d+)/)
  if (seriesMatch) return { id: seriesMatch[1], media_type: "tv" }
  const bookMatch = pathname.match(/^\/books\/([^/]+)/)
  if (bookMatch) return { id: bookMatch[1], media_type: "book" }
  return null
}

// ── Root component ────────────────────────────────────────────────────────────

export default function DynamicThemeLayer() {
  const pathname = usePathname()
  const { isOpen: diaryOpen, media: diaryMedia } = useDiaryLog()
  const [mode, setMode]           = useState<ThemeMode>("subtle")
  const [secretMsg, setSecretMsg] = useState<string | null>(null)
  const shownSecretRef            = useRef<Set<string>>(new Set())

  useEffect(() => {
    setMode(getThemeMode())
    function onStorage(e: StorageEvent) {
      if (e.key === THEME_MODE_KEY && e.newValue) {
        const v = e.newValue
        if (v === "full" || v === "subtle" || v === "off") setMode(v)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    function onThemeChange() { setMode(getThemeMode()) }
    window.addEventListener("rs-theme-change", onThemeChange)
    return () => window.removeEventListener("rs-theme-change", onThemeChange)
  }, [])

  // Diary modal media takes priority over URL-derived media
  const activeMedia: MediaForMatching | null =
    diaryOpen && diaryMedia
      ? {
          id:         diaryMedia.media_id,
          tmdb_id:    diaryMedia.tmdb_id,
          media_id:   diaryMedia.media_id,
          title:      diaryMedia.title,
          media_type: diaryMedia.media_type,
        }
      : parseMediaFromPath(pathname)

  const theme = activeMedia ? matchTheme(activeMedia) : null

  // Secret unlock tracking (Spider-Man: 5 distinct films → toast)
  useEffect(() => {
    if (!theme?.secretKey) return
    const trackId = String(
      activeMedia?.tmdb_id ?? activeMedia?.id ?? ""
    )
    if (!trackId) return

    const { unlocked } = recordSecretView(theme.secretKey, trackId)
    const key = `${theme.secretKey}-unlocked`

    if (unlocked && !shownSecretRef.current.has(key)) {
      shownSecretRef.current.add(key)
      try {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1")
          setSecretMsg("🕸️ Web-Slinger — you've earned a hidden distinction.")
          window.setTimeout(() => setSecretMsg(null), 5000)
        }
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, diaryOpen])

  if (mode === "off" || !theme) return null

  return (
    <>
      <EffectRenderer theme={theme} mode={mode} />
      {secretMsg ? <SecretToast message={secretMsg} /> : null}
    </>
  )
}
