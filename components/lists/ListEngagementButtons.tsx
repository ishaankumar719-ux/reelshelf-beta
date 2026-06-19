"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface ListEngagementButtonsProps {
  listId: string
  ownerId: string
  currentUserId: string | null
  initialLikeCount: number
  initialSaveCount: number
  initialIsLiked: boolean
  initialIsSaved: boolean
  compact?: boolean
}

type EngagementResponse = { like_count: number; save_count: number }

export default function ListEngagementButtons({
  listId,
  ownerId,
  currentUserId,
  initialLikeCount,
  initialSaveCount,
  initialIsLiked,
  initialIsSaved,
  compact = false,
}: ListEngagementButtonsProps) {
  const router = useRouter()
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [saveCount, setSaveCount] = useState(initialSaveCount)
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isSaveLoading, setIsSaveLoading] = useState(false)
  const [likeError, setLikeError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isOwner = currentUserId === ownerId

  async function handleLike() {
    if (!currentUserId) {
      router.push("/login")
      return
    }

    setLikeError(null)
    const wasLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!wasLiked)
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1))
    setIsLikeLoading(true)

    const method = wasLiked ? "DELETE" : "POST"
    try {
      const res = await fetch(`/api/lists/${listId}/like`, { method })
      console.log("[LIKE] response status:", res.status)
      if (res.ok) {
        const data = (await res.json()) as EngagementResponse
        setLikeCount(data.like_count)
        setSaveCount(data.save_count)
      } else if (res.status === 401) {
        setIsLiked(wasLiked)
        setLikeCount(prevCount)
        router.push("/login")
      } else if (res.status === 409) {
        setIsLiked(true)
      } else {
        const body = await res.text()
        console.error("[LIKE] failed:", res.status, body)
        setIsLiked(wasLiked)
        setLikeCount(prevCount)
        setLikeError("Couldn't update — try again")
      }
    } catch (err) {
      console.error("[LIKE] fetch threw:", err)
      setIsLiked(wasLiked)
      setLikeCount(prevCount)
      setLikeError("Couldn't update — try again")
    } finally {
      setIsLikeLoading(false)
    }
  }

  async function handleSave() {
    if (!currentUserId) {
      router.push("/login")
      return
    }

    setSaveError(null)
    const wasSaved = isSaved
    const prevCount = saveCount
    setIsSaved(!wasSaved)
    setSaveCount((c) => (wasSaved ? c - 1 : c + 1))
    setIsSaveLoading(true)

    const method = wasSaved ? "DELETE" : "POST"
    try {
      const res = await fetch(`/api/lists/${listId}/save`, { method })
      console.log("[SAVE] response status:", res.status)
      if (res.ok) {
        const data = (await res.json()) as EngagementResponse
        setLikeCount(data.like_count)
        setSaveCount(data.save_count)
      } else if (res.status === 401) {
        setIsSaved(wasSaved)
        setSaveCount(prevCount)
        router.push("/login")
      } else if (res.status === 409) {
        setIsSaved(true)
      } else {
        const body = await res.text()
        console.error("[SAVE] failed:", res.status, body)
        setIsSaved(wasSaved)
        setSaveCount(prevCount)
        setSaveError("Couldn't update — try again")
      }
    } catch (err) {
      console.error("[SAVE] fetch threw:", err)
      setIsSaved(wasSaved)
      setSaveCount(prevCount)
      setSaveError("Couldn't update — try again")
    } finally {
      setIsSaveLoading(false)
    }
  }

  // Owner sees static counts — cannot engage with own list
  if (isOwner) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 select-none">
          ♡ {likeCount}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 select-none">
          🔖 {saveCount}
        </span>
        {!compact && (
          <span className="text-[10px] text-zinc-700 select-none">· your list</span>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={isLiked ? "Unlike this list" : "Like this list"}
          disabled={isLikeLoading}
          onClick={() => void handleLike()}
          className={[
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors",
            isLiked
              ? "bg-red-950/30 border-red-900/50 text-red-400 hover:bg-red-950/50"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300",
            isLikeLoading ? "opacity-50 cursor-wait" : "cursor-pointer",
          ].join(" ")}
        >
          {isLiked ? "♥" : "♡"} {likeCount}
        </button>
        <button
          type="button"
          aria-label={isSaved ? "Unsave this list" : "Save this list"}
          disabled={isSaveLoading}
          onClick={() => void handleSave()}
          className={[
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors",
            isSaved
              ? "bg-blue-950/30 border-blue-900/50 text-blue-400 hover:bg-blue-950/50"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300",
            isSaveLoading ? "opacity-50 cursor-wait" : "cursor-pointer",
          ].join(" ")}
        >
          🔖 {saveCount}
        </button>
      </div>
    )
  }

  // Full size: list detail page
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={isLiked ? "Unlike this list" : "Like this list"}
          disabled={isLikeLoading}
          onClick={() => void handleLike()}
          className={[
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
            isLiked
              ? "bg-red-950/30 border-red-900/50 text-red-400 hover:bg-red-950/50"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300",
            isLikeLoading ? "opacity-50 cursor-wait" : "cursor-pointer",
          ].join(" ")}
        >
          {isLiked ? "♥" : "♡"}
          <span>{isLiked ? "Liked" : "Like"}{likeCount > 0 ? ` · ${likeCount}` : ""}</span>
        </button>
        <button
          type="button"
          aria-label={isSaved ? "Unsave this list" : "Save this list"}
          disabled={isSaveLoading}
          onClick={() => void handleSave()}
          className={[
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
            isSaved
              ? "bg-blue-950/30 border-blue-900/50 text-blue-400 hover:bg-blue-950/50"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300",
            isSaveLoading ? "opacity-50 cursor-wait" : "cursor-pointer",
          ].join(" ")}
        >
          🔖
          <span>{isSaved ? "Saved" : "Save"}{saveCount > 0 ? ` · ${saveCount}` : ""}</span>
        </button>
      </div>
      {(likeError || saveError) && (
        <p className="text-[11px] text-red-400">
          {likeError ?? saveError}
        </p>
      )}
    </div>
  )
}
