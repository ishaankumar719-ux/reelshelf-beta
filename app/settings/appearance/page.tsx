"use client"

import { useEffect, useState } from "react"
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/easterEggs"

const RS_FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const MODES: { value: ThemeMode; label: string; description: string }[] = [
  {
    value: "full",
    label: "Full",
    description: "All ambient effects and animations at full intensity.",
  },
  {
    value: "subtle",
    label: "Subtle",
    description: "Reduced-intensity effects — present but barely noticeable. Recommended.",
  },
  {
    value: "off",
    label: "Off",
    description: "No effects. Pure ReelShelf.",
  },
]

export default function AppearanceSettingsPage() {
  const [mode, setMode] = useState<ThemeMode>("subtle")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMode(getThemeMode())
  }, [])

  function handleSelect(next: ThemeMode) {
    setMode(next)
    setThemeMode(next)
    setSaved(true)
    // Notify DynamicThemeLayer in the same tab
    window.dispatchEvent(new CustomEvent("rs-theme-change"))
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <section style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 64px" }}>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.32)",
          fontFamily: RS_FONT,
        }}
      >
        Settings · Appearance
      </p>
      <h1
        style={{
          margin: "10px 0 0",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "rgba(255,255,255,0.92)",
          fontFamily: RS_FONT,
        }}
      >
        Dynamic Themes
      </h1>
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 14,
          lineHeight: 1.7,
          color: "rgba(255,255,255,0.48)",
          maxWidth: 520,
          fontFamily: RS_FONT,
        }}
      >
        Certain films, series, and books trigger a subtle ambient theme on their detail pages — a faint atmosphere that shifts with the work. These are designed to be cinematic, not distracting.
      </p>

      <div
        style={{
          marginTop: 32,
          borderRadius: 24,
          border: "0.5px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(12,12,20,0.98) 0%, rgba(8,8,14,0.98) 100%)",
          overflow: "hidden",
        }}
      >
        {MODES.map((m, i) => (
          <button
            key={m.value}
            type="button"
            onClick={() => handleSelect(m.value)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "18px 22px",
              background: "none",
              border: "none",
              borderTop: i === 0 ? "none" : "0.5px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.12s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 500,
                  color: mode === m.value ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)",
                  fontFamily: RS_FONT,
                  transition: "color 0.12s ease",
                }}
              >
                {m.label}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: RS_FONT,
                }}
              >
                {m.description}
              </p>
            </div>

            {/* Selection indicator */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: mode === m.value
                  ? "none"
                  : "1.5px solid rgba(255,255,255,0.2)",
                background: mode === m.value ? "white" : "transparent",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
            >
              {mode === m.value ? (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "black",
                  }}
                />
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {saved ? (
        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "rgba(29,158,117,0.85)",
            fontFamily: RS_FONT,
            animation: "rs-egg-fadein 0.3s ease",
          }}
        >
          Saved.
        </p>
      ) : null}

      {/* Current effects list */}
      <div style={{ marginTop: 40 }}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
            fontFamily: RS_FONT,
          }}
        >
          Active themes
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "🕸️", name: "Spider-Man",        hint: "Web corners · crimson" },
            { icon: "🏜️", name: "Dune",              hint: "Sand drift · amber warmth" },
            { icon: "🌌", name: "Interstellar",      hint: "Starfield · deep space" },
            { icon: "🥁", name: "Whiplash",          hint: "Stage beams · yellow pulse" },
            { icon: "🌙", name: "La La Land",        hint: "Dreamy sparkles · violet" },
            { icon: "🌧️", name: "The Batman",        hint: "Rain overlay · noir dark" },
            { icon: "🌆", name: "Blade Runner 2049", hint: "Rain overlay · amber neon" },
            { icon: "🎞️", name: "Babylon",           hint: "Gold shimmer · film grain" },
            { icon: "💍", name: "Lord of the Rings", hint: "Ring glow · golden breath" },
            { icon: "🧼", name: "Fight Club",        hint: "Chromatic glitch · magenta" },
            { icon: "⚡", name: "Invincible",        hint: "Comic flash · yellow/blue" },
            { icon: "🧪", name: "Breaking Bad",      hint: "Crystal shimmer · teal blue" },
            { icon: "🏢", name: "Severance",         hint: "Fluorescent grid · cold white" },
            { icon: "🍳", name: "The Bear",          hint: "Warm kitchen light · amber" },
            { icon: "👔", name: "Succession",        hint: "Gold hairline · navy corporate" },
            { icon: "🚀", name: "Project Hail Mary", hint: "Nebula glow · teal" },
            { icon: "⚗️", name: "Harry Potter",      hint: "Dreamy sparkles · gold" },
            { icon: "🛸", name: "Arrival",           hint: "Space glow · steel blue" },
          ].map((entry) => (
            <div
              key={entry.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                borderRadius: 14,
                border: "0.5px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{entry.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.78)", fontFamily: RS_FONT }}>
                  {entry.name}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: RS_FONT }}>
                  {entry.hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        style={{
          marginTop: 32,
          fontSize: 11,
          lineHeight: 1.7,
          color: "rgba(255,255,255,0.22)",
          fontFamily: RS_FONT,
        }}
      >
        More themes are added with new releases. Some are hidden — you'll know them when you find them.
      </p>
    </section>
  )
}
