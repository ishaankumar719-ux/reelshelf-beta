"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  parseLetterboxdCsvV2,
  detectLetterboxdFileType,
  type LetterboxdParseResult,
  type LetterboxdFileType,
} from "@/lib/letterboxdImport"
import {
  batchImportLetterboxd,
  type BatchImportResult,
  type BatchImportProgress,
} from "@/lib/supabase/letterboxdBatchImport"

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "preview" | "importing" | "done"

// ─── Style tokens ─────────────────────────────────────────────────────────────

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const card: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.015) 100%)",
  padding: 24,
}

// ─── Small helpers ────────────────────────────────────────────────────────────

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

function StatCard({
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
        borderRadius: 16,
        border: `1px solid ${accent ? "rgba(29,158,117,0.25)" : "rgba(255,255,255,0.07)"}`,
        background: accent ? "rgba(29,158,117,0.08)" : "rgba(255,255,255,0.025)",
        padding: "14px 16px 12px",
      }}
    >
      <Label>{label}</Label>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.5px",
          color: accent ? "#6eddb8" : "rgba(255,255,255,0.9)",
        }}
      >
        {value}
      </p>
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 8px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: "0.5px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.5)",
        fontSize: 10,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

function fileTypeLabel(t: LetterboxdFileType) {
  if (t === "diary") return "diary.csv"
  if (t === "watched") return "watched.csv"
  if (t === "ratings") return "ratings.csv"
  if (t === "reviews") return "reviews.csv"
  return "CSV"
}

// ─── Stage: idle ─────────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  dragActive,
  setDragActive,
}: {
  onFile: (file: File) => void
  dragActive: boolean
  setDragActive: (v: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        minHeight: 220,
        borderRadius: 20,
        border: dragActive
          ? "1.5px dashed rgba(29,158,117,0.6)"
          : "1.5px dashed rgba(255,255,255,0.16)",
        background: dragActive
          ? "rgba(29,158,117,0.05)"
          : "rgba(255,255,255,0.02)",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        padding: 32,
        textAlign: "center",
      }}
    >
      {/* CSV icon */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>

      <div>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "rgba(255,255,255,0.82)",
            letterSpacing: "-0.2px",
          }}
        >
          Drop your Letterboxd CSV here
        </p>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 13,
            color: "rgba(255,255,255,0.36)",
            fontFamily: FONT,
          }}
        >
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
          // reset so the same file can be re-selected after error
          e.target.value = ""
        }}
      />
    </div>
  )
}

function HowToExport() {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.018)",
        padding: "18px 20px",
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
          color: "rgba(255,255,255,0.48)",
          fontSize: 13,
          fontFamily: FONT,
          lineHeight: 1.6,
        }}
      >
        <li>
          Go to{" "}
          <span style={{ color: "rgba(255,255,255,0.72)" }}>
            letterboxd.com → your profile → Settings
          </span>
        </li>
        <li>
          Click{" "}
          <span style={{ color: "rgba(255,255,255,0.72)" }}>
            Import &amp; Export → Export your data
          </span>
        </li>
        <li>Download the ZIP and unzip it</li>
        <li>
          Upload{" "}
          <span style={{ color: "rgba(255,255,255,0.72)" }}>
            diary.csv
          </span>{" "}
          for full history with dates, or{" "}
          <span style={{ color: "rgba(255,255,255,0.72)" }}>
            ratings.csv
          </span>{" "}
          for just your ratings
        </li>
      </ol>
    </div>
  )
}

// ─── Stage: preview ───────────────────────────────────────────────────────────

