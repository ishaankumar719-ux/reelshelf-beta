"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

type MediaType = "movie" | "tv" | "book"

const BUTTONS: { type: MediaType; idle: string; loading: string }[] = [
  { type: "movie", idle: "🎬 Random Movie", loading: "Finding a film…" },
  { type: "tv",    idle: "📺 Random TV Show", loading: "Finding a show…" },
  { type: "book",  idle: "📚 Random Book", loading: "Finding a book…" },
]

export default function SurpriseMe() {
  const router = useRouter()
  const [loading, setLoading] = useState<MediaType | null>(null)
  const [lastIds, setLastIds] = useState<Partial<Record<MediaType, string>>>({})

  async function handleClick(type: MediaType) {
    if (loading) return
    setLoading(type)
    try {
      const exclude = lastIds[type] ?? ""
      const res = await fetch(
        `/api/discover/random?type=${type}&exclude=${encodeURIComponent(exclude)}`,
      )
      if (!res.ok) throw new Error("no result")
      const data = (await res.json()) as { href: string; id: string }
      setLastIds((prev) => ({ ...prev, [type]: data.id }))
      router.push(data.href)
    } catch {
      // fail silently — button returns to idle
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <style>{`
        .disc-surprise-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .disc-surprise-btn {
          padding: 10px 20px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: transparent;
          font-family: ${SANS};
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.72);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease;
          white-space: nowrap;
        }
        .disc-surprise-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.32);
          color: rgba(255,255,255,0.92);
          transform: translateY(-1px);
        }
        .disc-surprise-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .disc-surprise-btn.is-loading {
          border-color: rgba(29,158,117,0.4);
          color: rgba(29,158,117,0.8);
        }
        @media (max-width: 480px) {
          .disc-surprise-row { flex-direction: column; }
          .disc-surprise-btn { text-align: center; }
        }
      `}</style>
      <div className="disc-surprise-row">
        {BUTTONS.map((btn) => (
          <button
            key={btn.type}
            className={`disc-surprise-btn${loading === btn.type ? " is-loading" : ""}`}
            onClick={() => void handleClick(btn.type)}
            disabled={loading !== null}
          >
            {loading === btn.type ? btn.loading : btn.idle}
          </button>
        ))}
      </div>
    </>
  )
}
