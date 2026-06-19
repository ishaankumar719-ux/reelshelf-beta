"use client"

import { useEffect, useState } from "react"
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
  currentUserId,
  initialLikeCount,
  initialSaveCount,
  initialIsLiked,
  initialIsSaved,
}: ListEngagementButtonsProps) {
  const router = useRouter()
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [saveCount, setSaveCount] = useState(initialSaveCount)
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isSaved, setIsSaved] = useState(initialIsSaved)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isSaveLoading, setIsSaveLoading] = useState(false)

  useEffect(() => {
    console.log("ListEngagementButtons mounted and hydrated")
  }, [])

  async function handleLike() {
    console.log("LIKE BUTTON CLICKED")

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
      console.log("LIKE: fetching", method, `/api/lists/${listId}/like`)
      const res = await fetch(`/api/lists/${listId}/like`, { method })
      console.log("LIKE: response status", res.status)
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
        console.error("LIKE: unexpected status", res.status)
        setIsLiked(wasLiked)
        setLikeCount(prevCount)
      }
    } catch (err) {
      console.error("LIKE: fetch threw", err)
      setIsLiked(wasLiked)
      setLikeCount(prevCount)
    } finally {
      setIsLikeLoading(false)
    }
  }

  async function handleSave() {
    console.log("SAVE BUTTON CLICKED")

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
      console.log("SAVE: fetching", method, `/api/lists/${listId}/save`)
      const res = await fetch(`/api/lists/${listId}/save`, { method })
      console.log("SAVE: response status", res.status)
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
        console.error("SAVE: unexpected status", res.status)
        setIsSaved(wasSaved)
        setSaveCount(prevCount)
      }
    } catch (err) {
      console.error("SAVE: fetch threw", err)
      setIsSaved(wasSaved)
      setSaveCount(prevCount)
    } finally {
      setIsSaveLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", gap: "12px", padding: "4px 0" }}>
      <button
        type="button"
        disabled={isLikeLoading}
        style={{
          cursor: isLikeLoading ? "wait" : "pointer",
          zIndex: 10,
          position: "relative",
          padding: "8px 16px",
          border: "1px solid white",
          color: "white",
          background: "transparent",
          fontSize: 14,
          pointerEvents: "auto",
          opacity: isLikeLoading ? 0.5 : 1,
        }}
        onClick={() => void handleLike()}
      >
        {isLiked ? "♥" : "♡"} Like {likeCount}
      </button>
      <button
        type="button"
        disabled={isSaveLoading}
        style={{
          cursor: isSaveLoading ? "wait" : "pointer",
          zIndex: 10,
          position: "relative",
          padding: "8px 16px",
          border: "1px solid white",
          color: "white",
          background: "transparent",
          fontSize: 14,
          pointerEvents: "auto",
          opacity: isSaveLoading ? 0.5 : 1,
        }}
        onClick={() => void handleSave()}
      >
        🔖 Save {saveCount}
      </button>
    </div>
  )
}
