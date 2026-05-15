"use client"

import { useRef, useState, useCallback } from "react"
import Link from "next/link"
import {
  parseLetterboxdCsvV2,
  type LetterboxdParseResult,
  type ParsedLetterboxdEntry,
  type LetterboxdFileType,
} from "@/lib/letterboxdImport"
import {
  batchImportLetterboxd,
  type BatchImportResult,
  type BatchImportProgress,
} from "@/lib/supabase/letterboxdBatchImport"
import type { DiaryMovie } from "@/lib/diary"

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const MATCH_CONCURRENCY = 6
const POSTER_BASE = "https://image.tmdb.org/t/p/w185"

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "upload" | "preview" | "match" | "review" | "import" | "complete"

type MatchStatus = "exact" | "fuzzy" | "unmatched"

type TmdbCandidate = {
  id: number
  title: string
  year: number
  posterPath: string | null
}

type MatchedEntry = ParsedLetterboxdEntry & {
  matchStatus: MatchStatus
  tmdb: TmdbCandidate | null
  /** user chose to skip this entry during review */
  skipped: boolean
}

type MatchProgress = {
  done: number
  total: number
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(180deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.015) 100%)",
    padding: 24,
    ...extra,
  }
}

// ─── Small atoms ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 10,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.32)",
        fontFamily: FONT,
      }}
    >
      {children}
    </p>
  )
}

