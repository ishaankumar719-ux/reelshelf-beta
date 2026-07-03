"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getMediaHref } from "@/lib/mediaRoutes"
import { followProfile, unfollowProfile } from "@/lib/supabase/social"
import ListCoverCollage from "@/components/lists/ListCoverCollage"
import ListEngagementButtons from "@/components/lists/ListEngagementButtons"
import MediaSearchModal from "@/components/lists/MediaSearchModal"
import type { ListVisibility } from "@/lib/supabase/lists"

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaType = "movie" | "tv" | "book"

interface ListItem {
  id: string
  media_type: MediaType
  media_id: string
  title: string
  poster_url: string | null
  year: string | null
  rank_order: number
  notes: string | null
}

interface ListDetails {
  id: string
  user_id: string
  title: string
  description: string | null
  visibility: ListVisibility
  is_ranked: boolean
  like_count: number
  save_count: number
  created_at: string
}

interface Creator {
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<MediaType, string> = { movie: "Film", tv: "TV", book: "Book" }
const TYPE_LABEL_PLURAL: Record<MediaType, string> = { movie: "Films", tv: "Series", book: "Books" }

const TYPE_BADGE: Record<MediaType, { color: string; bg: string; border: string }> = {
  movie: { color: "rgba(165,180,252,0.9)", bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.25)" },
  tv:    { color: "rgba(94,234,212,0.9)",  bg: "rgba(20,184,166,0.07)", border: "rgba(20,184,166,0.25)" },
  book:  { color: "rgba(252,211,77,0.9)",  bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)" },
}

const AVATAR_PALETTE = ["#1D9E75", "#534AB7", "#D85A30", "#D4537E", "#2563EB", "#7C3AED"]

function seedColor(seed: string): string {
  return AVATAR_PALETTE[seed.charCodeAt(0) % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]
}

function resolvePoster(raw: string | null): string | null {
  if (!raw) return null
  if (raw.startsWith("http")) return raw
  return `https://image.tmdb.org/t/p/w500${raw}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListDetailPage() {
  const router  = useRouter()
  const params  = useParams()
  const listId  = Array.isArray(params.id) ? params.id[0] : params.id

  const [list,           setList]           = useState<ListDetails | null>(null)
  const [items,          setItems]          = useState<ListItem[]>([])
  const [creator,        setCreator]        = useState<Creator | null>(null)
  const [isOwner,        setIsOwner]        = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [notFound,       setNotFound]       = useState(false)
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null)
  const [isLiked,        setIsLiked]        = useState(false)
  const [isSaved,        setIsSaved]        = useState(false)
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [followLoading,  setFollowLoading]  = useState(false)
  const [descExpanded,   setDescExpanded]   = useState(false)
  const [shareCopied,    setShareCopied]    = useState(false)

  // Edit mode
  const [editingMeta,    setEditingMeta]    = useState(false)
  const [editTitle,      setEditTitle]      = useState("")
  const [editDesc,       setEditDesc]       = useState("")
  const [editVisibility, setEditVisibility] = useState<ListVisibility>("public")
  const [editRanked,     setEditRanked]     = useState(true)
  const [metaSaving,     setMetaSaving]     = useState(false)

  // Add media
  const [searchOpen, setSearchOpen] = useState(false)

  // Desktop HTML5 DnD state
  const [draggedIndex,   setDraggedIndex]   = useState<number | null>(null)

  // Touch DnD state
  const [touchDragIdx,   setTouchDragIdx]   = useState<number | null>(null)

  // Mobile overflow menu
  const [overflowMenuIdx, setOverflowMenuIdx] = useState<number | null>(null)

  // ── Refs ──────────────────────────────────────────────────────────────────

  const itemsRef        = useRef<ListItem[]>([])
  const isOwnerRef      = useRef(false)
  const isDraggingTouch = useRef(false)
  const touchDragIdxRef = useRef<number | null>(null)
  const itemElsRef      = useRef<(HTMLElement | null)[]>([])

  useEffect(() => { isOwnerRef.current = isOwner }, [isOwner])

  function updateItems(next: ListItem[]) {
    itemsRef.current = next
    setItems(next)
  }

  // ── Document-level touch handlers ─────────────────────────────────────────

  useEffect(() => {
    function getTargetIndex(clientY: number): number {
      const els = itemElsRef.current
      for (let i = 0; i < els.length; i++) {
        const el = els[i]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (clientY < rect.top + rect.height / 2) return i
      }
      return Math.max(0, els.filter(Boolean).length - 1)
    }

    function onDocTouchMove(e: TouchEvent) {
      if (!isDraggingTouch.current) return
      e.preventDefault()

      const touch = e.touches[0]
      const clientY = touch.clientY

      const EDGE = 80
      const vh = window.innerHeight
      if (clientY < EDGE) {
        window.scrollBy(0, -Math.max(2, Math.round((EDGE - clientY) / 5)))
      } else if (clientY > vh - EDGE) {
        window.scrollBy(0, Math.max(2, Math.round((clientY - (vh - EDGE)) / 5)))
      }

      const targetIdx = getTargetIndex(clientY)
      const currentIdx = touchDragIdxRef.current

      if (currentIdx !== null && targetIdx !== currentIdx) {
        const reordered = [...itemsRef.current]
        const [removed] = reordered.splice(currentIdx, 1)
        reordered.splice(targetIdx, 0, removed)
        const withRanks = reordered.map((it, i) => ({ ...it, rank_order: i + 1 }))
        itemsRef.current = withRanks
        setItems(withRanks)
        touchDragIdxRef.current = targetIdx
        setTouchDragIdx(targetIdx)
      }
    }

    function onDocTouchEnd() {
      if (!isDraggingTouch.current) return
      isDraggingTouch.current = false
      touchDragIdxRef.current = null
      setTouchDragIdx(null)

      if (!isOwnerRef.current) return
      const finalItems = itemsRef.current
      if (finalItems.length === 0) return

      void (async () => {
        const supabase = createClient()
        if (!supabase) return
        await supabase.rpc("update_list_items_order", {
          payload: finalItems.map((it) => ({ id: it.id, rank_order: it.rank_order })),
        })
      })()
    }

    document.addEventListener("touchmove", onDocTouchMove, { passive: false })
    document.addEventListener("touchend",  onDocTouchEnd,  { passive: true })
    return () => {
      document.removeEventListener("touchmove", onDocTouchMove)
      document.removeEventListener("touchend",  onDocTouchEnd)
    }
  }, [])

  // ── Close overflow menu on outside tap ────────────────────────────────────

  useEffect(() => {
    if (overflowMenuIdx === null) return
    function onOutside(e: PointerEvent) {
      const target = e.target as HTMLElement
      if (
        !target.closest("[data-overflow-menu]") &&
        !target.closest("[data-overflow-trigger]")
      ) {
        setOverflowMenuIdx(null)
      }
    }
    document.addEventListener("pointerdown", onOutside)
    return () => document.removeEventListener("pointerdown", onOutside)
  }, [overflowMenuIdx])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!listId) return
    const supabase = createClient()
    if (!supabase) { setNotFound(true); return }

    setLoading(true)

    const [
      { data: { user } },
      { data: listData, error: listErr },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("user_lists")
        .select("id, user_id, title, description, visibility, is_ranked, like_count, save_count, created_at")
        .eq("id", listId)
        .single(),
    ])

    if (listErr || !listData) { setNotFound(true); setLoading(false); return }

    const owned = user?.id === listData.user_id
    if (listData.visibility === "private" && !owned) { setNotFound(true); setLoading(false); return }

    const [
      { data: itemsData },
      { data: profileData },
      { data: likeRow },
      { data: saveRow },
      { data: followRow },
    ] = await Promise.all([
      supabase
        .from("user_list_items")
        .select("id, media_type, media_id, title, poster_url, year, rank_order, notes")
        .eq("list_id", listId)
        .order("rank_order", { ascending: true }),
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", listData.user_id)
        .single(),
      user && !owned
        ? supabase.from("list_likes").select("id").eq("list_id", listId).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      user && !owned
        ? supabase.from("list_saves").select("id").eq("list_id", listId).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      user && !owned
        ? supabase.from("followers").select("follower_id").eq("follower_id", user.id).eq("following_id", listData.user_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const fetchedItems = (itemsData ?? []) as ListItem[]
    itemsRef.current = fetchedItems
    setList(listData)
    setItems(fetchedItems)
    setCreator(profileData as Creator | null)
    setIsOwner(owned)
    setCurrentUserId(user?.id ?? null)
    setIsLiked(likeRow !== null)
    setIsSaved(saveRow !== null)
    setIsFollowing(followRow !== null)
    setEditTitle(listData.title)
    setEditDesc(listData.description ?? "")
    setEditVisibility(listData.visibility)
    setEditRanked(listData.is_ranked)
    setLoading(false)
  }, [listId])

  useEffect(() => { void fetchAll() }, [fetchAll])

  // ── Metadata save ──────────────────────────────────────────────────────────

  async function saveMetadata() {
    if (!list) return
    const supabase = createClient()
    if (!supabase) return
    setMetaSaving(true)
    const { error } = await supabase
      .from("user_lists")
      .update({ title: editTitle.trim(), description: editDesc.trim() || null, visibility: editVisibility, is_ranked: editRanked, updated_at: new Date().toISOString() })
      .eq("id", list.id)
    if (!error) {
      setList({ ...list, title: editTitle.trim(), description: editDesc.trim() || null, visibility: editVisibility, is_ranked: editRanked })
      setEditingMeta(false)
    }
    setMetaSaving(false)
  }

  // ── Delete list ────────────────────────────────────────────────────────────

  async function deleteList() {
    if (!list) return
    if (!window.confirm("Delete this list permanently?")) return
    const supabase = createClient()
    if (!supabase) return
    const { error } = await supabase.from("user_lists").delete().eq("id", list.id)
    if (!error) router.push("/profile")
  }

  // ── Remove item ────────────────────────────────────────────────────────────

  async function removeItem(itemId: string) {
    const supabase = createClient()
    if (!supabase) return
    const { error } = await supabase.from("user_list_items").delete().eq("id", itemId)
    if (!error) {
      const updated = items
        .filter((it) => it.id !== itemId)
        .map((it, idx) => ({ ...it, rank_order: idx + 1 }))
      updateItems(updated)
      if (updated.length > 0) {
        await supabase.rpc("update_list_items_order", {
          payload: updated.map((it) => ({ id: it.id, rank_order: it.rank_order })),
        })
      }
    }
  }

  // ── Follow / Unfollow ─────────────────────────────────────────────────────

  async function handleFollow() {
    if (!list || !currentUserId) { router.push("/login"); return }
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowLoading(true)
    try {
      const result = wasFollowing
        ? await unfollowProfile(list.user_id)
        : await followProfile(list.user_id)
      if (result.error) setIsFollowing(wasFollowing)
    } catch {
      setIsFollowing(wasFollowing)
    } finally {
      setFollowLoading(false)
    }
  }

  // ── Share ─────────────────────────────────────────────────────────────────

  async function handleShare() {
    const url = window.location.href
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: list?.title ?? "ReelShelf List", url }) } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } catch { /* ignore */ }
    }
  }

  // ── Desktop HTML5 DnD ─────────────────────────────────────────────────────

  function handleDragStart(index: number) {
    if (!isOwner) return
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index || !isOwner) return

    const reordered = [...items]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, removed)

    setItems(reordered.map((it, idx) => ({ ...it, rank_order: idx + 1 })))
    setDraggedIndex(index)
  }

  async function handleDragEnd() {
    if (draggedIndex === null) return
    setDraggedIndex(null)
    if (!isOwner || items.length === 0) return

    const supabase = createClient()
    if (!supabase) return
    await supabase.rpc("update_list_items_order", {
      payload: items.map((it) => ({ id: it.id, rank_order: it.rank_order })),
    })
  }

  function handleGripTouchStart(e: React.TouchEvent, index: number) {
    if (!isOwner) return
    e.preventDefault()
    isDraggingTouch.current = true
    touchDragIdxRef.current = index
    setTouchDragIdx(index)
  }

  // ── Overflow menu ─────────────────────────────────────────────────────────

  async function moveItem(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= items.length || fromIdx === toIdx) return
    const reordered = [...items]
    const [removed] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, removed)
    const withRanks = reordered.map((it, i) => ({ ...it, rank_order: i + 1 }))
    updateItems(withRanks)
    setOverflowMenuIdx(null)
    const supabase = createClient()
    if (!supabase) return
    await supabase.rpc("update_list_items_order", {
      payload: withRanks.map((it) => ({ id: it.id, rank_order: it.rank_order })),
    })
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--rs-surface-base)" }}>
        {/* Hero skeleton */}
        <div className="rs-skeleton" style={{ width: "100%", height: "clamp(320px, 42vh, 520px)" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px 0" }}>
          {/* Creator row skeleton */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div className="rs-skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="rs-skeleton" style={{ width: 64, height: 8, borderRadius: 4 }} />
              <div className="rs-skeleton" style={{ width: 120, height: 13, borderRadius: 4 }} />
            </div>
          </div>
          {/* Description skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            <div className="rs-skeleton" style={{ height: 12, width: "88%", borderRadius: 4 }} />
            <div className="rs-skeleton" style={{ height: 12, width: "72%", borderRadius: 4 }} />
            <div className="rs-skeleton" style={{ height: 12, width: "55%", borderRadius: 4 }} />
          </div>
          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 28 }} />
          {/* Item skeletons */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12, padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(13,13,20,0.6)" }}>
              <div className="rs-skeleton" style={{ width: 28, height: 13, borderRadius: 4, flexShrink: 0 }} />
              <div className="rs-skeleton" style={{ width: 52, height: 78, borderRadius: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="rs-skeleton" style={{ height: 14, width: "60%", borderRadius: 4 }} />
                <div className="rs-skeleton" style={{ height: 10, width: "30%", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !list) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500 text-sm">This list doesn&apos;t exist or is private.</p>
        <Link href="/profile" className="text-xs text-zinc-600 underline underline-offset-4">Go back</Link>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const creatorName   = creator?.display_name || creator?.username || "Someone"
  const creatorHref   = creator?.username ? `/u/${encodeURIComponent(creator.username)}` : null
  const creatorSeed   = creator?.username ?? creator?.display_name ?? "?"
  const creatorInitial = creatorSeed[0]?.toUpperCase() ?? "?"
  const avatarBg      = seedColor(creatorSeed)
  const bgPoster      = resolvePoster(items[0]?.poster_url ?? null)

  const mediaCounts = items.reduce<Partial<Record<MediaType, number>>>((acc, item) => {
    acc[item.media_type] = (acc[item.media_type] ?? 0) + 1
    return acc
  }, {})
  const mediaBreakdown = (Object.entries(mediaCounts) as [MediaType, number][])
    .map(([type, count]) => `${count} ${count === 1 ? TYPE_LABEL[type] : TYPE_LABEL_PLURAL[type]}`)
    .join(" · ")

  const showDescToggle = (list.description?.length ?? 0) > 120

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--rs-surface-base)" }}>
      <style>{`
        @keyframes rs-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @media (prefers-reduced-motion: reduce) {
          .rs-list-item { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {/* ── Cinematic hero ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ height: "clamp(360px, 44vh, 540px)", background: "var(--rs-surface-base)" }}
      >
        {/* Blurred backdrop */}
        {bgPoster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgPoster}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "-8%",
              width: "116%",
              height: "116%",
              objectFit: "cover",
              filter: "blur(48px) saturate(0.45) brightness(0.2)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        )}

        {/* Gradient vignette */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(7,7,11,0.08) 0%, rgba(7,7,11,0) 28%, rgba(7,7,11,0.6) 68%, rgba(7,7,11,0.98) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Collage card — centered horizontally, anchored to upper portion */}
        <div
          className="absolute left-1/2"
          style={{
            top: "14%",
            transform: "translateX(-50%)",
            width: "clamp(160px, 28vw, 232px)",
            height: "clamp(160px, 28vw, 232px)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.75), 0 8px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)",
          }}
        >
          <ListCoverCollage
            items={items.slice(0, 4).map((i) => ({
              url: i.poster_url,
              alt: `${TYPE_LABEL[i.media_type] ?? "Cover"} — ${i.title}`,
            }))}
          />
        </div>

        {/* Bottom overlay: eyebrow + title */}
        <div
          className="absolute left-0 right-0 bottom-0 text-center"
          style={{ padding: "0 var(--rs-gutter) 28px" }}
        >
          {/* Badge row */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: list.is_ranked ? "rgba(251,191,36,0.88)" : "rgba(255,255,255,0.45)",
                background: "rgba(7,7,11,0.72)",
                border: `0.5px solid ${list.is_ranked ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.12)"}`,
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: 5,
                padding: "3px 9px",
              }}
            >
              {list.is_ranked ? "Ranked List" : "Collection"}
            </span>

            {list.visibility === "private" && (
              <span
                style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase",
                  color: "rgba(248,113,113,0.9)", background: "rgba(7,7,11,0.72)",
                  border: "0.5px solid rgba(248,113,113,0.25)", backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)", borderRadius: 5, padding: "3px 9px",
                }}
              >
                🔒 Private
              </span>
            )}

            {list.visibility === "unlisted" && (
              <span
                style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase",
                  color: "rgba(147,197,253,0.85)", background: "rgba(7,7,11,0.72)",
                  border: "0.5px solid rgba(147,197,253,0.2)", backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)", borderRadius: 5, padding: "3px 9px",
                }}
              >
                🔗 Unlisted
              </span>
            )}

            {mediaBreakdown && (
              <span
                style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.07em",
                  color: "rgba(255,255,255,0.32)",
                }}
              >
                {mediaBreakdown}
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "var(--rs-text-display)",
              fontWeight: 800,
              color: "rgba(255,255,255,0.95)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 28px rgba(0,0,0,0.9)",
              margin: 0,
              maxWidth: 640,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {list.title}
          </h1>
        </div>
      </div>

      {/* ── Header info (creator, description, actions) ──────────────────── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px var(--rs-gutter) 0" }}>

        {/* Creator row */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div
              style={{
                width: 38, height: 38, borderRadius: "50%",
                background: avatarBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700, color: "#fff",
                flexShrink: 0, overflow: "hidden",
              }}
            >
              {creator?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatar_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                creatorInitial
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "rgba(255,255,255,0.32)",
                  margin: "0 0 2px",
                }}
              >
                Curated by
              </p>
              {creatorHref ? (
                <Link
                  href={creatorHref}
                  style={{
                    fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)",
                    textDecoration: "none", display: "block",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                  className="hover:text-white transition-colors"
                >
                  {creator?.display_name ?? `@${creator?.username}`}
                </Link>
              ) : (
                <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", margin: 0 }}>
                  {creatorName}
                </p>
              )}
            </div>
          </div>

          {/* Follow button */}
          {!isOwner && currentUserId && (
            <button
              type="button"
              onClick={() => void handleFollow()}
              disabled={followLoading}
              style={{
                padding: "7px 18px",
                borderRadius: "var(--rs-radius-button)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.01em",
                border: isFollowing ? "1px solid rgba(255,255,255,0.18)" : "none",
                background: isFollowing ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.92)",
                color: isFollowing ? "rgba(255,255,255,0.6)" : "#07070b",
                cursor: followLoading ? "wait" : "pointer",
                opacity: followLoading ? 0.55 : 1,
                transition: "all 0.15s ease",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Description (expandable) */}
        {list.description && (
          <div style={{ marginBottom: 22 }}>
            <p
              style={{
                fontSize: "var(--rs-body)",
                color: "rgba(255,255,255,0.52)",
                lineHeight: 1.7,
                margin: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: descExpanded ? "unset" : 3,
              } as React.CSSProperties}
            >
              {list.description}
            </p>
            {showDescToggle && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: "rgba(255,255,255,0.38)",
                  marginTop: 6, background: "none", border: "none",
                  cursor: "pointer", padding: 0,
                  transition: "color 0.15s",
                }}
                className="hover:text-white/60"
              >
                {descExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* Action bar: Like / Save / Share */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <ListEngagementButtons
            listId={list.id}
            ownerId={list.user_id}
            currentUserId={currentUserId}
            initialLikeCount={list.like_count}
            initialSaveCount={list.save_count}
            initialIsLiked={isLiked}
            initialIsSaved={isSaved}
            compact={false}
          />
          <button
            type="button"
            onClick={() => void handleShare()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px",
              borderRadius: "var(--rs-radius-button)",
              fontSize: 12, fontWeight: 600,
              background: shareCopied ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${shareCopied ? "rgba(29,158,117,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: shareCopied ? "rgba(94,234,212,0.9)" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {shareCopied ? "✓ Copied" : "↗ Share"}
          </button>
        </div>

        {/* Owner controls */}
        {isOwner && !editingMeta && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              type="button"
              onClick={() => setEditingMeta(true)}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 600,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)", borderRadius: 9, cursor: "pointer",
                transition: "all 0.15s",
              }}
              className="hover:bg-white/10 hover:text-white/80"
            >
              Edit settings
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 700,
                background: "rgba(255,255,255,0.92)", border: "none",
                color: "#07070b", borderRadius: 9, cursor: "pointer",
                transition: "all 0.15s",
              }}
              className="hover:bg-white"
            >
              + Add media
            </button>
            <button
              type="button"
              onClick={() => void deleteList()}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 600,
                background: "transparent", border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.28)", borderRadius: 9, cursor: "pointer",
                transition: "all 0.15s",
                marginLeft: "auto",
              }}
              className="hover:border-red-900/50 hover:text-red-400 hover:bg-red-950/20"
            >
              Delete list
            </button>
          </div>
        )}

        {/* Edit form */}
        {editingMeta && (
          <div
            style={{
              background: "rgba(13,13,20,0.9)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: 20, marginBottom: 24,
            }}
          >
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={100}
              placeholder="List title"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 p-2.5 rounded-lg text-white text-sm outline-none transition-colors mb-3"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              placeholder="Description (optional)"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 p-2.5 rounded-lg text-white text-sm outline-none resize-none transition-colors mb-3"
            />
            <div className="flex gap-3 flex-wrap mb-4">
              <VisibilityPicker value={editVisibility} onChange={setEditVisibility} />
              <SegPair labelA="Ranked" labelB="Unranked" active={editRanked} onChange={setEditRanked} />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void saveMetadata()}
                disabled={metaSaving || !editTitle.trim()}
                className="flex-1 bg-white text-black font-semibold py-2 rounded-lg text-xs transition hover:bg-zinc-200 disabled:opacity-40"
              >
                {metaSaving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditingMeta(false)}
                className="flex-1 bg-zinc-900 text-zinc-400 py-2 rounded-lg text-xs border border-zinc-800 transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)", marginBottom: 28 }} />

        {/* ── Items ────────────────────────────────────────────────────────── */}
        {items.length === 0 ? (
          <div
            style={{
              padding: "52px 24px",
              textAlign: "center",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 16,
              background: "rgba(13,13,20,0.5)",
            }}
          >
            <p style={{ fontSize: "var(--rs-text-body)", color: "rgba(255,255,255,0.4)", fontWeight: 500, margin: "0 0 8px" }}>
              This list is empty.
            </p>
            <p style={{ fontSize: "var(--rs-text-caption)", color: "rgba(255,255,255,0.22)", margin: "0 0 20px", lineHeight: 1.6 }}>
              Add your favourite films, series, or books to build this collection.
            </p>
            {isOwner && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                style={{
                  padding: "9px 20px", fontSize: 12, fontWeight: 700,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)", borderRadius: 9, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Add your first item
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Section eyebrow + drag hint */}
            {isOwner && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span
                  style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "rgba(255,255,255,0.28)",
                  }}
                >
                  {list.is_ranked ? "Ranking" : "Custom Order"}
                </span>
                {list.is_ranked && (
                  <>
                    <span className="hidden md:inline" style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>
                      Drag to reorder
                    </span>
                    <span className="md:hidden" style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>
                      Hold ⠿ to drag · Tap ⋮ to rearrange
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              {items.map((item, index) => {
                const mediaHref     = getMediaHref({ id: item.media_id, mediaType: item.media_type })
                const isHtml5Dragging = draggedIndex === index
                const isTouchDragging = touchDragIdx === index
                const badge           = TYPE_BADGE[item.media_type]

                return (
                  <div
                    key={item.id}
                    ref={(el) => { itemElsRef.current[index] = el }}
                    draggable={isOwner}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={() => void handleDragEnd()}
                    className={[
                      "rs-list-item group flex items-center gap-3 rounded-xl border transition-all",
                      isTouchDragging
                        ? "border-zinc-500 shadow-2xl relative z-10"
                        : isHtml5Dragging
                          ? "opacity-40 border-zinc-700 scale-[0.98]"
                          : "border-zinc-900/80 hover:border-zinc-800",
                      isOwner && !isTouchDragging ? "cursor-grab active:cursor-grabbing" : "",
                    ].join(" ")}
                    style={{
                      padding: "12px 14px",
                      background: isTouchDragging
                        ? "rgba(30,30,46,0.95)"
                        : "rgba(13,13,20,0.8)",
                      transform: isTouchDragging ? "scale(1.02)" : undefined,
                      boxShadow: isTouchDragging ? "0 20px 48px rgba(0,0,0,0.72)" : undefined,
                      animationName: "rs-fade-up",
                      animationDuration: "0.35s",
                      animationTimingFunction: "cubic-bezier(0.2,0,0.1,1)",
                      animationFillMode: "both",
                      animationDelay: `${Math.min(index * 35, 280)}ms`,
                    }}
                  >
                    {/* Mobile grip — ranked only */}
                    {isOwner && list.is_ranked && (
                      <div
                        className="flex md:hidden items-center justify-center shrink-0 select-none"
                        style={{ width: 44, height: 44, touchAction: "none", cursor: "grab" }}
                        onTouchStart={(e) => handleGripTouchStart(e, index)}
                        aria-label="Drag to reorder"
                      >
                        <span
                          style={{
                            fontSize: 20, lineHeight: 1, userSelect: "none",
                            color: isTouchDragging ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                            transition: "color 0.15s",
                          }}
                        >
                          ⠿
                        </span>
                      </div>
                    )}

                    {/* Rank number */}
                    {list.is_ranked && (
                      <div
                        className="shrink-0 select-none text-right"
                        style={{
                          width: 28,
                          fontSize: item.rank_order <= 9 ? 18 : 14,
                          fontWeight: 900,
                          letterSpacing: "-0.04em",
                          fontVariantNumeric: "tabular-nums",
                          color: item.rank_order <= 3
                            ? "rgba(251,191,36,0.65)"
                            : "rgba(255,255,255,0.18)",
                          transition: "color 0.15s",
                        }}
                      >
                        {item.rank_order}
                      </div>
                    )}

                    {/* Desktop drag handle */}
                    {isOwner && list.is_ranked && (
                      <div className="hidden md:flex flex-col gap-0.5 shrink-0 opacity-30 group-hover:opacity-70 transition-opacity">
                        <span className="block w-3 h-px bg-zinc-400" />
                        <span className="block w-3 h-px bg-zinc-400" />
                        <span className="block w-3 h-px bg-zinc-400" />
                      </div>
                    )}

                    {/* Poster */}
                    <button
                      type="button"
                      onClick={() => router.push(mediaHref)}
                      className="shrink-0 focus:outline-none"
                      style={{
                        width: 52,
                        aspectRatio: "2/3",
                        borderRadius: 7,
                        overflow: "hidden",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer",
                      }}
                      aria-label={`Go to ${item.title}`}
                      tabIndex={-1}
                    >
                      {item.poster_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.poster_url}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: 0.18 }}>
                          🎬
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => router.push(mediaHref)}
                        className="text-left w-full focus:outline-none"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.9)",
                            margin: 0,
                            lineHeight: 1.35,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          } as React.CSSProperties}
                          className="group-hover:text-white transition-colors"
                        >
                          {item.title}
                        </p>
                      </button>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                        {item.year && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>
                            {item.year}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: badge?.color ?? "rgba(255,255,255,0.35)",
                            background: badge?.bg ?? "transparent",
                            border: `0.5px solid ${badge?.border ?? "rgba(255,255,255,0.1)"}`,
                            borderRadius: 4,
                            padding: "2px 6px",
                          }}
                        >
                          {TYPE_LABEL[item.media_type]}
                        </span>
                      </div>

                      {item.notes && (
                        <p
                          style={{
                            fontSize: 11,
                            fontStyle: "italic",
                            color: "rgba(255,255,255,0.32)",
                            margin: "5px 0 0",
                            lineHeight: 1.55,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          } as React.CSSProperties}
                        >
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Desktop remove button */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => void removeItem(item.id)}
                        aria-label={`Remove ${item.title}`}
                        className="hidden md:block p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        ✕
                      </button>
                    )}

                    {/* Mobile overflow — ranked only */}
                    {isOwner && list.is_ranked && (
                      <div className="relative md:hidden shrink-0" data-overflow-trigger="true">
                        <button
                          type="button"
                          data-overflow-trigger="true"
                          onClick={() => setOverflowMenuIdx(overflowMenuIdx === index ? null : index)}
                          className="flex items-center justify-center text-zinc-500 active:text-zinc-200 transition-colors"
                          style={{ width: 36, height: 44, fontSize: 20, lineHeight: 1 }}
                          aria-label="More options"
                          aria-expanded={overflowMenuIdx === index}
                        >
                          ⋮
                        </button>

                        {overflowMenuIdx === index && (
                          <div
                            data-overflow-menu="true"
                            className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
                            style={{ minWidth: 160, zIndex: 50 }}
                          >
                            {(
                              [
                                { label: "Move Up",        toIdx: index - 1,        disabled: index === 0 },
                                { label: "Move Down",      toIdx: index + 1,        disabled: index === items.length - 1 },
                                { label: "Move to Top",    toIdx: 0,                disabled: index === 0 },
                                { label: "Move to Bottom", toIdx: items.length - 1, disabled: index === items.length - 1 },
                              ] as const
                            ).map(({ label, toIdx, disabled }) => (
                              <button
                                key={label}
                                type="button"
                                disabled={disabled}
                                onClick={() => { if (!disabled) void moveItem(index, toIdx) }}
                                className={[
                                  "w-full text-left px-4 py-3 text-sm border-b border-zinc-800/60 last:border-b-0 transition-colors",
                                  disabled
                                    ? "text-zinc-700 cursor-default"
                                    : "text-zinc-300 active:bg-zinc-700 hover:bg-zinc-800 hover:text-white",
                                ].join(" ")}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Media search modal ────────────────────────────────────────────── */}
      {searchOpen && (
        <MediaSearchModal
          listId={list.id}
          nextRank={items.length + 1}
          existingMediaIds={items.map((i) => i.media_id)}
          onClose={() => {
            setSearchOpen(false)
            void fetchAll()
          }}
        />
      )}
    </main>
  )
}

// ── Visibility picker ────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: { value: ListVisibility; label: string }[] = [
  { value: "public",   label: "Public" },
  { value: "private",  label: "Private" },
  { value: "unlisted", label: "Unlisted" },
]

function VisibilityPicker({
  value,
  onChange,
}: {
  value: ListVisibility
  onChange: (v: ListVisibility) => void
}) {
  return (
    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
      {VISIBILITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "px-3 py-1 text-xs font-semibold rounded-md transition-all",
            value === opt.value
              ? "bg-zinc-700 text-white border border-zinc-600/50"
              : "text-zinc-500 hover:text-zinc-300",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Segmented pair ───────────────────────────────────────────────────────────

function SegPair({
  labelA,
  labelB,
  active,
  onChange,
}: {
  labelA: string
  labelB: string
  active: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
      {[{ label: labelA, val: true }, { label: labelB, val: false }].map(({ label, val }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(val)}
          className={[
            "px-3 py-1 text-xs font-semibold rounded-md transition-all",
            active === val
              ? "bg-zinc-700 text-white border border-zinc-600/50"
              : "text-zinc-500 hover:text-zinc-300",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
