"use client"

import { useRef, useState, useCallback } from "react"
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

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT    = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const TMDB_W  = "https://image.tmdb.org/t/p/w185"
const CONCURRENCY = 6

// ─── Types ────────────────────────────────────────────────────────────────────

type Step         = "input" | "loading" | "preview" | "importing" | "complete"
type ImportSource = "username" | "csv"

type WizardEntry = RssWizardEntry & { skipped: boolean }

type LoadProgress =
  | { phase: "fetch" }
  | { phase: "match"; done: number; total: number }

type TmdbCandidate = { id: number; title: string; year: number; posterPath: string | null }

// ─── TMDB search (used for CSV matching only) ─────────────────────────────────

async function tmdbSearch(title: string, year: number): Promise<TmdbCandidate | null> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(title)}&type=film&limit=5`)
    if (!res.ok) return null
    const body = (await res.json()) as {
      films?: Array<{ id: number; title: string; year: string | null; poster_path: string | null }>
    }
    const results = body.films ?? []
    if (!results.length) return null
    const exact = results.find((r) => r.year !== null && Math.abs(Number(r.year) - year) <= 1)
    const pick  = exact ?? results[0]
    if (!pick) return null
    return { id: pick.id, title: pick.title, year: Number(pick.year ?? year), posterPath: pick.poster_path ?? null }
  } catch {
    return null
  }
}

async function matchCsvEntries(
  entries: ParsedLetterboxdEntry[],
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal
): Promise<WizardEntry[]> {
  const results: WizardEntry[] = new Array(entries.length)
  let done = 0

  async function one(i: number) {
    if (signal.aborted) return
    const e = entries[i]!
    const tmdb = await tmdbSearch(e.title, e.year)
    const mediaId   = tmdb ? `tmdb-${tmdb.id}` : e.diaryEntry.id
    const posterUrl = tmdb?.posterPath ? `${TMDB_W}${tmdb.posterPath}` : null
    results[i] = {
      sourceRow:        e.sourceRow,
      title:            tmdb?.title ?? e.title,
      year:             tmdb?.year  ?? e.year,
      rating:           e.rating,
      letterboxdRating: e.letterboxdRating,
      watchedDate:      e.watchedDate,
      review:           e.review,
      rewatch:          e.rewatch,
      containsSpoilers: e.containsSpoilers,
      favourite:        false,
      mediaType:        "movie",
      mediaId,
      posterUrl,
      skipped:          false,
    }
    onProgress(++done, entries.length)
  }

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    if (signal.aborted) break
    await Promise.all(entries.slice(i, i + CONCURRENCY).map((_, j) => one(i + j)))
    await new Promise<void>((r) => setTimeout(r, 0))
  }

  return results
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
  const [value, setValue]       = useState("")
  const [csvOpen, setCsvOpen]   = useState(false)
  const [dragActive, setDrag]   = useState(false)
  const fileRef                 = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = value.trim().replace(/^@/, "")
    if (trimmed.length >= 1) onUsername(trimmed)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) onCsvFile(f)
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* ── Primary: Import with Letterboxd username ── */}
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.09)", background: "linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))", padding: "22px 24px", display: "grid", gap: 18 }}>

        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase", color: "rgba(29,158,117,0.7)", fontFamily: FONT, fontWeight: 600 }}>
            Import with Letterboxd username
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "rgba(255,255,255,0.45)", fontFamily: FONT, lineHeight: 1.6 }}>
            Enter your Letterboxd username and ReelShelf will fetch your diary entries, ratings, and reviews automatically.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "rgba(255,255,255,0.22)", fontFamily: FONT, pointerEvents: "none",
              whiteSpace: "nowrap",
            }}>letterboxd.com/</span>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit() }}
              placeholder="your-username"
              autoComplete="off"
              style={{
                width: "100%", height: 48, borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.13)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.88)", fontSize: 14, fontFamily: FONT,
                paddingLeft: 126, paddingRight: 14,
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(29,158,117,0.5)" }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)" }}
            />
          </div>
          <Btn onClick={submit} disabled={value.trim().length < 1} style={{ height: 48 }}>
            Find Profile
          </Btn>
        </div>

        {error ? <Err msg={error} /> : null}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "11px 13px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.05)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: FONT, lineHeight: 1.6 }}>
            Imports your most recent ~50–100 diary entries from your public Letterboxd profile. For your complete history, use the CSV export below.
          </p>
        </div>
      </div>

      {/* ── Advanced: Upload CSV export ── */}
      <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)", overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setCsvOpen((o) => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "13px 18px", background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.38)", fontFamily: FONT, textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ fontSize: 13 }}>Advanced CSV Import</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: FONT }}>— for complete history</span>
          </div>
          <span style={{ fontSize: 10, display: "inline-block", transform: csvOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
        </button>

        {csvOpen ? (
          <div style={{ padding: "0 18px 18px", display: "grid", gap: 12, borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: FONT, lineHeight: 1.6 }}>
              Download your export from <strong style={{ color: "rgba(255,255,255,0.5)" }}>letterboxd.com → Settings → Import &amp; Export → Export your data</strong>, then upload <strong style={{ color: "rgba(255,255,255,0.5)" }}>diary.csv</strong> (full history with dates) or <strong style={{ color: "rgba(255,255,255,0.5)" }}>ratings.csv</strong>.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
                minHeight: 110, borderRadius: 12,
                border: dragActive ? "1.5px dashed rgba(29,158,117,0.55)" : "1.5px dashed rgba(255,255,255,0.1)",
                background: dragActive ? "rgba(29,158,117,0.04)" : "rgba(255,255,255,0.015)",
                cursor: "pointer", transition: "all 0.15s", padding: 20, textAlign: "center",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.42)", fontFamily: FONT }}>Drop .csv file here or click to browse</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsvFile(f); e.target.value = "" }} />
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
  const [list, setList] = useState(entries)
  const shown    = list.slice(0, 20)
  const toImport = list.filter((e) => !e.skipped).length
  const skipped  = list.filter((e) => e.skipped).length

  const withRating  = list.filter((e) => e.rating !== null).length
  const withReview  = list.filter((e) => e.review.trim().length > 0).length
  const withFav     = list.filter((e) => e.favourite).length
  const rewatches   = list.filter((e) => e.rewatch).length
  const noTmdb      = list.filter((e) => !e.mediaId.startsWith("tmdb-")).length

  function toggleSkip(sourceRow: number) {
    setList((prev) => prev.map((e) => e.sourceRow === sourceRow ? { ...e, skipped: !e.skipped } : e))
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

      {skipped > 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>{skipped} entr{skipped > 1 ? "ies" : "y"} skipped.</p>
      ) : null}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => onContinue(list)} disabled={toImport === 0}>
          Import {toImport} entr{toImport === 1 ? "y" : "ies"} →
        </Btn>
        <Ghost onClick={onBack}>Back</Ghost>
      </div>
    </div>
  )
}

// ─── Step: Import ─────────────────────────────────────────────────────────────

function ImportStep({ entries, onDone, onBack }: { entries: WizardEntry[]; onDone: (r: BatchImportResult) => void; onBack: () => void }) {
  const [progress, setProgress] = useState<BatchImportProgress | null>(null)
  const [started,  setStarted]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const abortRef                = useRef<AbortController | null>(null)

  const toImport   = entries.filter((e) => !e.skipped)
  const diaryMovies = toImport.map(toDiary)
  const pct = progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 0

  const start = useCallback(async () => {
    setStarted(true); setError(null)
    const ctrl = new AbortController(); abortRef.current = ctrl
    setProgress({ completed: 0, total: diaryMovies.length, batchIndex: 0, batchCount: 0 })
    try {
      const result = await batchImportLetterboxd(diaryMovies, setProgress, ctrl.signal)
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed."); setStarted(false)
    } finally { abortRef.current = null }
  }, [diaryMovies, onDone])

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))", padding: 24, display: "grid", gap: 18 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>Importing</p>
          <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", color: "rgba(255,255,255,0.88)" }}>
            {started ? `${progress?.completed ?? 0} of ${diaryMovies.length} saved` : `Ready to import ${diaryMovies.length} entr${diaryMovies.length === 1 ? "y" : "ies"}`}
          </p>
          {!started ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.38)", fontFamily: FONT, lineHeight: 1.6 }}>
              Saved in batches of 25. Duplicates are automatically updated, not doubled.
            </p>
          ) : progress && progress.batchCount > 0 ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
              Batch {progress.batchIndex} of {progress.batchCount}
            </p>
          ) : null}
        </div>

        {started && progress ? <Bar pct={pct} /> : null}

        {started && (progress?.completed ?? 0) < (progress?.total ?? 1) ? (
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(29,158,117,0.5)", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 180}ms`, display: "inline-block" }} />)}
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