function StatChip({
  value,
  label,
  accent,
}: {
  value: number | string
  label: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${accent ? "rgba(29,158,117,0.25)" : "rgba(255,255,255,0.07)"}`,
        background: accent ? "rgba(29,158,117,0.08)" : "rgba(255,255,255,0.025)",
        padding: "12px 14px 10px",
      }}
    >
      <Label>{label}</Label>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.5px",
          color: accent ? "#6eddb8" : "rgba(255,255,255,0.88)",
        }}
      >
        {value}
      </p>
    </div>
  )
}

function ProgressBar({ pct, color = "#1D9E75" }: { pct: number; color?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: 5,
        borderRadius: 3,
        background: "rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: `linear-gradient(90deg,${color},${color}bb)`,
          borderRadius: 3,
          transition: "width 0.2s ease",
        }}
      />
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(239,68,68,0.2)",
        background: "rgba(239,68,68,0.06)",
        padding: "12px 16px",
        fontSize: 13,
        color: "#fca5a5",
        fontFamily: FONT,
        lineHeight: 1.6,
      }}
    >
      {message}
    </div>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  children,
  style,
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 48,
        padding: "0 28px",
        borderRadius: 999,
        border: "none",
        background: disabled ? "rgba(29,158,117,0.35)" : "#1D9E75",
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: "-0.1px",
        transition: "opacity 0.15s",
        fontFamily: FONT,
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.88" }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
    >
      {children}
    </button>
  )
}

function GhostButton({
  onClick,
  children,
}: {
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 40,
        padding: "0 18px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "transparent",
        color: "rgba(255,255,255,0.55)",
        fontSize: 13,
        fontFamily: FONT,
        cursor: "pointer",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </button>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "upload",   label: "Upload"   },
  { key: "preview",  label: "Preview"  },
  { key: "match",    label: "Match"    },
  { key: "review",   label: "Review"   },
  { key: "import",   label: "Import"   },
  { key: "complete", label: "Complete" },
]

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 32,
        overflowX: "auto",
        paddingBottom: 2,
      }}
    >
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div
            key={step.key}
            style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  border: `1.5px solid ${
                    done
                      ? "rgba(29,158,117,0.6)"
                      : active
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(255,255,255,0.12)"
                  }`,
                  background: done
                    ? "rgba(29,158,117,0.15)"
                    : active
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  color: done
                    ? "#6eddb8"
                    : active
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(255,255,255,0.22)",
                  transition: "all 0.2s ease",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: active
                    ? "rgba(255,255,255,0.7)"
                    : done
                      ? "rgba(29,158,117,0.7)"
                      : "rgba(255,255,255,0.2)",
                  fontFamily: FONT,
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>

            {i < STEPS.length - 1 ? (
              <div
                style={{
                  width: 28,
                  height: 1,
                  background: i < currentIndex
                    ? "rgba(29,158,117,0.4)"
                    : "rgba(255,255,255,0.08)",
                  margin: "0 4px",
                  marginBottom: 16,
                  transition: "background 0.3s ease",
                  flexShrink: 0,
                }}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function fileTypeLabel(t: LetterboxdFileType) {
  if (t === "diary")   return "diary.csv"
  if (t === "watched") return "watched.csv"
  if (t === "ratings") return "ratings.csv"
  if (t === "reviews") return "reviews.csv"
  return "CSV"
}

function UploadStep({
  onFile,
  error,
}: {
  onFile: (file: File) => void
  error: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          minHeight: 220,
          borderRadius: 20,
          border: drag
            ? "1.5px dashed rgba(29,158,117,0.6)"
            : "1.5px dashed rgba(255,255,255,0.14)",
          background: drag ? "rgba(29,158,117,0.05)" : "rgba(255,255,255,0.02)",
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
          padding: 32,
          textAlign: "center",
        }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>

        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.82)", letterSpacing: "-0.2px" }}>
            Drop your Letterboxd CSV here
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.36)", fontFamily: FONT }}>
            or click to browse — accepts watched.csv, diary.csv, ratings.csv, reviews.csv
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ""
          }}
        />
      </div>

      {error ? <ErrorBox message={error} /> : null}

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.018)",
          padding: "16px 20px",
          display: "grid",
          gap: 10,
        }}
      >
        <Label>How to export from Letterboxd</Label>
        <ol
          style={{
            margin: 0,
            paddingLeft: 18,
            display: "grid",
            gap: 6,
            color: "rgba(255,255,255,0.44)",
            fontSize: 13,
            fontFamily: FONT,
            lineHeight: 1.6,
          }}
        >
          <li>Go to <span style={{ color: "rgba(255,255,255,0.7)" }}>letterboxd.com → your profile → Settings</span></li>
          <li>Click <span style={{ color: "rgba(255,255,255,0.7)" }}>Import &amp; Export → Export your data</span></li>
          <li>Download the ZIP and unzip it</li>
          <li>Upload <span style={{ color: "rgba(255,255,255,0.7)" }}>diary.csv</span> for full history with dates, or <span style={{ color: "rgba(255,255,255,0.7)" }}>ratings.csv</span> for just your ratings</li>
        </ol>
      </div>
    </div>
  )
}

// ─── Step 2: Preview ──────────────────────────────────────────────────────────

function PreviewStep({
  result,
  fileName,
  onBack,
  onContinue,
}: {
  result: LetterboxdParseResult
  fileName: string
  onBack: () => void
  onContinue: () => void
}) {
  const preview = result.entries.slice(0, 20)

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* File info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(255,255,255,0.36)", fontSize: 12, fontFamily: FONT }}
        >
          ← Change file
        </button>
        <span style={{
          display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px",
          borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: "0.04em",
          textTransform: "uppercase", fontFamily: FONT,
        }}>
          {fileTypeLabel(result.fileType)}
        </span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>{fileName}</span>
      </div>

      {/* Stats */}
      <div
        className="preview-stats"
        style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}
      >
        <StatChip value={result.stats.total}       label="Entries"     accent />
        <StatChip value={result.stats.withRating}  label="With rating"        />
        <StatChip value={result.stats.withReview}  label="With review"        />
        <StatChip value={result.stats.rewatches}   label="Rewatches"          />
        <StatChip value={result.stats.localMatches}label="Pre-matched"        />
      </div>

      {/* Preview table */}
      <div style={card()}>
        <div style={{ marginBottom: 14 }}>
          <Label>First 20 entries</Label>
          <p style={{ margin: "5px 0 0", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.82)", letterSpacing: "-0.2px" }}>
            {result.entries.length} entries detected
            {result.stats.withReview > 0 ? ` · ${result.stats.withReview} with reviews` : ""}
            {result.stats.withRating > 0 ? ` · ${result.stats.withRating} with ratings` : ""}
          </p>
        </div>

        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 50px 80px 95px 28px 28px",
          padding: "8px 12px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "8px 8px 0 0",
          borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        }}>
          {["Film", "Year", "Rating", "Watched", "↺", "⚠"].map((col) => (
            <span key={col} style={{ fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
              {col}
            </span>
          ))}
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {preview.map((e, i) => (
            <div
              key={`${e.sourceRow}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 50px 80px 95px 28px 28px",
                padding: "8px 12px",
                borderBottom: i === preview.length - 1 ? "none" : "0.5px solid rgba(255,255,255,0.04)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", paddingRight: 8 }} title={e.title}>{e.title}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.36)", fontFamily: FONT }}>{e.year}</span>
              <span style={{ fontSize: 11, color: e.rating !== null ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.18)", fontFamily: FONT }}>
                {e.rating !== null ? `${e.rating.toFixed(1)}/10` : "—"}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: FONT }}>
                {new Date(e.watchedDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span style={{ fontSize: 11, color: e.rewatch ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.1)" }}>{e.rewatch ? "↺" : "·"}</span>
              <span style={{ fontSize: 11, color: e.containsSpoilers ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)" }}>{e.containsSpoilers ? "⚠" : "·"}</span>
            </div>
          ))}
        </div>

        {result.entries.length > 20 ? (
          <div style={{ padding: "8px 12px", borderTop: "0.5px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: FONT }}>
            + {result.entries.length - 20} more entries
          </div>
        ) : null}
      </div>

      <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: FONT, lineHeight: 1.6 }}>
        Next: each film will be matched to TMDB to get accurate metadata, posters, and IDs. This takes a moment for large libraries.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <PrimaryButton onClick={onContinue}>
          Match {result.entries.length} films →
        </PrimaryButton>
        <GhostButton onClick={onBack}>Change file</GhostButton>
      </div>
    </div>
  )
}

