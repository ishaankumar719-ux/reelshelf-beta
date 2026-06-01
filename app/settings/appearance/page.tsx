"use client"

import { useEasterEgg } from "@/components/easter-eggs/EasterEggProvider"
import { type ThemeMode } from "@/lib/easterEggs"

const RS_FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const INTENSITY_MODES: { value: ThemeMode; label: string; description: string }[] = [
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
]

const ACTIVE_THEMES = [
  // Films
  { icon: "🕸️", name: "Spider-Man / Spider-Verse", hint: "Web strands · crimson corners" },
  { icon: "🏜️", name: "Dune",                      hint: "Spice motes · amber warmth" },
  { icon: "🌌", name: "Interstellar",               hint: "Starfield · deep space" },
  { icon: "🥁", name: "Whiplash",                   hint: "Rhythm pulse · yellow bar" },
  { icon: "🌙", name: "La La Land",                 hint: "Dreamy sparkles · violet" },
  { icon: "🌧️", name: "The Batman",                 hint: "Rain overlay · noir dark" },
  { icon: "🌆", name: "Blade Runner 2049",          hint: "Rain overlay · amber neon" },
  { icon: "✨", name: "Babylon",                    hint: "Gold shimmer · film grain" },
  { icon: "🦇", name: "The Dark Knight",            hint: "Bat signal glow · smoke drift" },
  { icon: "🌀", name: "Inception",                  hint: "Spinning top · dream rings" },
  { icon: "🌧️", name: "John Wick",                  hint: "Soft rain · barely there" },
  { icon: "🔥", name: "Lord of the Rings",          hint: "Ember sparks · forge glow" },
  { icon: "🌪️", name: "Mad Max: Fury Road",         hint: "Dust storm · desert haze" },
  { icon: "🛸", name: "Arrival",                    hint: "Starfield · steel blue" },
  { icon: "🧼", name: "Fight Club",                 hint: "Chromatic glitch · magenta" },
  // TV
  { icon: "⚡", name: "Invincible",                 hint: "Comic flash · yellow/blue" },
  { icon: "🍳", name: "The Bear",                   hint: "Warm kitchen light · amber" },
  { icon: "🧪", name: "Breaking Bad",               hint: "Chemistry particles · teal" },
  { icon: "⚖️", name: "Better Call Saul",           hint: "Neon amber glow · legal lines" },
  { icon: "💧", name: "Avatar: The Last Airbender", hint: "Element particles · four nations" },
  { icon: "🏢", name: "Severance",                  hint: "Fluorescent grid · cold white" },
  { icon: "❄️", name: "Game of Thrones",            hint: "Snow drift · frost/fire edge" },
  { icon: "🍄", name: "The Last of Us",             hint: "Spore particles · green haze" },
  { icon: "💉", name: "The Boys",                   hint: "Compound V drops · electric blue" },
  { icon: "⚔️", name: "Attack on Titan",            hint: "Steam burst · rising wisps" },
  { icon: "🌫️", name: "True Detective",             hint: "Atmospheric fog · drifting" },
  // Books
  { icon: "🚀", name: "Project Hail Mary",          hint: "Science grid · teal nebula" },
  { icon: "🏜️", name: "Dune (Book)",                hint: "Spice motes · amber warmth" },
  { icon: "🔥", name: "The Hunger Games",           hint: "Ember sparks · fire" },
  { icon: "⚗️", name: "Harry Potter",               hint: "Magic sparks · gold" },
  { icon: "🐦", name: "Six of Crows",               hint: "Crow shadow · Ketterdam night" },
  { icon: "🔍", name: "Agatha Christie",            hint: "Typewriter lines · parchment" },
  { icon: "⚡", name: "Percy Jackson",              hint: "Wave lightning · sea surge" },
  { icon: "💍", name: "Lord of the Rings (Book)",   hint: "Embers · Mordor forge" },
  { icon: "✨", name: "The Hobbit",                 hint: "Gold dust · treasure hoard" },
]