function CompleteStep({ result, skipped, onReset }: { result: BatchImportResult; skipped: number; onReset: () => void }) {
  return (
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
            ? `Saved ${result.total} entries before cancelling.`
            : `${result.total} ${result.total === 1 ? "entry" : "entries"} added to your ReelShelf diary.`}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        <Stat value={result.inserted} label="New"      accent />
        <Stat value={result.updated}  label="Updated"        />
        <Stat value={skipped}         label="Skipped"        />
        <Stat value={result.errors}   label="Errors"         />
      </div>

      {result.errors > 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "rgba(239,68,68,0.6)", fontFamily: FONT, lineHeight: 1.5 }}>
          {result.errors} entries failed — usually a network blip. Re-importing the same file will upsert them safely.
        </p>
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

      setEntries((body.entries ?? []).map((e) => ({ ...e, skipped: false })))
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

  function handleCsvFile(file: File) {
    setInputError(null)
    file.text().then(async (text) => {
      let parsed: ParsedLetterboxdEntry[]
      try {
        const result = parseLetterboxdCsvV2(text)
        parsed = result.entries
      } catch (err) {
        setInputError(err instanceof Error ? err.message : "Could not parse CSV.")
        return
      }

      setSource("csv")
      setStep("loading")
      setDisplayName(file.name)
      setLimited(false)

      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoadProgress({ phase: "match", done: 0, total: parsed.length })

      try {
        const matched = await matchCsvEntries(
          parsed,
          (done, total) => setLoadProgress({ phase: "match", done, total }),
          ctrl.signal
        )
        if (!ctrl.signal.aborted) {
          setEntries(matched)
          setStep("preview")
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setStep("input")
          setInputError("Matching failed. Try again.")
        }
      } finally {
        abortRef.current = null
        setLoadProgress(null)
      }
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
          Import using your Letterboxd username or upload your export manually.
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
          onBack={() => setStep("preview")}
        />
      ) : null}

      {step === "complete" && importResult ? (
        <CompleteStep result={importResult} skipped={skippedCount} onReset={handleReset} />
      ) : null}
    </main>
  )
}