// ─── Step 3: Match ────────────────────────────────────────────────────────────

async function tmdbSearchMovie(
  title: string,
  year: number
): Promise<TmdbCandidate | null> {
  try {
    const url = `/api/search?q=${encodeURIComponent(title)}&type=film&limit=5`
    const res = await fetch(url)
    if (!res.ok) return null
    const body = (await res.json()) as {
      films?: Array<{ id: number; title: string; year: string | null; poster_path: string | null }>
    }
    const results = body.films ?? []
    if (results.length === 0) return null

    // Exact year match first
    const exact = results.find((r) => r.year !== null && Math.abs(Number(r.year) - year) <= 1)
    const candidate = exact ?? results[0]
    if (!candidate) return null

    return {
      id: candidate.id,
      title: candidate.title,
      year: Number(candidate.year ?? year),
      posterPath: candidate.poster_path ?? null,
    }
  } catch {
    return null
  }
}

function classifyMatch(csvYear: number, tmdb: TmdbCandidate | null): MatchStatus {
  if (!tmdb) return "unmatched"
  return Math.abs(tmdb.year - csvYear) <= 1 ? "exact" : "fuzzy"
}

async function runMatching(
  entries: ParsedLetterboxdEntry[],
  onProgress: (p: MatchProgress) => void,
  signal: AbortSignal
): Promise<MatchedEntry[]> {
  const results: MatchedEntry[] = new Array(entries.length)
  let done = 0

  async function processOne(index: number) {
    if (signal.aborted) return
    const e = entries[index]!
    const tmdb = await tmdbSearchMovie(e.title, e.year)
    const matchStatus = classifyMatch(e.year, tmdb)
    results[index] = { ...e, tmdb, matchStatus, skipped: false }
    done++
    onProgress({ done, total: entries.length })
  }

  // Process in concurrent batches
  for (let i = 0; i < entries.length; i += MATCH_CONCURRENCY) {
    if (signal.aborted) break
    const batch = entries.slice(i, i + MATCH_CONCURRENCY).map((_, j) => processOne(i + j))
    await Promise.all(batch)
    // Yield to UI
    await new Promise<void>((r) => setTimeout(r, 0))
  }

  return results
}

