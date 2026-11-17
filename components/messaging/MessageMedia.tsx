"use client"

import { useEffect, useState } from "react"
import { fitMedia, formatDuration, type GifAttachment } from "@/lib/messaging/api"
import { C } from "./ui"

/** Private photos and videos load through /api/message-media, which reads
 *  storage with the viewer's own session (membership checked per request). */
export function mediaSrc(path: string): string {
  return `/api/message-media/${path.split("/").map(encodeURIComponent).join("/")}`
}

// ── Picking a file ───────────────────────────────────────────────────────────

export interface PreparedMedia {
  kind: "image" | "video"
  file: File
  previewUrl: string
  width: number | null
  height: number | null
  durationMs: number | null
  /** Video only: a JPEG of an early frame, uploaded as the poster. */
  thumb: Blob | null
}

/** Reads size (and for video, length and a poster frame) from a file the
 *  person picked or dropped, entirely in the browser. */
export async function prepareMedia(file: File, kind: "image" | "video"): Promise<PreparedMedia> {
  const previewUrl = URL.createObjectURL(file)
  if (kind === "image") {
    const size = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve(null)
      img.src = previewUrl
    })
    if (!size) throw new Error("That photo couldn't be opened.")
    return { kind, file, previewUrl, width: size.w, height: size.h, durationMs: null, thumb: null }
  }

  const video = document.createElement("video")
  video.muted = true
  video.playsInline = true
  video.preload = "auto"
  video.src = previewUrl
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error("That video can't be played in this browser. Try an MP4."))
  })
  const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve()
    video.currentTime = Math.min(0.5, (video.duration || 1) / 4)
  })
  const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight, 1))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
  const thumb = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8))
  if (!thumb) throw new Error("Couldn't make a preview for that video.")
  return { kind, file, previewUrl, width: video.videoWidth || null, height: video.videoHeight || null, durationMs, thumb }
}

// ── In the thread ────────────────────────────────────────────────────────────

const MAX_W = 300
const MAX_H = 340

export function GifView({ gif }: { gif: GifAttachment }) {
  const box = fitMedia(gif.width, gif.height, 260, 260)
  return (
    <span style={{ position: "relative", display: "block", width: box.width, height: box.height, borderRadius: 16, overflow: "hidden", background: C.elevated }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- animated GIPHY media */}
      <img src={gif.url} alt={gif.title ? `GIF: ${gif.title}` : "GIF"} width={box.width} height={box.height}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <span aria-hidden="true" style={badge}>GIF</span>
    </span>
  )
}

export function PhotoView({ src, width, height, onOpen }: {
  src: string; width: number | null; height: number | null; onOpen?: () => void
}) {
  const [failed, setFailed] = useState(false)
  const box = fitMedia(width, height, MAX_W, MAX_H)
  const inner = failed ? (
    <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: C.muted, fontSize: 13 }}>Photo unavailable</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- private, session-checked media
    <img src={src} alt="Photo" width={box.width} height={box.height} onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  )
  const frame: React.CSSProperties = {
    display: "block", width: box.width, height: box.height, borderRadius: 16, overflow: "hidden",
    background: C.elevated, border: "none", padding: 0, cursor: onOpen ? "zoom-in" : "default",
  }
  return onOpen && !failed
    ? <button type="button" onClick={onOpen} aria-label="Open photo" style={frame}>{inner}</button>
    : <span style={frame}>{inner}</span>
}

export function VideoView({ src, poster, width, height, durationMs }: {
  src: string | null; poster: string | null; width: number | null; height: number | null; durationMs: number | null
}) {
  const [playing, setPlaying] = useState(false)
  const box = fitMedia(width, height, MAX_W, MAX_H)
  const frame: React.CSSProperties = {
    position: "relative", display: "block", width: box.width, height: box.height, borderRadius: 16,
    overflow: "hidden", background: "#000",
  }
  if (playing && src) {
    return (
      <span style={frame}>
        <video src={src} poster={poster ?? undefined} controls autoPlay playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }} />
      </span>
    )
  }
  return (
    <span style={frame}>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element -- private, session-checked poster
        <img src={poster} alt="" width={box.width} height={box.height}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : null}
      {src ? (
        <button type="button" onClick={() => setPlaying(true)}
          aria-label={`Play video${durationMs != null ? `, ${formatDuration(durationMs)}` : ""}`}
          style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 56, height: 56,
            borderRadius: 999, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(7,7,11,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
          }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="#fff" /></svg>
        </button>
      ) : null}
      {durationMs != null ? (
        <span style={{ ...badge, left: "auto", right: 8 }}>{formatDuration(durationMs)}</span>
      ) : null}
    </span>
  )
}

/** Full-size photo over the page; Escape or a click outside closes it. */
export function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.88)", display: "grid", placeItems: "center", padding: 24,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- private, session-checked media */}
      <img src={src} alt="Photo" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12, objectFit: "contain" }} />
      <button type="button" onClick={onClose} aria-label="Close photo" style={{
        position: "fixed", top: 16, right: 16, width: 44, height: 44, borderRadius: 999, border: "none",
        background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 20, cursor: "pointer",
      }}>×</button>
    </div>
  )
}

const badge: React.CSSProperties = {
  position: "absolute", left: 8, bottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
  color: "#fff", background: "rgba(7,7,11,0.7)", padding: "2px 7px", borderRadius: 6,
}
