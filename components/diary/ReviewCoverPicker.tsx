"use client"

import { useEffect, useRef, useState } from "react"
import { uploadAttachment } from "../../lib/supabase/storage"
import type { TMDBImageOption } from "../../app/api/tmdb/images/route"

export type ReviewCoverSource = "default" | "tmdb_poster" | "tmdb_backdrop" | "upload"

export interface ReviewCoverValue {
  url: string | null
  source: ReviewCoverSource
}

interface ReviewCoverPickerProps {
  mediaType: "movie" | "tv" | "book"
  tmdbId?: number | null
  defaultPosterUrl?: string | null
  value: ReviewCoverValue
  onChange: (value: ReviewCoverValue) => void
}

const CAROUSEL_CSS = `
  .rs-cover-carousel {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 6px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .rs-cover-carousel::-webkit-scrollbar { display: none; }
  .rs-cover-item { scroll-snap-align: start; flex-shrink: 0; }
`

export default function ReviewCoverPicker({
  mediaType,
  tmdbId,
  defaultPosterUrl,
  value,
  onChange,
}: ReviewCoverPickerProps) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<TMDBImageOption[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [manualUrl, setManualUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (mediaType === "book" || !tmdbId) return
    if (images.length > 0) return

    setLoadingImages(true)
    fetch(`/api/tmdb/images?tmdbId=${tmdbId}&mediaType=${mediaType === "movie" ? "movie" : "tv"}`)
      .then((r) => r.json())
      .then((d: { images: TMDBImageOption[] }) => {
        setImages(d.images ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingImages(false))
  }, [open, mediaType, tmdbId, images.length])

  async function handleFileUpload(file: File) {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const result = await uploadAttachment(file)
      if ("error" in result) {
        setUploadError(result.error)
      } else {
        onChange({ url: result.url, source: "upload" })
        setOpen(false)
      }
    } catch {
      setUploadError("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  function selectImage(img: TMDBImageOption) {
    onChange({
      url: img.url,
      source: img.type === "backdrop" ? "tmdb_backdrop" : "tmdb_poster",
    })
    setOpen(false)
  }

  function selectDefault() {
    onChange({ url: defaultPosterUrl ?? null, source: "default" })
    setOpen(false)
  }

  function applyManualUrl() {
    const trimmed = manualUrl.trim()
    if (!trimmed) return
    onChange({ url: trimmed, source: "upload" })
    setManualUrl("")
    setOpen(false)
  }

  const displayUrl = value.url ?? defaultPosterUrl
  const hasCustomCover = value.source !== "default" && value.url

  return (
    <div style={{ marginTop: 16 }}>
      <style>{CAROUSEL_CSS}</style>

      {/* Section label + toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
            Review Cover
          </span>
          {hasCustomCover ? (
            <span style={{
              fontSize: 9,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.08)",
              border: "0.5px solid rgba(255,255,255,0.14)",
              borderRadius: 999,
              padding: "1px 6px",
            }}>
              {value.source === "tmdb_backdrop" ? "Backdrop" : value.source === "upload" ? "Custom" : "Poster"}
            </span>
          ) : null}
        </div>
        <span style={{
          fontSize: 9,
          display: "inline-block",
          transition: "transform 0.2s ease",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          color: "rgba(255,255,255,0.3)",
        }}>▼</span>
      </button>

      {open ? (
        <div style={{ marginTop: 12 }}>
          {/* Preview strip — currently selected */}
          {displayUrl ? (
            <div style={{
              width: "100%",
              height: 80,
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 12,
              position: "relative",
              background: "#0a0a14",
            }}>
              <img
                src={displayUrl}
                alt="Cover preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 40%)",
                pointerEvents: "none",
              }} />
              <span style={{
                position: "absolute",
                bottom: 6,
                left: 8,
                fontSize: 10,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.04em",
              }}>
                {value.source === "default" ? "Default poster" : value.source === "tmdb_backdrop" ? "Backdrop" : "Custom"}
              </span>
            </div>
          ) : null}

          {/* Default option */}
          {defaultPosterUrl ? (
            <button
              type="button"
              onClick={selectDefault}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                background: value.source === "default" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                border: value.source === "default" ? "0.5px solid rgba(255,255,255,0.2)" : "0.5px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "8px 10px",
                cursor: "pointer",
                marginBottom: 10,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <div style={{ width: 28, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                <img src={defaultPosterUrl} alt="Default" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Default poster</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Standard cover from database</div>
              </div>
              {value.source === "default" ? (
                <span style={{ marginLeft: "auto", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>✓</span>
              ) : null}
            </button>
          ) : null}

          {/* TMDB image carousel — films and TV only */}
          {mediaType !== "book" && tmdbId ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                Posters & stills from TMDB
              </div>
              {loadingImages ? (
                <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Loading…</span>
                </div>
              ) : images.length === 0 ? (
                <div style={{ height: 40, display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>No images found</span>
                </div>
              ) : (
                <div className="rs-cover-carousel">
                  {images.map((img, i) => {
                    const isSelected = value.url === img.url
                    const isBackdrop = img.type === "backdrop"
                    return (
                      <button
                        key={i}
                        type="button"
                        className="rs-cover-item"
                        onClick={() => selectImage(img)}
                        style={{
                          padding: 0,
                          border: isSelected
                            ? "2px solid rgba(255,255,255,0.8)"
                            : "2px solid transparent",
                          borderRadius: 6,
                          overflow: "hidden",
                          cursor: "pointer",
                          background: "#0a0a14",
                          width: isBackdrop ? 112 : 52,
                          height: isBackdrop ? 63 : 78,
                          transition: "border-color 0.15s",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        <img
                          src={img.url}
                          alt={isBackdrop ? "Backdrop" : "Poster"}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        {isBackdrop ? (
                          <span style={{
                            position: "absolute",
                            bottom: 2,
                            left: 3,
                            fontSize: 7,
                            color: "rgba(255,255,255,0.55)",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}>Still</span>
                        ) : null}
                        {isSelected ? (
                          <div style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(255,255,255,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            <span style={{ fontSize: 14, color: "white" }}>✓</span>
                          </div>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Upload from device */}
          <div style={{ marginBottom: 10 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileUpload(file)
                e.target.value = ""
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "10px 12px",
                cursor: uploading ? "wait" : "pointer",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: 15 }}>📷</span>
              <span>{uploading ? "Uploading…" : "Upload from device"}</span>
            </button>
            {uploadError ? (
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#fca5a5" }}>{uploadError}</p>
            ) : null}
          </div>

          {/* Advanced: URL paste (collapsed by default) */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 11,
              color: "rgba(255,255,255,0.22)",
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 8, display: "inline-block", transition: "transform 0.2s", transform: advancedOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
            Advanced: paste image URL
          </button>
          {advancedOpen ? (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={applyManualUrl}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "0.5px solid rgba(255,255,255,0.14)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Use
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
