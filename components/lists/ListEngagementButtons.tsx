"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

interface ListEngagementButtonsProps {
  listId: string
  ownerId: string
  currentUserId: string | null
  initialLikeCount: number
  initialSaveCount: number
  initialIsLiked: boolean
  initialIsSaved: boolean
  /** compact=true for cards, compact=false for detail page */
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
  compact = true,
}: ListEngagementButtonsProps) {
  const router = useRouter()
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [saveCount, setSaveCount] = useState(initialSaveCount)
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [heartAnimate, setHeartAnimate] = useState(false)
  const [bookmarkAnimate, setBookmarkAnimate] = useState(false)

  const isOwner = currentUserId === ownerId
  const iconSize = compact ? 10 : 15
  const fontSize = compact ? 10 : 13
  const gap = compact ? 10 : 16

  function triggerAnimate(setter: (v: boolean) => void) {
    setter(true)
    setTimeout(() => setter(false), 250)
  }

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUserId) {
      router.push("/login")
      return
    }

    const wasLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!wasLiked)
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1))
    triggerAnimate(setHeartAnimate)

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
    }
  }

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!currentUserId) {
      router.push("/login")
      return
    }

    const wasSaved = isSaved
    const prevCount = saveCount
    setIsSaved(!wasSaved)
    setSaveCount((c) => (wasSaved ? c - 1 : c + 1))
    triggerAnimate(setBookmarkAnimate)

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
    }
  }

  const heartColor = isLiked ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.3)"
  const bookmarkColor = isSaved ? "rgba(96,165,250,0.9)" : "rgba(255,255,255,0.3)"

  // Owner sees static counts only
  if (isOwner) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap, fontFamily: FONT }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.22)", fontSize, fontFamily: FONT }}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likeCount}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.22)", fontSize, fontFamily: FONT }}>
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {saveCount}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap, fontFamily: FONT }}>
      {/* Heart / Like */}
      <button
        type="button"
        onClick={(e) => void handleLike(e)}
        title={isLiked ? "Unlike" : "Like"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: heartColor,
          fontSize,
          fontFamily: FONT,
          fontWeight: 600,
          transform: heartAnimate ? "scale(1.4)" : "scale(1)",
          transformOrigin: "center",
          transition: "transform 0.15s ease, color 0.15s",
        }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {likeCount}
      </button>

      {/* Bookmark / Save */}
      <button
        type="button"
        onClick={(e) => void handleSave(e)}
        title={isSaved ? "Unsave" : "Save"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: bookmarkColor,
          fontSize,
          fontFamily: FONT,
          fontWeight: 600,
          transform: bookmarkAnimate ? "scale(1.4)" : "scale(1)",
          transformOrigin: "center",
          transition: "transform 0.15s ease, color 0.15s",
        }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {saveCount}
      </button>
    </div>
  )
}
