"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { deleteReview, upsertReview } from "@/src/lib/reviews"
import type { Review, ReviewScope } from "@/src/types/reviews"

interface ReviewFormProps {
  mediaId: number
  mediaType: "film" | "series"
  scope: ReviewScope
  seasonNumber?: number | null
  episodeNumber?: number | null
  initialReview?: Review | null
  onSaved?: (review: Review | null) => void
  compact?: boolean
  title?: string
  year?: number | null
  posterPath?: string | null
  creator?: string | null
  aliases?: string[]
}

const SLIDER_CSS = `
  .rs-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 2px;
    border-radius: 1px;
    outline: none;
    cursor: pointer;
  }
  .rs-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.55), 0 0 14px rgba(255,255,255,0.08);
    cursor: grab;
    transition: transform 0.1s ease, box-shadow 0.15s ease;
  }
  .rs-slider:focus::-webkit-slider-thumb,
  .rs-slider:hover::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(255,255,255,0.1), 0 2px 10px rgba(0,0,0,0.6), 0 0 18px rgba(255,255,255,0.12);
  }
  .rs-slider:active::-webkit-slider-thumb {
    cursor: grabbing;
    transform: scale(1.18);
  }
  .rs-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.55);
    cursor: grab;
  }
  .rs-slider::-moz-range-track { background: transparent; }
`

function RatingSlider({
  rating,
  onSelect,
}: {
  rating: number | null
  onSelect: (next: number | null) => void
}) {
  const fillPct = ((rating ?? 0) / 10) * 100
  const hasValue = rating !== null
  const trackBg = `linear-gradient(to right, rgba(255,255,255,${hasValue ? 0.52 : 0.16}) 0%, rgba(255,255,255,${hasValue ? 0.52 : 0.16}) ${fillPct}%, rgba(255,255,255,0.09) ${fillPct}%, rgba(255,255,255,0.09) 100%)`

  return (
    <>
      <style>{SLIDER_CSS}</style>
      <div>
        <div className="mb-4 flex min-h-[52px] items-baseline justify-center gap-1.5">
          {hasValue ? (
            <>
              <span className="text-[44px] font-light leading-none tracking-[-2px] text-white/92" style={{ fontVariantNumeric: "tabular-nums" }}>
                {rating!.toFixed(1)}
              </span>
              <span className="text-base text-white/28">/ 10</span>
            </>
          ) : (
            <span className="text-[13px] uppercase tracking-[0.1em] text-white/22">Slide to rate</span>
          )}
        </div>

        <input
          type="range"
          className="rs-slider"
          min={0}
          max={10}
          step={0.1}
          value={rating ?? 0}
          onChange={(e) => {
            const n = Number(e.target.value)
            onSelect(n === 0 ? null : Math.max(1, Math.round(n * 10) / 10))
          }}
          style={{ background: trackBg }}
          aria-label="Rating"
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={rating ?? undefined}
        />

        <div className="mt-2.5 flex min-h-[16px] justify-end">
          {hasValue ? (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-[11px] text-white/22 tracking-[0.04em]"
            >
              × Clear rating
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}

function getSaveLabel(scope: ReviewScope) {
  if (scope === "season") return "Save season review"
  if (scope === "episode") return "Save"
  return "Save review"
}

function getDateLabel(scope: ReviewScope) {
  return scope === "season" ? "Finished season" : "Watched"
}

export default function ReviewForm({
  mediaId,
  mediaType,
  scope,
  seasonNumber,
  episodeNumber,
  initialReview = null,
  onSaved,
  compact = false,
  title,
  year,
  posterPath,
  creator,
  aliases,
}: ReviewFormProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState<number | null>(initialReview?.rating ?? null)
  const [body, setBody] = useState(initialReview?.body ?? "")
  const [containsSpoilers, setContainsSpoilers] = useState(Boolean(initialReview?.contains_spoilers))
  const [watchedOn, setWatchedOn] = useState(initialReview?.watched_on ?? "")
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)

  const maxLength = compact ? 280 : 2000

  useEffect(() => {
    setRating(initialReview?.rating ?? null)
    setBody(initialReview?.body ?? "")
    setContainsSpoilers(Boolean(initialReview?.contains_spoilers))
    setWatchedOn(initialReview?.watched_on ?? "")
    setStatus("idle")
    setMessage(null)
  }, [initialReview])

  const trimmedBody = useMemo(() => body.trim(), [body])

  async function handleSave() {
    if (!user?.id) {
      setStatus("error")
      setMessage("Sign in to save reviews.")
      return
    }

    setStatus("saving")
    setMessage(null)

    const { data, error } = await upsertReview(user.id, {
      media_id: mediaId,
      media_type: mediaType,
      review_scope: scope,
      season_number: seasonNumber ?? null,
      episode_number: episodeNumber ?? null,
      rating,
      body: trimmedBody || null,
      contains_spoilers: compact ? false : containsSpoilers,
      watched_on: compact ? null : watchedOn || null,
      title: title || null,
      year: year ?? null,
      poster_path: posterPath ?? null,
      creator: creator ?? null,
    })

    if (error || !data) {
      setStatus("error")
      setMessage(error || "Could not save review.")
      return
    }

    setStatus("success")
    setMessage("Saved.")
    onSaved?.(data)
  }

  async function handleDelete() {
    if (!user?.id || !initialReview) {
      return
    }

    if (!window.confirm("Remove this review?")) {
      return
    }

    setStatus("saving")
    setMessage(null)

    const { error } = await deleteReview(
      user.id,
      mediaId,
      scope,
      seasonNumber ?? null,
      episodeNumber ?? null,
      { aliases }
    )

    if (error) {
      setStatus("error")
      setMessage(error)
      return
    }

    setRating(null)
    setBody("")
    setContainsSpoilers(false)
    setWatchedOn("")
    setStatus("success")
    setMessage("Review removed.")
    onSaved?.(null)
  }

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#0b0c13] p-4 sm:p-5">
      <div className="grid gap-4">
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-white/35">
            {scope === "show"
              ? "Overall view"
              : scope === "season"
                ? `Season ${seasonNumber}`
                : `Season ${seasonNumber} Episode ${episodeNumber}`}
          </p>
          <RatingSlider rating={rating} onSelect={setRating} />
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-white/40">Notes</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, maxLength))}
            rows={compact ? 3 : 5}
            className="mt-2 w-full rounded-[18px] border border-white/10 bg-[#090a10] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/22"
            placeholder={compact ? "Quick note about this episode…" : "What worked, what lingered, and how it all came together."}
          />
          <span className="mt-2 block text-right text-[11px] text-white/30">{body.length}/{maxLength}</span>
        </label>

        {!compact ? (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-white/40">{getDateLabel(scope)}</span>
              <input
                type="date"
                value={watchedOn}
                onChange={(event) => setWatchedOn(event.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#090a10] px-4 text-sm text-white outline-none"
              />
            </label>

            <label className="inline-flex h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white/72">
              <input
                type="checkbox"
                checked={containsSpoilers}
                onChange={(event) => setContainsSpoilers(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent"
              />
              Contains spoilers
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={status === "saving"}
            className="inline-flex h-11 items-center rounded-full bg-white px-5 text-[11px] font-medium uppercase tracking-[0.18em] text-black disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : getSaveLabel(scope)}
          </button>

          {initialReview ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="text-sm text-white/42 underline-offset-4 hover:text-white/72 hover:underline"
            >
              Remove
            </button>
          ) : null}

          {message ? (
            <span
              className={`text-sm ${
                status === "error" ? "text-rose-200" : "text-emerald-200"
              }`}
            >
              {message}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
