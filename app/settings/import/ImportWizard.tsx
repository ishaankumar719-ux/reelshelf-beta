"use client"

import { useRef, useState, useCallback, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  parseLetterboxdCsvV2,
  type ParsedLetterboxdEntry,
} from "@/lib/letterboxdImport"
import {
  batchImportLetterboxd,
  type BatchImportResult,
  type BatchImportProgress,
} from "@/lib/supabase/letterboxdBatchImport"
import type { DiaryMovie } from "@/lib/diary"
import type { RssWizardEntry } from "@/lib/import/types"
import { useAuth } from "@/components/AuthProvider"

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step         = "input" | "loading" | "preview" | "importing" | "complete"
type ImportSource = "username" | "csv"

type WizardEntry = RssWizardEntry & { skipped: boolean }

type LoadProgress =
  | { phase: "fetch" }
  | { phase: "match"; done: number; total: number }

// Convert a parsed CSV entry directly to a WizardEntry.
// Uses the local catalogue match already resolved by parseLetterboxdCsvV2 —
// no TMDB API call needed for the fast import path.
function csvEntryToWizard(e: ParsedLetterboxdEntry): WizardEntry {
  return {
    sourceRow:        e.sourceRow,
    title:            e.title,
    year:             e.year,
    rating:           e.rating,
    letterboxdRating: e.letterboxdRating,
    watchedDate:      e.watchedDate,
    review:           e.review,
    rewatch:          e.rewatch,
    containsSpoilers: e.containsSpoilers,
    favourite:        false,
    mediaType:        "movie",
    mediaId:          e.diaryEntry.id,
    posterUrl:        e.diaryEntry.poster ?? null,
    skipped:          false,
  }
}

// ─── Conversion to DiaryMovie ─────────────────────────────────────────────────

