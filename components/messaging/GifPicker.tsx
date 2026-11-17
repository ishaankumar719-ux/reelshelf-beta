"use client"

import { useEffect, useRef, useState } from "react"
import type { GifPick } from "@/lib/messaging/api"
import { C } from "./ui"

// The site's existing GIPHY integration (same key, endpoints and G rating as
// components/AttachmentPicker.tsx), shown as a panel above the composer.

interface GiphyImage { url: string; width: string; height: string }
interface GiphyGif {
  id: string
  title: string
  images: { fixed_width_small: GiphyImage; downsized: GiphyImage; fixed_width: GiphyImage }
}

async function fetchGifs(query: string, signal: AbortSignal): Promise<GiphyGif[]> {
  const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? ""
  if (!key) return []
  const base = "https://api.giphy.com/v1/gifs"
  const endpoint = query.trim()
    ? `${base}/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=24&rating=g`
    : `${base}/trending?api_key=${key}&limit=24&rating=g`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error(`GIPHY ${res.status}`)
  const json = (await res.json()) as { data: GiphyGif[] }
  return json.data ?? []
}

export function toGifPick(gif: GiphyGif): GifPick {
  const img = gif.images.downsized?.url ? gif.images.downsized : gif.images.fixed_width
  return {
    giphy_id: gif.id,
    url: img.url,
    width: Number(img.width) || 200,
    height: Number(img.height) || 200,
    title: gif.title || null,
  }
}

export default function GifPicker({ onPick, onClose }: { onPick: (gif: GifPick) => void; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [gifs, setGifs] = useState<GiphyGif[] | null>(null)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasKey = Boolean(process.env.NEXT_PUBLIC_GIPHY_API_KEY)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!hasKey) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setFailed(false)
      fetchGifs(query, controller.signal)
        .then(setGifs)
        .catch((e: Error) => { if (e.name !== "AbortError") setFailed(true) })
    }, query ? 300 : 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, hasKey])

  return (
    <div
      role="dialog"
      aria-label="Choose a GIF"
      onKeyDown={(e) => { if (e.key === "Escape") onClose() }}
      style={{
        position: "absolute", left: 12, right: 12, bottom: "calc(100% + 8px)", zIndex: 20,
        maxWidth: 440, maxHeight: 380, display: "flex", flexDirection: "column", gap: 10, padding: 12,
        borderRadius: 16, background: C.card, border: `1px solid ${C.lineStrong}`, boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label htmlFor="gif-search" style={visuallyHidden}>Search GIFs</label>
        <input
          id="gif-search"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIPHY"
          style={{
            flex: 1, height: 40, borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.05)",
            color: C.text, padding: "0 14px", fontSize: 14, outline: "none", fontFamily: C.font,
          }}
        />
        <button type="button" onClick={onClose} aria-label="Close GIFs" style={{
          width: 40, height: 40, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.06)", color: C.text, cursor: "pointer",
        }}>×</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {!hasKey ? (
          <p style={{ color: C.muted, fontSize: 13, margin: 8 }}>GIF search isn&apos;t set up here (NEXT_PUBLIC_GIPHY_API_KEY).</p>
        ) : failed ? (
          <p style={{ color: C.muted, fontSize: 13, margin: 8 }}>Couldn&apos;t load GIFs. Check your connection and try again.</p>
        ) : gifs === null ? (
          <p style={{ color: C.muted, fontSize: 13, margin: 8 }}>Loading…</p>
        ) : gifs.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13, margin: 8 }}>No GIFs for “{query}”.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
            {gifs.map((gif) => (
              <button key={gif.id} type="button" onClick={() => onPick(toGifPick(gif))}
                aria-label={`Send GIF${gif.title ? `: ${gif.title}` : ""}`}
                style={{ padding: 0, border: "none", borderRadius: 10, overflow: "hidden", cursor: "pointer", background: C.elevated, aspectRatio: "1 / 1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- GIPHY preview, animated */}
                <img src={gif.images.fixed_width_small.url} alt="" loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.faint, textAlign: "right" }}>Powered by GIPHY</span>
    </div>
  )
}

const visuallyHidden: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
}
