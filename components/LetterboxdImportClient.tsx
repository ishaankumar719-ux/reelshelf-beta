"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { importDiaryEntries } from "../lib/diary";
import {
  parseLetterboxdCsv,
  type LetterboxdImportPreviewItem,
} from "../lib/letterboxdImport";

type ImportSummary = {
  imported: number;
  updated: number;
  total: number;
  duplicatesConsolidated: number;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 10px",
        color: "rgba(255,255,255,0.34)",
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
      }}
    >
      {children}
    </p>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getPreviewStats(items: LetterboxdImportPreviewItem[]) {
  const matched = items.filter((item) => item.matchType === "local").length;
  const reviews = items.filter((item) => item.review.trim()).length;
  const rewatches = items.filter((item) => item.rewatch).length;

  return {
    matched,
    reviews,
    rewatches,
  };
}

export default function LetterboxdImportClient() {
  const { user, loading } = useAuth();
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<LetterboxdImportPreviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const stats = useMemo(() => getPreviewStats(previewItems), [previewItems]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError(null);
    setSummary(null);

    if (!file) {
      setFileName(null);
      setPreviewItems([]);
      return;
    }

    try {
      const text = await file.text();
      const nextPreview = parseLetterboxdCsv(text);
      setFileName(file.name);
      setPreviewItems(nextPreview);
    } catch (nextError) {
      setFileName(file.name);
      setPreviewItems([]);
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not parse that CSV file."
      );
    }
  }

  async function handleImport() {
    if (previewItems.length === 0) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const nextSummary = await importDiaryEntries(
        previewItems.map((item) => item.diaryEntry)
      );
      setSummary(nextSummary);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not import your Letterboxd diary right now."
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main style={{ padding: "10px 0 64px" }}>
      <style>{`
        .letterboxd-import-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 24px;
        }

        .letterboxd-preview-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 980px) {
          .letterboxd-import-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .letterboxd-preview-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <div
          style={{
            borderRadius: 30,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 24%), linear-gradient(180deg, rgba(16,16,16,0.98) 0%, rgba(7,7,7,0.98) 100%)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.32)",
            padding: "28px 26px",
          }}
        >
          <SectionLabel>Letterboxd Import</SectionLabel>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 6vw, 56px)",
              lineHeight: 0.98,
              letterSpacing: "-1.8px",
              fontWeight: 600,
              maxWidth: 760,
            }}
          >
            Bring your Letterboxd diary into ReelShelf.
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              maxWidth: 760,
              color: "#c7c7c7",
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Upload your Letterboxd CSV export, preview how entries will map into
            ReelShelf, then import them into your diary with ratings, watched dates,
            and review text preserved.
          </p>
        </div>

        <div className="letterboxd-import-grid">
          <section
            style={{
              borderRadius: 26,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)",
              padding: 22,
            }}
          >
            <SectionLabel>Upload</SectionLabel>
            <div
              style={{
                display: "grid",
                gap: 16,
              }}
            >
              <label
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 22,
                  borderRadius: 24,
                  border: "1px dashed rgba(255,255,255,0.18)",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 55%), rgba(255,255,255,0.03)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.3px",
                  }}
                >
                  Choose your Letterboxd CSV
                </span>
                <span
                  style={{
                    color: "#a1a1aa",
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  Supported fields: title, year, rating, watched date, review text,
                  and rewatch status.
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    padding: "14px 14px 12px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#7f7f7f",
                      fontSize: 10,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Preview rows
                  </p>
                  <p style={{ margin: "10px 0 0", fontSize: 26, fontWeight: 600 }}>
                    {previewItems.length}
                  </p>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    padding: "14px 14px 12px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#7f7f7f",
                      fontSize: 10,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Matched locally
                  </p>
                  <p style={{ margin: "10px 0 0", fontSize: 26, fontWeight: 600 }}>
                    {stats.matched}
                  </p>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    padding: "14px 14px 12px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#7f7f7f",
                      fontSize: 10,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Reviews found
                  </p>
                  <p style={{ margin: "10px 0 0", fontSize: 26, fontWeight: 600 }}>
                    {stats.reviews}
                  </p>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 18,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#d1d5db",
                    fontSize: 14,
                    lineHeight: 1.7,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  {fileName
                    ? `Loaded ${fileName}. ${stats.rewatches} rewatch log${stats.rewatches === 1 ? "" : "s"} detected in this preview.`
                    : "No file loaded yet. Export your Letterboxd diary as CSV and bring it in here."}
                </p>
              </div>

              {error ? (
                <p
                  style={{
                    margin: 0,
                    color: "#fca5a5",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  {error}
                </p>
              ) : null}

              {summary ? (
                <div
                  style={{
                    borderRadius: 22,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
                    padding: 18,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <SectionLabel>Import Complete</SectionLabel>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 600,
                      letterSpacing: "-0.8px",
                    }}
                  >
                    {summary.imported + summary.updated} diary entries now live in ReelShelf.
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "#c7c7c7",
                      fontSize: 15,
                      lineHeight: 1.7,
                    }}
                  >
                    Added {summary.imported} new entries, refreshed {summary.updated} existing
                    ones, and consolidated {summary.duplicatesConsolidated} duplicate import
                    row{summary.duplicatesConsolidated === 1 ? "" : "s"}.
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link
                      href="/diary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: 42,
                        padding: "0 16px",
                        borderRadius: 999,
                        background: "white",
                        color: "black",
                        textDecoration: "none",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      Open Diary
                    </Link>
                    <Link
                      href="/profile"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: 42,
                        padding: "0 16px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "white",
                        textDecoration: "none",
                        fontSize: 14,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      Back to Profile
                    </Link>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={previewItems.length === 0 || isImporting || loading}
                onClick={handleImport}
                style={{
                  height: 48,
                  borderRadius: 999,
                  border: "none",
                  background: "white",
                  color: "black",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  cursor:
                    previewItems.length === 0 || isImporting || loading
                      ? "default"
                      : "pointer",
                  opacity: previewItems.length === 0 || isImporting || loading ? 0.55 : 1,
                }}
              >
                {isImporting
                  ? "Importing..."
                  : user
                    ? "Import into ReelShelf"
                    : "Import locally and sync after sign-in"}
              </button>
            </div>
          </section>

          <section
            style={{
              borderRadius: 26,
              border: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)",
              padding: 22,
              display: "grid",
              gap: 16,
              alignContent: "start",
            }}
          >
            <div>
              <SectionLabel>Preview</SectionLabel>
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  letterSpacing: "-0.8px",
                  fontWeight: 600,
                }}
              >
                Check the mapping before you confirm.
              </h2>
            </div>

            {previewItems.length === 0 ? (
              <div
                style={{
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "22px 20px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#a1a1aa",
                    fontSize: 15,
                    lineHeight: 1.7,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  Your preview will appear here once a CSV is loaded. ReelShelf will
                  match films from the local catalogue when possible and create import-safe
                  custom film routes for everything else.
                </p>
              </div>
            ) : (
              <div className="letterboxd-preview-grid">
                {previewItems.slice(0, 8).map((item) => (
                  <article
                    key={`${item.diaryEntry.id}-${item.sourceIndex}`}
                    style={{
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                      padding: 16,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 18,
                            lineHeight: 1.15,
                            letterSpacing: "-0.4px",
                            fontWeight: 600,
                          }}
                        >
                          {item.title}
                        </h3>
                        <p
                          style={{
                            margin: "6px 0 0",
                            color: "#9ca3af",
                            fontSize: 13,
                            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                          }}
                        >
                          {item.year} · {item.rating !== null ? `${item.rating.toFixed(1)} / 10` : "No rating"}
                        </p>
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          height: 28,
                          padding: "0 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background:
                            item.matchType === "local"
                              ? "rgba(255,255,255,0.09)"
                              : "rgba(255,255,255,0.04)",
                          color: "white",
                          fontSize: 11,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        {item.matchType === "local" ? "Matched" : "Custom"}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        color: "#c7c7c7",
                        fontSize: 14,
                        lineHeight: 1.65,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      {item.reason}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          height: 30,
                          padding: "0 12px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#d1d5db",
                          fontSize: 12,
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                        }}
                      >
                        {formatDate(item.watchedDate)}
                      </span>
                      {item.rewatch ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: 30,
                            padding: "0 12px",
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#d1d5db",
                            fontSize: 12,
                            fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                          }}
                        >
                          Rewatch
                        </span>
                      ) : null}
                    </div>

                    {item.review.trim() ? (
                      <p
                        style={{
                          margin: 0,
                          color: "#a1a1aa",
                          fontSize: 13,
                          lineHeight: 1.7,
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.review}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