function toDiary(e: WizardEntry): DiaryMovie {
  return {
    id:               e.mediaId,
    mediaType:        e.mediaType,
    title:            e.title,
    year:             e.year,
    poster:           e.posterUrl ?? undefined,
    genres:           [],
    rating:           e.rating,
    letterboxdRating: e.letterboxdRating ?? null,
    review:           e.review,
    watchedDate:      e.watchedDate,
    favourite:        e.favourite,
    rewatch:          e.rewatch,
    containsSpoilers: e.containsSpoilers,
    watchedInCinema:  false,
    savedAt:          `${e.watchedDate}T12:00:00.000Z`,
  }
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Stat({ value, label, accent }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${accent ? "rgba(29,158,117,0.25)" : "rgba(255,255,255,0.07)"}`,
      background: accent ? "rgba(29,158,117,0.08)" : "rgba(255,255,255,0.025)",
      padding: "12px 14px 10px",
    }}>
      <p style={{ margin: 0, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>{label}</p>
      <p style={{ margin: "5px 0 0", fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px", color: accent ? "#6eddb8" : "rgba(255,255,255,0.88)" }}>{value}</p>
    </div>
  )
}

function Bar({ pct, color = "#1D9E75" }: { pct: number; color?: string }) {
  return (
    <div style={{ width: "100%", height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: `linear-gradient(90deg,${color},${color}bb)`, borderRadius: 3, transition: "width 0.25s ease" }} />
    </div>
  )
}

function Err({ msg }: { msg: string }) {
  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", padding: "12px 16px", fontSize: 13, color: "#fca5a5", fontFamily: FONT, lineHeight: 1.6 }}>
      {msg}
    </div>
  )
}

function Btn({ onClick, disabled, children, style }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ height: 46, padding: "0 26px", borderRadius: 999, border: "none", background: disabled ? "rgba(29,158,117,0.3)" : "#1D9E75", color: "white", fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: FONT, transition: "opacity 0.15s", ...style }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.85" }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
    >{children}</button>
  )
}

function Ghost({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ height: 40, padding: "0 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: FONT, cursor: "pointer" }}
    >{children}</button>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "input",     label: "Enter"    },
  { key: "loading",   label: "Fetch"    },
  { key: "preview",   label: "Preview"  },
  { key: "importing", label: "Import"   },
  { key: "complete",  label: "Done"     },
]

function Steps({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current)
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32, overflowX: "auto", paddingBottom: 2 }}>
      {STEPS.map((s, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                border: `1.5px solid ${done ? "rgba(29,158,117,0.6)" : active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)"}`,
                background: done ? "rgba(29,158,117,0.15)" : active ? "rgba(255,255,255,0.07)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700,
                color: done ? "#6eddb8" : active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
                transition: "all 0.2s",
              }}>{done ? "✓" : i + 1}</div>
              <span style={{ fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "rgba(255,255,255,0.65)" : done ? "rgba(29,158,117,0.65)" : "rgba(255,255,255,0.2)", fontFamily: FONT }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 ? (
              <div style={{ width: 26, height: 1, background: i < idx ? "rgba(29,158,117,0.35)" : "rgba(255,255,255,0.07)", margin: "0 4px", marginBottom: 14, flexShrink: 0 }} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step: Input ──────────────────────────────────────────────────────────────

function InputStep({
  onUsername,
  onCsvFile,
  error,
}: {
  onUsername: (username: string) => void
  onCsvFile: (file: File) => void
  error: string | null
}) {
  const [username, setUsername] = useState("")
  const [expOpen,  setExpOpen]  = useState(false)
  const [dragActive, setDrag]   = useState(false)
  const fileRef                 = useRef<HTMLInputElement>(null)

  function submitUsername() {
    const trimmed = username.trim().replace(/^@/, "")
    if (trimmed.length >= 1) onUsername(trimmed)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) onCsvFile(f)
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* ── Primary: Upload CSV export ── */}
      <div style={{
        borderRadius: 20,
        border: "1px solid rgba(29,158,117,0.2)",
        background: "linear-gradient(180deg,rgba(29,158,117,0.06),rgba(29,158,117,0.02))",
        padding: "22px 24px",
        display: "grid",
        gap: 16,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(29,158,117,0.7)", fontFamily: FONT, fontWeight: 600 }}>
            Upload Letterboxd CSV export
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 15, color: "rgba(255,255,255,0.6)", fontFamily: FONT, lineHeight: 1.55 }}>
            The fastest and most reliable way to import your full diary history.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
            minHeight: 130, borderRadius: 14,
            border: dragActive ? "1.5px dashed rgba(29,158,117,0.7)" : "1.5px dashed rgba(29,158,117,0.3)",
            background: dragActive ? "rgba(29,158,117,0.07)" : "rgba(29,158,117,0.02)",
            cursor: "pointer", transition: "all 0.15s", padding: "24px 20px", textAlign: "center",
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(29,158,117,0.5)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <polyline points="9 15 12 12 15 15"/>
          </svg>
          <div>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)", fontFamily: FONT, fontWeight: 600 }}>Drop diary.csv here or click to browse</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.32)", fontFamily: FONT }}>Supports diary.csv, ratings.csv, watched.csv, reviews.csv</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsvFile(f); e.target.value = "" }} />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 13px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.05)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.26)", fontFamily: FONT, lineHeight: 1.6 }}>
            Go to <strong style={{ color: "rgba(255,255,255,0.42)" }}>letterboxd.com → Settings → Import &amp; Export → Export your data</strong> to download your CSV. Use <strong style={{ color: "rgba(255,255,255,0.42)" }}>diary.csv</strong> for full history with dates.
          </p>
        </div>

        {error ? <Err msg={error} /> : null}
      </div>

      {/* ── Experimental: Import by username ── */}
      <div style={{ borderRadius: 14, border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.02)", overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setExpOpen((o) => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
            color: "rgba(245,158,11,0.65)", fontFamily: FONT, textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>Experimental</span>
            <span style={{ fontSize: 12, color: "rgba(245,158,11,0.45)" }}>— Import by Letterboxd username</span>
          </div>
          <span style={{ fontSize: 10, display: "inline-block", transform: expOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "rgba(245,158,11,0.4)" }}>▾</span>
        </button>

        {expOpen ? (
          <div style={{ padding: "0 16px 16px", display: "grid", gap: 12, borderTop: "0.5px solid rgba(245,158,11,0.12)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "rgba(245,158,11,0.05)", border: "0.5px solid rgba(245,158,11,0.15)" }}>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(245,158,11,0.7)", fontFamily: FONT, lineHeight: 1.6 }}>
                Username import may stall at auth or fetch stages during beta. Limited to your most recent ~50–100 diary entries. Use the CSV export above for your complete history.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
                <span style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  fontSize: 12, color: "rgba(255,255,255,0.2)", fontFamily: FONT, pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}>letterboxd.com/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitUsername() }}
                  placeholder="your-username"
                  autoComplete="off"
                  style={{
                    width: "100%", height: 44, borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.11)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: FONT,
                    paddingLeft: 120, paddingRight: 13,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={submitUsername}
                disabled={username.trim().length < 1}
                style={{
                  height: 44, padding: "0 20px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)",
                  background: username.trim().length < 1 ? "transparent" : "rgba(245,158,11,0.1)",
                  color: username.trim().length < 1 ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.8)",
                  fontSize: 13, fontFamily: FONT, cursor: username.trim().length < 1 ? "not-allowed" : "pointer",
                }}
              >
                Find Profile
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Step: Loading ────────────────────────────────────────────────────────────

