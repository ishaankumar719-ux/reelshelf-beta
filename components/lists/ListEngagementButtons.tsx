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

  const isOwner = currentUserId === ownerId

  async function handleLike() {
    if (!currentUserId) {
      router.push("/login")
      return
    }

    const wasLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!wasLiked)
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1))
    setIsLikeLoading(true)

    const method = wasLiked ? "DELETE" : "POST"
    try {
      const res = await fetch(`/api/lists/${listId}/like`, { method })
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
        setIsLiked(wasLiked)
        setLikeCount(prevCount)
      }
    } catch {
      setIsLiked(wasLiked)
      setLikeCount(prevCount)
    } finally {
      setIsLikeLoading(false)
    }
  }

  async function handleSave() {
    if (!currentUserId) {
      router.push("/login")
      return
    }

    const wasSaved = isSaved
    const prevCount = saveCount
    setIsSaved(!wasSaved)
    setSaveCount((c) => (wasSaved ? c - 1 : c + 1))
    setIsSaveLoading(true)

    const method = wasSaved ? "DELETE" : "POST"
    try {
      const res = await fetch(`/api/lists/${listId}/save`, { method })
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
        setIsSaved(wasSaved)
        setSaveCount(prevCount)
      }
    } catch {
      setIsSaved(wasSaved)
      setSaveCount(prevCount)
    } finally {
      setIsSaveLoading(false)
    }
  }

  // Owner sees static counts — cannot engage with own list
  if (isOwner) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
          ♡ {likeCount}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
          🔖 {saveCount}
        </span>
      </div>
    )
  }

  if (compact) {
    // Compact: used on discovery/profile cards
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
  )
}