export default function AppearanceSettingsPage() {
  const { mode, setMode, isEnabled } = useEasterEgg()

  function handleToggle() {
    setMode(isEnabled ? "off" : "subtle")
  }

  function handleIntensity(next: ThemeMode) {
    setMode(next)
  }

  return (
    <section style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 64px" }}>
      <p style={{
        margin: 0,
        fontSize: 10, fontWeight: 600, letterSpacing: "0.24em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.32)",
        fontFamily: RS_FONT,
      }}>
        Settings · Personalisation
      </p>
      <h1 style={{
        margin: "10px 0 0",
        fontSize: 28, fontWeight: 500, letterSpacing: "-0.03em",
        color: "rgba(255,255,255,0.92)", fontFamily: RS_FONT,
      }}>
        Easter Eggs
      </h1>
      <p style={{
        margin: "10px 0 0",
        fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.48)",
        maxWidth: 520, fontFamily: RS_FONT,
      }}>
        Certain films, series, and books trigger a subtle ambient theme on their detail pages
        — a faint atmosphere that shifts with the work. Designed to be cinematic, not distracting.
      </p>

      {/* ── ON / OFF toggle ──────────────────────────────────────────────── */}
      <div style={{
        marginTop: 32,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 22px",
        borderRadius: 16,
        border: "0.5px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(12,12,20,0.98) 0%, rgba(8,8,14,0.98) 100%)",
      }}>
        <div>
          <p style={{
            margin: 0, fontSize: 15, fontWeight: 500,
            color: "rgba(255,255,255,0.88)", fontFamily: RS_FONT,
          }}>
            Easter Eggs
          </p>
          <p style={{
            margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.36)",
            fontFamily: RS_FONT,
          }}>
            {isEnabled ? "Active on matching pages" : "Disabled globally"}
          </p>
        </div>
        {/* Toggle pill */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isEnabled ? "Disable easter eggs" : "Enable easter eggs"}
          style={{
            width: 44, height: 26, borderRadius: 13,
            background: isEnabled ? "#1D9E75" : "rgba(255,255,255,0.10)",
            border: "none", cursor: "pointer", position: "relative",
            transition: "background 0.18s ease", flexShrink: 0,
          }}
        >
          <div style={{
            position: "absolute",
            top: 3, left: isEnabled ? 21 : 3,
            width: 20, height: 20, borderRadius: "50%",
            background: "white",
            transition: "left 0.18s ease",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          }} />
        </button>
      </div>

      {/* ── Intensity selector (visible when ON) ─────────────────────────── */}
      {isEnabled && (
        <div style={{
          marginTop: 12,
          borderRadius: 16,
          border: "0.5px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.015)",
          overflow: "hidden",
        }}>
          {INTENSITY_MODES.map((m, i) => (
            <button
              key={m.value}
              type="button"
              onClick={() => handleIntensity(m.value)}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 16, padding: "16px 22px",
                background: "none", border: "none",
                borderTop: i === 0 ? "none" : "0.5px solid rgba(255,255,255,0.05)",
                cursor: "pointer", textAlign: "left",
                transition: "background 0.12s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
            >
              <div>
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 500,
                  color: mode === m.value ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)",
                  fontFamily: RS_FONT, transition: "color 0.12s ease",
                }}>
                  {m.label}
                </p>
                <p style={{
                  margin: "3px 0 0", fontSize: 12, lineHeight: 1.5,
                  color: "rgba(255,255,255,0.32)", fontFamily: RS_FONT,
                }}>
                  {m.description}
                </p>
              </div>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                border: mode === m.value ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                background: mode === m.value ? "white" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s ease",
              }}>
                {mode === m.value && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "black" }} />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Reduced motion notice ─────────────────────────────────────────── */}
      <p style={{
        marginTop: 14, fontSize: 11, lineHeight: 1.6,
        color: "rgba(255,255,255,0.22)", fontFamily: RS_FONT,
      }}>
        Animations respect your system's reduced-motion preference — static glow versions
        are shown automatically when motion is reduced.
      </p>

      {/* ── Active themes ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 36 }}>
        <p style={{
          margin: "0 0 14px",
          fontSize: 10, fontWeight: 600, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
          fontFamily: RS_FONT,
        }}>
          Supported titles · {ACTIVE_THEMES.length}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ACTIVE_THEMES.map((entry) => (
            <div
              key={entry.name}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px", borderRadius: 12,
                border: "0.5px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.018)",
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{entry.icon}</span>
              <div>
                <p style={{
                  margin: 0, fontSize: 13,
                  color: "rgba(255,255,255,0.76)", fontFamily: RS_FONT,
                }}>
                  {entry.name}
                </p>
                <p style={{
                  margin: 0, fontSize: 11,
                  color: "rgba(255,255,255,0.30)", fontFamily: RS_FONT,
                }}>
                  {entry.hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p style={{
        marginTop: 28, fontSize: 11, lineHeight: 1.7,
        color: "rgba(255,255,255,0.20)", fontFamily: RS_FONT,
      }}>
        More themes ship with new releases. Some are hidden — you'll know them when you find them.
      </p>
    </section>
  )
}