function LoadingStep({ source, progress }: { source: ImportSource; progress: LoadProgress | null }) {
  const isMatch = progress?.phase === "match"
  const pct = isMatch ? (progress.done / progress.total) * 100 : 0

  return (
    <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))", padding: 28, display: "grid", gap: 18 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
          {source === "username" ? "Fetching from Letterboxd" : "Processing CSV"}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", color: "rgba(255,255,255,0.88)" }}>
          {!progress
            ? source === "username" ? "Connecting to Letterboxd…" : "Reading your CSV…"
            : progress.phase === "fetch"
              ? "Fetching your diary…"
              : `Matching films to TMDB… ${progress.done} / ${progress.total}`}
        </p>
      </div>

      {isMatch ? (
        <>
          <Bar pct={pct} />
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
            {progress.done} of {progress.total} films matched
          </p>
        </>
      ) : (
        <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(29,158,117,0.5)", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 180}ms`, display: "inline-block" }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Step: Preview ────────────────────────────────────────────────────────────

type LimitChoice = 1 | 5 | 10 | 25 | "all"

const LIMIT_OPTIONS: Array<{ value: LimitChoice; label: string }> = [
  { value: 1,     label: "1"   },
  { value: 5,     label: "5"   },
  { value: 10,    label: "10"  },
  { value: 25,    label: "25"  },
  { value: "all", label: "All" },
]

function PreviewStep({
  entries,
  source,
  displayName,
  limited,
  onContinue,
  onBack,
}: {
  entries: WizardEntry[]
  source: ImportSource
  displayName: string
  limited: boolean
  onContinue: (final: WizardEntry[]) => void
  onBack: () => void
}) {
  const [list,        setList]        = useState(entries)
  const [limitChoice, setLimitChoice] = useState<LimitChoice>("all")

  const shown         = list.slice(0, 20)
  const manualSkipped = list.filter((e) => e.skipped).length
  const activeEntries = list.filter((e) => !e.skipped)
  const importCount   = limitChoice === "all"
    ? activeEntries.length
    : Math.min(limitChoice as number, activeEntries.length)

  const withRating  = list.filter((e) => e.rating !== null).length
  const withReview  = list.filter((e) => e.review.trim().length > 0).length
  const withFav     = list.filter((e) => e.favourite).length
  const rewatches   = list.filter((e) => e.rewatch).length
  const noTmdb      = list.filter((e) => !e.mediaId.startsWith("tmdb-")).length

  function toggleSkip(sourceRow: number) {
    setList((prev) => prev.map((e) => e.sourceRow === sourceRow ? { ...e, skipped: !e.skipped } : e))
  }

  function handleContinue() {
    console.log(
      "[PREVIEW] Import clicked — selectedAmount:", limitChoice,
      "| activeEntries:", activeEntries.length,
      "| importCount:", importCount,
    )

    if (importCount === 0) {
      console.warn("[PREVIEW] importCount is 0 — button should have been disabled")
      return
    }

    const chosen    = activeEntries.slice(0, importCount)
    const chosenSet = new Set(chosen.map((e) => e.sourceRow))

    console.log("[PREVIEW] entriesToImport:", chosen.length, "sourceRows sample:", chosen.slice(0, 3).map((e) => e.sourceRow))

    // All entries not in chosenSet become skipped (includes previously manual-skipped
    // entries that were not active, so they stay skipped too).
    const final = list.map((e) => ({ ...e, skipped: !chosenSet.has(e.sourceRow) }))

    console.log("[PREVIEW] final — active:", final.filter((e) => !e.skipped).length, "skipped:", final.filter((e) => e.skipped).length)

    onContinue(final)
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Header */}
      {displayName ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={onBack} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(255,255,255,0.36)", fontSize: 12, fontFamily: FONT }}>← Back</button>
          <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: FONT }}>{displayName}</span>
        </div>
      ) : null}

      {/* Stats */}
      <div className="import-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        <Stat value={list.length} label="Entries" accent />
        <Stat value={withRating}  label="Ratings"       />
        <Stat value={withReview}  label="Reviews"       />
        <Stat value={rewatches}   label="Rewatches"     />
        <Stat value={withFav}     label="Favourites"    />
      </div>

      {/* Limited warning */}
      {limited ? (
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(245,158,11,0.8)", fontFamily: FONT, lineHeight: 1.6 }}>
            Showing your most recent {list.length} diary entries. Letterboxd public feeds are limited to ~50–100 items. For your full history, use the CSV export (Advanced Import above).
          </p>
        </div>
      ) : null}

      {/* Unmatched note */}
      {source === "csv" && noTmdb > 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: FONT, lineHeight: 1.6 }}>
          {noTmdb} film{noTmdb > 1 ? "s" : ""} could not be matched to TMDB and will import with a temporary ID. You can edit them in your diary later.
        </p>
      ) : null}

      {/* Entries preview */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 50px 82px 90px 28px 60px", gap: 0, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          {["", "Film", "Year", "Rating", "Watched", "↺", ""].map((col, i) => (
            <span key={i} style={{ fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: FONT }}>{col}</span>
          ))}
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {shown.map((e, i) => (
            <div key={`${e.sourceRow}-${i}`}
              style={{
                display: "grid", gridTemplateColumns: "28px 1fr 50px 82px 90px 28px 60px",
                padding: "8px 12px", alignItems: "center",
                borderBottom: i === shown.length - 1 ? "none" : "0.5px solid rgba(255,255,255,0.04)",
                background: e.skipped ? "rgba(255,255,255,0.01)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                opacity: e.skipped ? 0.4 : 1,
              }}
            >
              {/* Poster thumbnail */}
              {e.posterUrl ? (
                <img src={e.posterUrl} alt="" width={20} height={30}
                  style={{ borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 20, height: 30, borderRadius: 3, background: "rgba(255,255,255,0.05)" }} />
              )}
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", paddingRight: 6 }} title={e.title}>{e.title}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: FONT }}>{e.year}</span>
              <span style={{ fontSize: 11, color: e.rating !== null ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.18)", fontFamily: FONT }}>
                {e.rating !== null ? `${e.rating.toFixed(1)}/10` : "—"}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                {new Date(e.watchedDate + "T12:00:00Z").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span style={{ fontSize: 11, color: e.rewatch ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.1)" }}>{e.rewatch ? "↺" : "·"}</span>
              <button type="button" onClick={() => toggleSkip(e.sourceRow)}
                style={{ height: 22, padding: "0 8px", borderRadius: 999, border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: FONT, cursor: "pointer" }}>
                {e.skipped ? "Undo" : "Skip"}
              </button>
            </div>
          ))}
        </div>

        {list.length > 20 ? (
          <div style={{ padding: "8px 12px", borderTop: "0.5px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: FONT }}>
            + {list.length - 20} more entries
          </div>
        ) : null}
      </div>

      {manualSkipped > 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>{manualSkipped} entr{manualSkipped > 1 ? "ies" : "y"} skipped.</p>
      ) : null}

      {/* Import amount selector */}
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: "14px 16px", display: "grid", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
          How many to import
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LIMIT_OPTIONS.map(({ value, label }) => {
            const active = limitChoice === value
            const count  = value === "all" ? activeEntries.length : Math.min(value as number, activeEntries.length)
            return (
              <button
                key={String(value)}
                type="button"
                onClick={() => {
                  console.log("[PREVIEW] selector changed →", value, "| effective count:", count)
                  setLimitChoice(value)
                }}
                style={{
                  height: 30, padding: "0 13px", borderRadius: 999,
                  border: `1px solid ${active ? "rgba(29,158,117,0.55)" : "rgba(255,255,255,0.1)"}`,
                  background: active ? "rgba(29,158,117,0.1)" : "transparent",
                  color: active ? "#6eddb8" : "rgba(255,255,255,0.42)",
                  fontSize: 12, fontFamily: FONT, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {value === "all" ? `All (${count})` : label}
              </button>
            )
          })}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: FONT }}>
          Start small if this is your first import.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={handleContinue} disabled={importCount === 0}>
          Import {importCount} entr{importCount === 1 ? "y" : "ies"} →
        </Btn>
        <Ghost onClick={onBack}>Back</Ghost>
      </div>
    </div>
  )
}

// ─── Step: Import ─────────────────────────────────────────────────────────────

const IMPORT_WATCHDOG = 15_000  // ms before we surface an error if no progress event fires

function ImportStep({ entries, onDone, onBack }: { entries: WizardEntry[]; onDone: (r: BatchImportResult) => void; onBack: () => void }) {
  const { user, accessToken }   = useAuth()
  const [progress, setProgress] = useState<BatchImportProgress | null>(null)
  const [started,  setStarted]  = useState(false)
  const [phase,    setPhase]    = useState<"idle" | "auth" | "inserting">("idle")
  const [error,    setError]    = useState<string | null>(null)
  const abortRef                = useRef<AbortController | null>(null)

  const toImport    = useMemo(() => entries.filter((e) => !e.skipped), [entries])
  const diaryMovies = useMemo(() => toImport.map(toDiary), [toImport])
  // Use completed / total so the bar reflects actual work done, not (done+1).
  // For 1 entry: starts at 0%, reaches 100% only after the insert returns.
  const pct = progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 0
  const isRunning = started && !error

  // Watchdog: if started but no progress event fires within IMPORT_WATCHDOG ms,
  // surface an actionable error instead of freezing on "Starting…" forever.
  useEffect(() => {
    if (!started || progress !== null) return
    const timer = setTimeout(() => {
      console.error("[IMPORT] watchdog fired — no progress event after", IMPORT_WATCHDOG / 1000, "s")
      setError(
        `Import did not respond after ${IMPORT_WATCHDOG / 1000}s. ` +
        "Check the browser console for the exact hang point. " +
        "The most common causes are: RLS not allowing insert, bad Supabase URL, or expired auth token."
      )
      setStarted(false)
      setPhase("idle")
      abortRef.current?.abort()
    }, IMPORT_WATCHDOG)
    return () => clearTimeout(timer)
  }, [started, progress])

  const start = useCallback(async () => {
    const userId = user?.id

    console.log(
      "[IMPORT] Start import clicked — userId:", userId ? userId.slice(0, 8) + "…" : "MISSING",
      "| contextToken:", accessToken ? "ok" : "null",
      "| entriesToImport:", diaryMovies.length,
      "| first entry:", diaryMovies[0]?.title ?? "none",
    )

    if (!userId) {
      setError("You must be signed in to import. Please refresh the page.")
      return
    }

    // Show loading state immediately so there is instant visual feedback.
    setStarted(true)
    setError(null)
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      setPhase("inserting")
      console.log("[IMPORT] starting batchImportLetterboxd — entries:", diaryMovies.length, "userId:", userId.slice(0, 8) + "…")
      const result = await batchImportLetterboxd(diaryMovies, setProgress, ctrl.signal, userId)
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.")
      setStarted(false)
      setPhase("idle")
    } finally {
      abortRef.current = null
    }
  }, [diaryMovies, onDone, user?.id, accessToken])

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))", padding: 24, display: "grid", gap: 18 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>Importing</p>
          <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", color: "rgba(255,255,255,0.88)" }}>
            {!started
              ? `Ready to import ${diaryMovies.length} entr${diaryMovies.length === 1 ? "y" : "ies"}`
              : !progress
                ? "Connecting to database…"
                : progress.batchCount === 0
                  ? (progress.currentTitle || "Connecting to database…")
                  : `${progress.completed} of ${progress.total} saved`}
          </p>
          {!started ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.38)", fontFamily: FONT, lineHeight: 1.6 }}>
              Existing entries are skipped to protect your edits.
            </p>
          ) : progress && progress.batchCount > 0 && progress.completed < progress.total && progress.currentTitle ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: FONT, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              Saving: {progress.currentTitle}
            </p>
          ) : null}
        </div>

        {started && progress && progress.batchCount > 0 ? <Bar pct={pct} /> : null}

        {isRunning ? (
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(29,158,117,0.5)", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 180}ms`, display: "inline-block" }} />
            ))}
          </div>
        ) : null}

        {error ? <Err msg={error} /> : null}

        <div style={{ display: "flex", gap: 10 }}>
          {!started ? (
            <>
              <Btn onClick={() => void start()}>Start import →</Btn>
              <Ghost onClick={onBack}>Back</Ghost>
            </>
          ) : (
            <button type="button" onClick={() => abortRef.current?.abort()}
              style={{ height: 36, padding: "0 16px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.38)", fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step: Complete ───────────────────────────────────────────────────────────

function CompleteStep({ result, userSkipped, onReset }: { result: BatchImportResult; userSkipped: number; onReset: () => void }) {
  const [showFailed, setShowFailed] = useState(false)
  const hasFailed = result.failedTitles.length > 0

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ borderRadius: 24, border: "1px solid rgba(29,158,117,0.2)", background: "linear-gradient(180deg,rgba(29,158,117,0.07),rgba(29,158,117,0.03))", padding: "28px 24px", display: "grid", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.6px", color: "rgba(255,255,255,0.92)" }}>
            {result.cancelled ? "Import stopped" : "Import complete"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "rgba(255,255,255,0.5)", fontFamily: FONT, lineHeight: 1.6 }}>
            {result.cancelled
              ? `Saved ${result.inserted} ${result.inserted === 1 ? "entry" : "entries"} before cancelling.`
              : `${result.inserted} ${result.inserted === 1 ? "entry" : "entries"} added${result.skipped > 0 ? `, ${result.skipped} already existed and were left unchanged` : ""}.`}
          </p>
        </div>

        <div className="import-complete-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          <Stat value={result.inserted} label="Imported"  accent />
          <Stat value={result.skipped}  label="Dupes"           />
          <Stat value={userSkipped}     label="Skipped"         />
          <Stat value={result.errors}   label="Errors"          />
        </div>

        {hasFailed ? (
          <div>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "rgba(239,68,68,0.65)", fontFamily: FONT, lineHeight: 1.5 }}>
              {result.errors} {result.errors === 1 ? "entry" : "entries"} failed — usually a network blip.{" "}
              <button type="button" onClick={() => setShowFailed((v) => !v)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(239,68,68,0.5)", fontSize: 12, textDecoration: "underline", fontFamily: FONT }}>
                {showFailed ? "Hide" : "Show"} failed entries
              </button>
            </p>
            {showFailed ? (
              <div style={{ maxHeight: 120, overflowY: "auto", borderRadius: 8, background: "rgba(239,68,68,0.04)", border: "0.5px solid rgba(239,68,68,0.12)", padding: "8px 12px" }}>
                {result.failedTitles.map((t, i) => (
                  <p key={i} style={{ margin: "2px 0", fontSize: 11, color: "rgba(239,68,68,0.5)", fontFamily: FONT }}>{t}</p>
                ))}
              </div>
            ) : null}
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: FONT }}>
              Re-importing will retry failed entries safely.
            </p>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/diary" style={{ display: "inline-flex", alignItems: "center", height: 42, padding: "0 20px", borderRadius: 999, background: "white", color: "black", textDecoration: "none", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
            Open Diary
          </Link>
          <button type="button" onClick={onReset} style={{ height: 42, padding: "0 20px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>
            Import another
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export default function ImportWizard() {
  const [step,         setStep]         = useState<Step>("input")
  const [source,       setSource]       = useState<ImportSource>("username")
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null)
  const [entries,      setEntries]      = useState<WizardEntry[] | null>(null)
  const [displayName,  setDisplayName]  = useState("")
  const [limited,      setLimited]      = useState(false)
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null)
  const [inputError,   setInputError]   = useState<string | null>(null)
  const abortRef                        = useRef<AbortController | null>(null)
  // Stores entries as they were fetched (no limit-applied skips). Used to restore
  // PreviewStep to a clean state when the user goes back from ImportStep.
  const fetchedEntriesRef               = useRef<WizardEntry[] | null>(null)

  const skippedCount = entries ? entries.filter((e) => e.skipped).length : 0

  // ── Username flow ──────────────────────────────────────────────────────────

  async function handleUsername(username: string) {
    setInputError(null)
    setSource("username")
    setStep("loading")
    setLoadProgress({ phase: "fetch" })

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch(`/api/letterboxd/fetch?username=${encodeURIComponent(username)}`, {
        signal: ctrl.signal,
      })
      const body = (await res.json()) as {
        entries?: RssWizardEntry[]
        displayName?: string
        limited?: boolean
        error?: string
      }

      if (!res.ok || body.error) {
        setStep("input")
        setInputError(body.error ?? "Could not fetch your Letterboxd diary.")
        return
      }

      const loaded = (body.entries ?? []).map((e) => ({ ...e, skipped: false }))
      fetchedEntriesRef.current = loaded
      setEntries(loaded)
      setDisplayName(body.displayName ?? username)
      setLimited(body.limited ?? false)
      setStep("preview")
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setStep("input")
      setInputError("Request failed. Check your connection and try again.")
    } finally {
      abortRef.current = null
      setLoadProgress(null)
    }
  }

  // ── CSV flow ───────────────────────────────────────────────────────────────
  // Parsing is synchronous and uses only the local catalogue — no TMDB calls,
  // no loading step. Goes directly from input → preview.

  function handleCsvFile(file: File) {
    setInputError(null)
    file.text().then((text) => {
      let entries: WizardEntry[]
      try {
        const result = parseLetterboxdCsvV2(text)
        entries = result.entries.map(csvEntryToWizard)
      } catch (err) {
        setInputError(err instanceof Error ? err.message : "Could not parse CSV.")
        return
      }

      setSource("csv")
      setDisplayName(file.name)
      setLimited(false)
      fetchedEntriesRef.current = entries
      setEntries(entries)
      setStep("preview")
    }).catch(() => {
      setInputError("Could not read that file.")
    })
  }

  // ── After import — trigger badge refresh silently ─────────────────────────

  async function handleImportDone(result: BatchImportResult) {
    setImportResult(result)
    setStep("complete")
    // Fire badge refresh in background; don't await — non-critical
    fetch("/api/badges/refresh", { method: "POST" }).catch(() => undefined)
  }

  function handleReset() {
    abortRef.current?.abort()
    setStep("input")
    setEntries(null)
    setDisplayName("")
    setLimited(false)
    setImportResult(null)
    setInputError(null)
    setLoadProgress(null)
  }

  return (
    <main style={{ maxWidth: 840, margin: "0 auto", padding: "0 20px 100px", color: "white" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.9)} 50%{opacity:1;transform:scale(1.1)} }
        @media(max-width:580px){ .import-stats{grid-template-columns:repeat(3,1fr)!important} }
        @media(max-width:480px){ .import-complete-stats{grid-template-columns:repeat(2,1fr)!important} }
      `}</style>

      {/* Header */}
      <div style={{ paddingTop: 8, marginBottom: 28 }}>
        <Link href="/settings/profile" style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", textDecoration: "none", fontFamily: FONT, display: "block", marginBottom: 12 }}>
          ← Settings
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(24px,5vw,38px)", fontWeight: 700, letterSpacing: "-0.9px", lineHeight: 1.05, color: "rgba(255,255,255,0.95)" }}>
          Import your Letterboxd world into ReelShelf.
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.38)", fontFamily: FONT, lineHeight: 1.6, maxWidth: 520 }}>
          Upload your Letterboxd CSV export to bring your full diary history into ReelShelf.
        </p>
      </div>

      <Steps current={step} />

      {step === "input" ? (
        <InputStep onUsername={(u) => void handleUsername(u)} onCsvFile={handleCsvFile} error={inputError} />
      ) : null}

      {step === "loading" ? (
        <LoadingStep source={source} progress={loadProgress} />
      ) : null}

      {step === "preview" && entries ? (
        <PreviewStep
          entries={entries}
          source={source}
          displayName={displayName}
          limited={limited}
          onContinue={(final) => { setEntries(final); setStep("importing") }}
          onBack={handleReset}
        />
      ) : null}

      {step === "importing" && entries ? (
        <ImportStep
          entries={entries}
          onDone={(r) => void handleImportDone(r)}
          onBack={() => {
            // Restore the original fetched entries (no limit-applied skips) so the
            // PreviewStep doesn't open with 49 entries dimmed from a previous run.
            if (fetchedEntriesRef.current) setEntries(fetchedEntriesRef.current)
            setStep("preview")
          }}
        />
      ) : null}

      {step === "complete" && importResult ? (
        <CompleteStep result={importResult} userSkipped={skippedCount} onReset={handleReset} />
      ) : null}
    </main>
  )
}