function PreviewTable({
  entries,
}: {
  entries: LetterboxdParseResult["entries"]
}) {
  const shown = entries.slice(0, 100)

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 52px 72px 90px 32px 36px 52px",
          gap: 0,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.03)",
          borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        }}
      >
        {["Film", "Year", "Rating", "Watched", "↺", "⚠", "Match"].map(
          (col) => (
            <span
              key={col}
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                fontFamily: FONT,
              }}
            >
              {col}
            </span>
          )
        )}
      </div>

      {/* Rows */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {shown.map((entry, i) => (
          <div
            key={`${entry.diaryEntry.id}-${entry.sourceRow}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 52px 72px 90px 32px 36px 52px",
              gap: 0,
              padding: "9px 14px",
              borderBottom:
                i === shown.length - 1
                  ? "none"
                  : "0.5px solid rgba(255,255,255,0.04)",
              background:
                i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.78)",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                paddingRight: 8,
              }}
              title={entry.title}
            >
              {entry.title}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.38)",
                fontFamily: FONT,
              }}
            >
              {entry.year}
            </span>
            <span
              style={{
                fontSize: 12,
                color:
                  entry.rating !== null
                    ? "rgba(255,255,255,0.72)"
                    : "rgba(255,255,255,0.2)",
                fontVariantNumeric: "tabular-nums",
                fontFamily: FONT,
              }}
            >
              {entry.rating !== null ? `${entry.rating.toFixed(1)}/10` : "—"}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                fontFamily: FONT,
              }}
            >
              {formatDate(entry.watchedDate)}
            </span>
            <span
              style={{
                fontSize: 12,
                color: entry.rewatch
                  ? "rgba(245,158,11,0.7)"
                  : "rgba(255,255,255,0.12)",
              }}
            >
              {entry.rewatch ? "↺" : "·"}
            </span>
            <span
              style={{
                fontSize: 11,
                color: entry.containsSpoilers
                  ? "rgba(239,68,68,0.6)"
                  : "rgba(255,255,255,0.12)",
              }}
            >
              {entry.containsSpoilers ? "⚠" : "·"}
            </span>
            <span
              style={{
                fontSize: 10,
                color:
                  entry.matchType === "local"
                    ? "rgba(29,158,117,0.8)"
                    : "rgba(255,255,255,0.24)",
                fontFamily: FONT,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              {entry.matchType === "local" ? "Matched" : "Custom"}
            </span>
          </div>
        ))}
      </div>

      {entries.length > 100 ? (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "0.5px solid rgba(255,255,255,0.06)",
            fontSize: 12,
            color: "rgba(255,255,255,0.28)",
            fontFamily: FONT,
          }}
        >
          Showing first 100 of {entries.length} entries
        </div>
      ) : null}
    </div>
  )
}

// ─── Stage: importing — progress bar ─────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: 6,
        borderRadius: 3,
        background: "rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, pct)}%`,
          background: "linear-gradient(90deg,#1D9E75,#34d9a8)",
          borderRadius: 3,
          transition: "width 0.2s ease",
        }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImportClient() {
  const [stage, setStage] = useState<Stage>("idle")
  const [dragActive, setDragActive] = useState(false)
  const [parseResult, setParseResult] = useState<LetterboxdParseResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [progress, setProgress] = useState<BatchImportProgress | null>(null)
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── File picked ────────────────────────────────────────────────────────────

  function handleFile(file: File) {
    setParseError(null)
    setImportResult(null)
    setImportError(null)
    setParseResult(null)
    setFileName(file.name)

    file.text().then((text) => {
      try {
        const result = parseLetterboxdCsvV2(text)
        setParseResult(result)
        setStage("preview")
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Could not parse that file."
        )
      }
    }).catch(() => {
      setParseError("Could not read that file.")
    })
  }

  // ── Start import ───────────────────────────────────────────────────────────

  async function handleImport() {
    if (!parseResult) return
    setImportError(null)
    setProgress({ completed: 0, total: parseResult.entries.length, batchIndex: 0, batchCount: 0 })
    setStage("importing")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await batchImportLetterboxd(
        parseResult.entries.map((e) => e.diaryEntry),
        (p) => setProgress(p),
        controller.signal
      )
      setImportResult(result)
      setStage("done")
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Import failed. Please try again."
      )
      setStage("preview")
    } finally {
      abortRef.current = null
    }
  }

  // ── Cancel import ──────────────────────────────────────────────────────────

  function handleCancel() {
    abortRef.current?.abort()
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    setStage("idle")
    setParseResult(null)
    setFileName(null)
    setParseError(null)
    setProgress(null)
    setImportResult(null)
    setImportError(null)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const pct = progress
    ? progress.total > 0
      ? (progress.completed / progress.total) * 100
      : 0
    : 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 20px 80px",
        color: "white",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .import-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Link
            href="/profile"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "rgba(255,255,255,0.36)",
              textDecoration: "none",
              fontFamily: FONT,
              letterSpacing: "0.03em",
            }}
          >
            ← Settings
          </Link>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px,5vw,44px)",
            fontWeight: 700,
            letterSpacing: "-1.2px",
            lineHeight: 1.05,
            color: "rgba(255,255,255,0.95)",
          }}
        >
          Import from Letterboxd
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 15,
            color: "rgba(255,255,255,0.42)",
            fontFamily: FONT,
            lineHeight: 1.6,
            maxWidth: 560,
          }}
        >
          Upload your Letterboxd export and preview exactly how your diary will
          map into ReelShelf before committing anything.
        </p>
      </div>

      {/* ════════════════════════════════════════════════
          STAGE: idle
      ════════════════════════════════════════════════ */}
      {stage === "idle" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <UploadZone
            onFile={handleFile}
            dragActive={dragActive}
            setDragActive={setDragActive}
          />

          {parseError ? (
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(239,68,68,0.2)",
                background: "rgba(239,68,68,0.06)",
                padding: "14px 18px",
                fontSize: 13,
                color: "#fca5a5",
                fontFamily: FONT,
                lineHeight: 1.6,
              }}
            >
              {parseError}
            </div>
          ) : null}

          <HowToExport />
        </div>
      ) : null}

      {/* ════════════════════════════════════════════════
          STAGE: preview
      ════════════════════════════════════════════════ */}
      {stage === "preview" && parseResult ? (
        <div style={{ display: "grid", gap: 20 }}>
          {/* File badge + back */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "rgba(255,255,255,0.36)",
                fontSize: 12,
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ← Change file
            </button>
            <Pill>{fileTypeLabel(parseResult.fileType)}</Pill>
            {fileName ? (
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.28)",
                  fontFamily: FONT,
                }}
              >
                {fileName}
              </span>
            ) : null}
          </div>

          {/* Stats */}
          <div
            className="import-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: 10,
            }}
          >
            <StatCard
              value={parseResult.stats.total}
              label="Total entries"
              accent
            />
            <StatCard
              value={parseResult.stats.withRating}
              label="With ratings"
            />
            <StatCard
              value={parseResult.stats.withReview}
              label="With reviews"
            />
            <StatCard
              value={parseResult.stats.rewatches}
              label="Rewatches"
            />
            <StatCard
              value={parseResult.stats.localMatches}
              label="Catalogue hits"
            />
          </div>

          {/* Error from a previous import attempt */}
          {importError ? (
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(239,68,68,0.2)",
                background: "rgba(239,68,68,0.06)",
                padding: "14px 18px",
                fontSize: 13,
                color: "#fca5a5",
                fontFamily: FONT,
                lineHeight: 1.6,
              }}
            >
              {importError}
            </div>
          ) : null}

          {/* Preview table */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Label>Preview</Label>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: "-0.3px",
                    color: "rgba(255,255,255,0.82)",
                  }}
                >
                  {parseResult.entries.length} entries ready to import
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                  Legend:
                </span>
                <span style={{ fontSize: 11, color: "rgba(29,158,117,0.8)", fontFamily: FONT }}>
                  Matched
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                  = found in ReelShelf catalogue ·
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
                  Custom
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: FONT }}>
                  = imported with slug-based ID
                </span>
              </div>
            </div>

            <PreviewTable entries={parseResult.entries} />
          </div>

          {/* Spoilers note */}
          {parseResult.stats.withReview > 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "rgba(255,255,255,0.28)",
                fontFamily: FONT,
                lineHeight: 1.6,
              }}
            >
              {parseResult.stats.withReview} review
              {parseResult.stats.withReview === 1 ? "" : "s"} will be imported.
              Ratings will be converted from Letterboxd&apos;s 5-star scale to
              ReelShelf&apos;s 10-point scale automatically.
            </p>
          ) : null}

          {/* Import button */}
          <button
            type="button"
            onClick={() => void handleImport()}
            style={{
              height: 50,
              borderRadius: 999,
              border: "none",
              background: "#1D9E75",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "-0.2px",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.88"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1"
            }}
          >
            Import {parseResult.entries.length} entries →
          </button>
        </div>
      ) : null}

      {/* ════════════════════════════════════════════════
          STAGE: importing
      ════════════════════════════════════════════════ */}
      {stage === "importing" && progress ? (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ ...card, display: "grid", gap: 20 }}>
            <div>
              <Label>Importing</Label>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.5px",
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {progress.completed} of {progress.total} entries saved
              </p>
            </div>

            <ProgressBar pct={pct} />

            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "rgba(255,255,255,0.32)",
                fontFamily: FONT,
              }}
            >
              {progress.batchCount > 0
                ? `Batch ${progress.batchIndex} of ${progress.batchCount}`
                : "Starting…"}
            </p>

            <button
              type="button"
              onClick={handleCancel}
              style={{
                alignSelf: "start",
                height: 36,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                fontFamily: FONT,
                cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              Cancel import
            </button>
          </div>

          {/* Animated dots to show it's live */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "rgba(29,158,117,0.5)",
                  animation: "pulse 1.4s ease-in-out infinite",
                  animationDelay: `${i * 180}ms`,
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* ════════════════════════════════════════════════
          STAGE: done
      ════════════════════════════════════════════════ */}
      {stage === "done" && importResult ? (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Success card */}
          <div
            style={{
              borderRadius: 24,
              border: "1px solid rgba(29,158,117,0.2)",
              background:
                "linear-gradient(180deg,rgba(29,158,117,0.07) 0%,rgba(29,158,117,0.03) 100%)",
              padding: "28px 26px",
              display: "grid",
              gap: 14,
            }}
          >
            {/* Check circle */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(29,158,117,0.15)",
                border: "1px solid rgba(29,158,117,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1D9E75"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "-0.6px",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {importResult.cancelled
                  ? "Import stopped"
                  : "Import complete"}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 15,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: FONT,
                  lineHeight: 1.6,
                }}
              >
                {importResult.cancelled
                  ? `Saved ${importResult.total} entries before you cancelled.`
                  : `${importResult.total} ${importResult.total === 1 ? "entry" : "entries"} saved to your ReelShelf diary.`}
              </p>
            </div>

            {/* Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 10,
              }}
            >
              <StatCard value={importResult.inserted} label="New entries" accent />
              <StatCard value={importResult.updated} label="Updated" />
              <StatCard value={importResult.errors} label="Errors" />
            </div>

            {importResult.errors > 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "rgba(239,68,68,0.6)",
                  fontFamily: FONT,
                  lineHeight: 1.5,
                }}
              >
                {importResult.errors} entries could not be saved. This is usually
                a temporary network issue — try re-importing the same file and
                they will upsert safely.
              </p>
            ) : null}

            {/* CTA buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href="/diary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 42,
                  padding: "0 20px",
                  borderRadius: 999,
                  background: "white",
                  color: "black",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                }}
              >
                Open Diary
              </Link>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  height: 42,
                  padding: "0 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  fontFamily: FONT,
                  cursor: "pointer",
                }}
              >
                Import another file
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