function MatchStep({
  entries,
  onDone,
  onBack,
}: {
  entries: ParsedLetterboxdEntry[]
  onDone: (matched: MatchedEntry[]) => void
  onBack: () => void
}) {
  const [progress, setProgress] = useState<MatchProgress | null>(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback(async () => {
    setStarted(true)
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    setProgress({ done: 0, total: entries.length })

    try {
      const matched = await runMatching(entries, setProgress, controller.signal)
      if (!controller.signal.aborted) {
        onDone(matched)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Matching failed.")
    } finally {
      abortRef.current = null
    }
  }, [entries, onDone])

  const pct = progress ? (progress.done / progress.total) * 100 : 0

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card({ display: "grid", gap: 20 })}>
        <div>
          <Label>TMDB Matching</Label>
          <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", color: "rgba(255,255,255,0.88)" }}>
            {!started
              ? `Match ${entries.length} films to TMDB`
              : progress?.done === progress?.total
                ? "Matching complete"
                : `Matched ${progress?.done ?? 0} of ${progress?.total ?? entries.length}`}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: FONT, lineHeight: 1.6 }}>
            {!started
              ? "Each film is looked up by title and year to get accurate TMDB metadata, posters, and canonical IDs. Large libraries may take a minute."
              : "Looking up each film on TMDB…"}
          </p>
        </div>

        {started && progress ? (
          <>
            <ProgressBar pct={pct} />
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
              {progress.done} / {progress.total} films processed
            </p>
          </>
        ) : null}

        {error ? <ErrorBox message={error} /> : null}

        {!started ? (
          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryButton onClick={() => void start()}>Start matching</PrimaryButton>
            <GhostButton onClick={onBack}>Back</GhostButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { abortRef.current?.abort(); onBack() }}
            style={{
              alignSelf: "start", height: 36, padding: "0 16px", borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
              color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: FONT, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Info chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { color: "#6eddb8", label: "Exact match", desc: "Title + year matches TMDB" },
          { color: "rgba(245,158,11,0.85)", label: "Fuzzy match", desc: "Title matches, year differs" },
          { color: "rgba(255,255,255,0.3)", label: "Unmatched", desc: "No TMDB result found" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: FONT }}>{item.label}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: FONT }}>— {item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function matchColor(status: MatchStatus) {
  if (status === "exact")     return "#6eddb8"
  if (status === "fuzzy")     return "rgba(245,158,11,0.85)"
  return "rgba(255,255,255,0.28)"
}

function matchLabel(status: MatchStatus) {
  if (status === "exact")     return "Exact"
  if (status === "fuzzy")     return "Fuzzy"
  return "Unmatched"
}

function ReviewStep({
  matched,
  onContinue,
  onBack,
}: {
  matched: MatchedEntry[]
  onContinue: (final: MatchedEntry[]) => void
  onBack: () => void
}) {
  const [entries, setEntries] = useState(matched)

  const exact     = entries.filter((e) => e.matchStatus === "exact"    && !e.skipped).length
  const fuzzy     = entries.filter((e) => e.matchStatus === "fuzzy"    && !e.skipped).length
  const unmatched = entries.filter((e) => e.matchStatus === "unmatched" && !e.skipped).length
  const skipped   = entries.filter((e) => e.skipped).length
  const toImport  = entries.filter((e) => !e.skipped).length

  const needsReview = entries.filter((e) => (e.matchStatus === "fuzzy" || e.matchStatus === "unmatched") && !e.skipped)

  function toggleSkip(sourceRow: number) {
    setEntries((prev) =>
      prev.map((e) => e.sourceRow === sourceRow ? { ...e, skipped: !e.skipped } : e)
    )
  }

  function skipAll(status: MatchStatus) {
    setEntries((prev) =>
      prev.map((e) => e.matchStatus === status ? { ...e, skipped: true } : e)
    )
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        <StatChip value={exact}     label="Exact"    accent />
        <StatChip value={fuzzy}     label="Fuzzy"          />
        <StatChip value={unmatched} label="Unmatched"      />
        <StatChip value={skipped}   label="Skipped"        />
      </div>

      {/* Needs review section */}
      {needsReview.length > 0 ? (
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
            <div>
              <Label>Needs review</Label>
              <p style={{ margin: "5px 0 0", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.82)", letterSpacing: "-0.2px" }}>
                {needsReview.length} films with fuzzy or no match
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {entries.some((e) => e.matchStatus === "fuzzy" && !e.skipped) ? (
                <button type="button" onClick={() => skipAll("fuzzy")} style={{ height: 30, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)", color: "rgba(245,158,11,0.7)", fontSize: 11, fontFamily: FONT, cursor: "pointer" }}>
                  Skip all fuzzy
                </button>
              ) : null}
              {entries.some((e) => e.matchStatus === "unmatched" && !e.skipped) ? (
                <button type="button" onClick={() => skipAll("unmatched")} style={{ height: 30, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: FONT, cursor: "pointer" }}>
                  Skip all unmatched
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto", display: "grid", gap: 1 }}>
            {needsReview.map((e) => (
              <div
                key={e.sourceRow}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: "0.5px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Poster thumb */}
                {e.tmdb?.posterPath ? (
                  <img
                    src={`${POSTER_BASE}${e.tmdb.posterPath}`}
                    alt=""
                    width={28}
                    height={42}
                    style={{ borderRadius: 4, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 28, height: 42, borderRadius: 4, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {e.title}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                    CSV: {e.year}
                    {e.tmdb ? ` · TMDB: "${e.tmdb.title}" (${e.tmdb.year})` : " · No TMDB result"}
                  </p>
                </div>

                <span style={{ fontSize: 10, color: matchColor(e.matchStatus), fontFamily: FONT, letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}>
                  {matchLabel(e.matchStatus)}
                </span>

                <button
                  type="button"
                  onClick={() => toggleSkip(e.sourceRow)}
                  style={{
                    height: 28, padding: "0 10px", borderRadius: 999, flexShrink: 0,
                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: FONT, cursor: "pointer",
                  }}
                >
                  Keep
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ ...card(), display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: FONT }}>
            All {exact} films matched exactly — nothing to review.
          </p>
        </div>
      )}

      <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: FONT, lineHeight: 1.6 }}>
        {toImport} films will be imported · {skipped} skipped. Unmatched films import with a slug-based ID and can be edited in your diary later.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <PrimaryButton onClick={() => onContinue(entries)} disabled={toImport === 0}>
          Import {toImport} films →
        </PrimaryButton>
        <GhostButton onClick={onBack}>Back</GhostButton>
      </div>
    </div>
  )
}

// ─── Step 5: Import ───────────────────────────────────────────────────────────

function matchedToDiaryMovie(e: MatchedEntry): DiaryMovie {
  const mediaId = e.tmdb
    ? `tmdb-${e.tmdb.id}`
    : e.diaryEntry.id

  const poster = e.tmdb?.posterPath
    ? `${POSTER_BASE}${e.tmdb.posterPath}`
    : e.diaryEntry.poster

  return {
    ...e.diaryEntry,
    id: mediaId,
    title: e.tmdb?.title ?? e.diaryEntry.title,
    year: e.tmdb?.year ?? e.diaryEntry.year,
    poster,
    rating: e.rating,
    review: e.review,
    watchedDate: e.watchedDate,
    favourite: false,
    rewatch: e.rewatch,
    containsSpoilers: e.containsSpoilers,
    watchedInCinema: false,
    savedAt: `${e.watchedDate}T12:00:00.000Z`,
  }
}

function ImportStep({
  matched,
  onDone,
  onBack,
}: {
  matched: MatchedEntry[]
  onDone: (result: BatchImportResult) => void
  onBack: () => void
}) {
  const [progress, setProgress] = useState<BatchImportProgress | null>(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const toImport = matched.filter((e) => !e.skipped)
  const diaryMovies = toImport.map(matchedToDiaryMovie)

  const start = useCallback(async () => {
    setStarted(true)
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller
    setProgress({ completed: 0, total: diaryMovies.length, batchIndex: 0, batchCount: 0 })

    try {
      const result = await batchImportLetterboxd(
        diaryMovies,
        setProgress,
        controller.signal
      )
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Please try again.")
      setStarted(false)
    } finally {
      abortRef.current = null
    }
  }, [diaryMovies, onDone])

  const pct = progress && progress.total > 0
    ? (progress.completed / progress.total) * 100
    : 0

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card({ display: "grid", gap: 20 })}>
        <div>
          <Label>Importing</Label>
          <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 600, letterSpacing: "-0.4px", color: "rgba(255,255,255,0.88)" }}>
            {started
              ? `${progress?.completed ?? 0} of ${progress?.total ?? diaryMovies.length} saved`
              : `Ready to import ${diaryMovies.length} films`}
          </p>
          {started ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
              {progress && progress.batchCount > 0
                ? `Batch ${progress.batchIndex} of ${progress.batchCount}`
                : "Starting…"}
            </p>
          ) : (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: FONT, lineHeight: 1.6 }}>
              Films will be saved in batches of 25. Duplicates are automatically detected and updated rather than duplicated.
            </p>
          )}
        </div>

        {started && progress ? <ProgressBar pct={pct} /> : null}

        {error ? <ErrorBox message={error} /> : null}

        {/* Animated pulse while running */}
        {started && (progress?.completed ?? 0) < (progress?.total ?? 1) ? (
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "rgba(29,158,117,0.5)",
                  animation: "pulse 1.4s ease-in-out infinite",
                  animationDelay: `${i * 180}ms`,
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10 }}>
          {!started ? (
            <>
              <PrimaryButton onClick={() => void start()}>
                Start import →
              </PrimaryButton>
              <GhostButton onClick={onBack}>Back</GhostButton>
            </>
          ) : (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              style={{
                height: 36, padding: "0 16px", borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: FONT, cursor: "pointer",
              }}
            >
              Cancel import
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 6: Complete ─────────────────────────────────────────────────────────

function CompleteStep({
  result,
  skippedCount,
  onReset,
}: {
  result: BatchImportResult
  skippedCount: number
  onReset: () => void
}) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          borderRadius: 24,
          border: "1px solid rgba(29,158,117,0.2)",
          background: "linear-gradient(180deg,rgba(29,158,117,0.07) 0%,rgba(29,158,117,0.03) 100%)",
          padding: "28px 26px",
          display: "grid",
          gap: 16,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.6px", color: "rgba(255,255,255,0.92)" }}>
            {result.cancelled ? "Import stopped" : "Import complete"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "rgba(255,255,255,0.5)", fontFamily: FONT, lineHeight: 1.6 }}>
            {result.cancelled
              ? `Saved ${result.total} entries before you cancelled.`
              : `${result.total} ${result.total === 1 ? "entry" : "entries"} saved to your ReelShelf diary.`}
          </p>
        </div>

        {/* Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          <StatChip value={result.inserted} label="New entries" accent />
          <StatChip value={result.updated}  label="Updated"          />
          <StatChip value={skippedCount}    label="Skipped"          />
          <StatChip value={result.errors}   label="Errors"           />
        </div>

        {result.errors > 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "rgba(239,68,68,0.6)", fontFamily: FONT, lineHeight: 1.5 }}>
            {result.errors} entries could not be saved — usually a temporary network issue. Re-importing the same file will upsert them safely.
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/diary"
            style={{
              display: "inline-flex", alignItems: "center", height: 42, padding: "0 20px",
              borderRadius: 999, background: "white", color: "black",
              textDecoration: "none", fontSize: 13, fontWeight: 600, fontFamily: FONT,
            }}
          >
            Open Diary
          </Link>
          <button
            type="button"
            onClick={onReset}
            style={{
              height: 42, padding: "0 20px", borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)", background: "transparent",
              color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: FONT, cursor: "pointer",
            }}
          >
            Import another file
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export default function ImportWizard() {
  const [step, setStep]             = useState<Step>("upload")
  const [parseResult, setParseResult] = useState<LetterboxdParseResult | null>(null)
  const [fileName, setFileName]     = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [matched, setMatched]       = useState<MatchedEntry[] | null>(null)
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null)

  function handleFile(file: File) {
    setParseError(null)
    setParseResult(null)
    setFileName(file.name)

    file.text().then((text) => {
      try {
        const result = parseLetterboxdCsvV2(text)
        setParseResult(result)
        setStep("preview")
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Could not parse that file.")
      }
    }).catch(() => {
      setParseError("Could not read that file.")
    })
  }

  function handleReset() {
    setStep("upload")
    setParseResult(null)
    setFileName(null)
    setParseError(null)
    setMatched(null)
    setImportResult(null)
  }

  const skippedCount = matched ? matched.filter((e) => e.skipped).length : 0

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "0 20px 100px",
        color: "white",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @media (max-width: 600px) {
          .preview-stats { grid-template-columns: repeat(3,1fr) !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 32, paddingTop: 8 }}>
        <div style={{ marginBottom: 10 }}>
          <Link
            href="/settings/profile"
            style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", textDecoration: "none", fontFamily: FONT }}
          >
            ← Settings
          </Link>
        </div>
        <h1 style={{
          margin: 0,
          fontSize: "clamp(26px,5vw,40px)",
          fontWeight: 700,
          letterSpacing: "-1px",
          lineHeight: 1.05,
          color: "rgba(255,255,255,0.95)",
        }}>
          Import from Letterboxd
        </h1>
        <p style={{
          margin: "8px 0 0",
          fontSize: 14,
          color: "rgba(255,255,255,0.4)",
          fontFamily: FONT,
          lineHeight: 1.6,
          maxWidth: 520,
        }}>
          Upload your Letterboxd export, match films to TMDB, review unmatched entries, then import to your diary.
        </p>
      </div>

      <StepIndicator current={step} />

      {step === "upload" ? (
        <UploadStep onFile={handleFile} error={parseError} />
      ) : null}

      {step === "preview" && parseResult ? (
        <PreviewStep
          result={parseResult}
          fileName={fileName ?? ""}
          onBack={handleReset}
          onContinue={() => setStep("match")}
        />
      ) : null}

      {step === "match" && parseResult ? (
        <MatchStep
          entries={parseResult.entries}
          onDone={(m) => { setMatched(m); setStep("review") }}
          onBack={() => setStep("preview")}
        />
      ) : null}

      {step === "review" && matched ? (
        <ReviewStep
          matched={matched}
          onContinue={(final) => { setMatched(final); setStep("import") }}
          onBack={() => setStep("match")}
        />
      ) : null}

      {step === "import" && matched ? (
        <ImportStep
          matched={matched}
          onDone={(result) => { setImportResult(result); setStep("complete") }}
          onBack={() => setStep("review")}
        />
      ) : null}

      {step === "complete" && importResult ? (
        <CompleteStep
          result={importResult}
          skippedCount={skippedCount}
          onReset={handleReset}
        />
      ) : null}
    </main>
  )
}
