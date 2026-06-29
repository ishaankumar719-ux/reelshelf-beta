"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getMediaHref } from "@/lib/mediaRoutes"
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

const TYPE_LABEL: Record<MediaType, string> = { movie: "Film", tv: "TV", book: "Book" }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListDetailPage() {
  const router   = useRouter()
  const params   = useParams()
  const listId   = Array.isArray(params.id) ? params.id[0] : params.id

  const [list,              setList]              = useState<ListDetails | null>(null)
  const [items,             setItems]             = useState<ListItem[]>([])
  const [creator,           setCreator]           = useState<Creator | null>(null)
  const [isOwner,           setIsOwner]           = useState(false)
  const [loading,           setLoading]           = useState(true)
  const [notFound,          setNotFound]          = useState(false)
  const [currentUserId,     setCurrentUserId]     = useState<string | null>(null)
  const [isLiked,           setIsLiked]           = useState(false)
  const [isSaved,           setIsSaved]           = useState(false)

  // Edit mode
  const [editingMeta,       setEditingMeta]       = useState(false)
  const [editTitle,         setEditTitle]         = useState("")
  const [editDesc,          setEditDesc]          = useState("")
  const [editVisibility,    setEditVisibility]    = useState<ListVisibility>("public")
  const [editRanked,        setEditRanked]        = useState(true)
  const [metaSaving,        setMetaSaving]        = useState(false)

  // Add media
  const [searchOpen,        setSearchOpen]        = useState(false)

  // Desktop HTML5 DnD state (unchanged)
  const [draggedIndex,      setDraggedIndex]      = useState<number | null>(null)

  // Touch DnD state
  const [touchDragIdx,      setTouchDragIdx]      = useState<number | null>(null)

  // Mobile overflow menu state
  const [overflowMenuIdx,   setOverflowMenuIdx]   = useState<number | null>(null)

  // ── Refs for touch drag (avoid stale closures in document-level handlers) ──

  // Mirrors items state — updated synchronously before setItems so onDocTouchEnd reads the final order
  const itemsRef       = useRef<ListItem[]>([])
  const isOwnerRef     = useRef(false)
  const isDraggingTouch = useRef(false)
  // Tracks which index is being dragged without going stale inside the document handler
  const touchDragIdxRef = useRef<number | null>(null)
  // DOM element refs for each list item (used to compute drag position)
  const itemElsRef     = useRef<(HTMLElement | null)[]>([])

  // Keep owner ref in sync
  useEffect(() => { isOwnerRef.current = isOwner }, [isOwner])

  // ── Helper: update items in both ref and state ────────────────────────────

  function updateItems(next: ListItem[]) {
    itemsRef.current = next
    setItems(next)
  }

  // ── Document-level touch handlers (run once on mount) ─────────────────────

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
      // Prevent page scroll while touch-dragging
      e.preventDefault()

      const touch = e.touches[0]
      const clientY = touch.clientY

      // Auto-scroll when near viewport edges
      const EDGE = 80
      const vh = window.innerHeight
      if (clientY < EDGE) {
        window.scrollBy(0, -Math.max(2, Math.round((EDGE - clientY) / 5)))
      } else if (clientY > vh - EDGE) {
        window.scrollBy(0, Math.max(2, Math.round((clientY - (vh - EDGE)) / 5)))
      }

      // Compute target index from touch position
      const targetIdx = getTargetIndex(clientY)
      const currentIdx = touchDragIdxRef.current

      if (currentIdx !== null && targetIdx !== currentIdx) {
        const reordered = [...itemsRef.current]
        const [removed] = reordered.splice(currentIdx, 1)
        reordered.splice(targetIdx, 0, removed)
        const withRanks = reordered.map((it, i) => ({ ...it, rank_order: i + 1 }))
        // Sync ref first so onDocTouchEnd always has the final order
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
    document.addEventListener("touchend", onDocTouchEnd, { passive: true })
    return () => {
      document.removeEventListener("touchmove", onDocTouchMove)
      document.removeEventListener("touchend", onDocTouchEnd)
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

    // Private list guard — public and unlisted (direct link) are both viewable
    const owned = user?.id === listData.user_id
    if (listData.visibility === "private" && !owned) { setNotFound(true); setLoading(false); return }

    const [
      { data: itemsData },
      { data: profileData },
      { data: likeRow },
      { data: saveRow },
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

  // ── Desktop HTML5 Drag-and-drop (completely unchanged) ────────────────────

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

  // ── Touch grip handler (called from the 44×44 grip button on mobile) ──────

  function handleGripTouchStart(e: React.TouchEvent, index: number) {
    if (!isOwner) return
    // Prevent the browser from starting a scroll gesture
    e.preventDefault()
    isDraggingTouch.current = true
    touchDragIdxRef.current = index
    setTouchDragIdx(index)
  }

  // ── Overflow menu: move item to a new position ────────────────────────────

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

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: "40px 16px", maxWidth: 768, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 24, marginBottom: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div className="rs-skeleton" style={{ width: 176, height: 176, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
            <div className="rs-skeleton" style={{ height: 32, width: "65%", borderRadius: 6 }} />
            <div className="rs-skeleton" style={{ height: 13, width: "40%", borderRadius: 4 }} />
            <div className="rs-skeleton" style={{ height: 13, width: "80%", borderRadius: 4 }} />
            <div className="rs-skeleton" style={{ height: 13, width: "55%", borderRadius: 4 }} />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="rs-skeleton" style={{ width: 44, height: 64, borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="rs-skeleton" style={{ height: 13, width: "58%", borderRadius: 4 }} />
              <div className="rs-skeleton" style={{ height: 11, width: "32%", borderRadius: 4 }} />
            </div>
          </div>
        ))}
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

  const creatorName = creator?.display_name || creator?.username || "Someone"
  const creatorHref = creator?.username ? `/u/${encodeURIComponent(creator.username)}` : null

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-black text-white py-10 px-4 md:px-8 max-w-5xl mx-auto pb-24">

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      {creatorHref && (
        <Link
          href={creatorHref}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-8 no-underline"
        >
          ← {creatorName}
        </Link>
      )}

      {/* ── Upper content frame ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-8 border-b border-zinc-900 pb-10 mb-10">

        {/* Cover grid */}
        <div className="w-44 h-44 mx-auto lg:mx-0 shrink-0 rounded-xl overflow-hidden shadow-2xl">
          <ListCoverCollage
            items={items.slice(0, 4).map((i) => ({
              url: i.poster_url,
              alt: `${TYPE_LABEL[i.media_type] ?? "Cover"} cover — ${i.title}`,
            }))}
          />
        </div>

        {/* Metadata */}
        <div className="flex-1 space-y-3 text-center lg:text-left">
          {editingMeta ? (
            /* ── Edit form ────────────────────────────────────────────────── */
            <div className="space-y-3 max-w-xl bg-zinc-950 p-5 rounded-xl border border-zinc-900 text-left">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 p-2.5 rounded-lg text-white text-sm outline-none transition-colors"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                placeholder="Description (optional)"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 p-2.5 rounded-lg text-white text-sm outline-none resize-none transition-colors"
              />

              {/* Segmented toggles */}
              <div className="flex gap-3">
                <VisibilityPicker
                  value={editVisibility} onChange={setEditVisibility}
                />
                <SegPair
                  labelA="Ranked" labelB="Unranked"
                  active={editRanked} onChange={setEditRanked}
                />
              </div>

              <div className="flex gap-2 pt-1">
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
          ) : (
            /* ── Display ──────────────────────────────────────────────────── */
            <>
              <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                <h1 className="text-3xl font-extrabold tracking-tight">{list.title}</h1>
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 font-semibold">
                  {list.is_ranked ? "Ranked" : "Collection"}
                </span>
                {list.visibility === "private" && (
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 bg-red-950/40 border border-red-900/60 rounded-full text-red-400 font-semibold">
                    🔒 Private
                  </span>
                )}
                {list.visibility === "unlisted" && (
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 bg-blue-950/40 border border-blue-900/60 rounded-full text-blue-400 font-semibold">
                    🔗 Unlisted
                  </span>
                )}
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
                {list.description ?? <span className="italic text-zinc-600">No description.</span>}
              </p>

              <p className="text-xs text-zinc-600">
                Created by{" "}
                {creatorHref ? (
                  <Link href={creatorHref} className="text-zinc-400 font-medium hover:text-white transition-colors no-underline">
                    @{creator?.username}
                  </Link>
                ) : (
                  <span className="text-zinc-400 font-medium">{creatorName}</span>
                )}
                {" · "}
                {new Date(list.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                {" · "}
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>

              {/* Engagement buttons — visible to non-owners, static counts to owner */}
              <div className="flex justify-center lg:justify-start pt-1">
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
              </div>

              {isOwner && (
                <div className="flex justify-center lg:justify-start gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditingMeta(true)}
                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs rounded-lg font-medium transition"
                  >
                    Edit settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs rounded-lg font-bold transition"
                  >
                    + Add media
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteList()}
                    className="px-3.5 py-1.5 bg-transparent hover:bg-red-950/30 text-zinc-600 hover:text-red-400 border border-zinc-900 hover:border-red-900/50 text-xs rounded-lg transition ml-auto lg:ml-0"
                  >
                    Delete list
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Items ─────────────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/40 max-w-xl mx-auto space-y-3">
          <p className="text-zinc-400 text-sm font-medium">This list is empty.</p>
          <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
            Add your favourite films, series, or books to build this collection.
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="mt-1 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold rounded-lg transition"
            >
              Add your first item
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-w-3xl mx-auto">
          {isOwner && (
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">
                {list.is_ranked ? "Ranking" : "Custom Order"}
              </span>
              {/* Desktop hint */}
              {list.is_ranked && (
                <span className="text-[10px] text-zinc-600 hidden md:inline">Drag to reorder</span>
              )}
              {/* Mobile hint */}
              {list.is_ranked && (
                <span className="text-[10px] text-zinc-700 md:hidden">Hold ⠿ to drag · Tap ⋮ to rearrange</span>
              )}
            </div>
          )}
          {items.map((item, index) => {
            const mediaHref = getMediaHref({ id: item.media_id, mediaType: item.media_type })
            const isHtml5Dragging = draggedIndex === index
            const isTouchDragging = touchDragIdx === index

            return (
              <div
                key={item.id}
                ref={(el) => { itemElsRef.current[index] = el }}
                draggable={isOwner}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={() => void handleDragEnd()}
                className={[
                  "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group",
                  isTouchDragging
                    ? "border-zinc-500 bg-zinc-900 shadow-2xl relative z-10"
                    : isHtml5Dragging
                      ? "opacity-40 border-zinc-700 bg-zinc-900 scale-[0.98]"
                      : "border-zinc-900 bg-zinc-950/60 hover:border-zinc-800 hover:bg-zinc-950/90",
                  isOwner && !isTouchDragging ? "cursor-grab active:cursor-grabbing" : "",
                ].join(" ")}
                style={isTouchDragging ? { transform: "scale(1.02)", boxShadow: "0 16px 40px rgba(0,0,0,0.7)" } : undefined}
              >
                {/* ── Mobile grip handle — 44×44 touch target, ranked lists only ── */}
                {isOwner && list.is_ranked && (
                  <div
                    className="flex md:hidden items-center justify-center shrink-0 select-none"
                    style={{ width: 44, height: 44, touchAction: "none", cursor: "grab" }}
                    onTouchStart={(e) => handleGripTouchStart(e, index)}
                    aria-label="Drag to reorder"
                  >
                    <span
                      style={{
                        fontSize: 20,
                        lineHeight: 1,
                        color: isTouchDragging
                          ? "rgba(255,255,255,0.72)"
                          : "rgba(255,255,255,0.25)",
                        transition: "color 0.15s ease",
                        userSelect: "none",
                      }}
                    >
                      ⠿
                    </span>
                  </div>
                )}

                {/* ── Rank number — only for ranked lists ── */}
                {list.is_ranked && (
                  <div className="w-8 text-center text-sm font-black text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 select-none">
                    #{item.rank_order}
                  </div>
                )}

                {/* ── Desktop drag handle — only for ranked lists, hidden on mobile ── */}
                {isOwner && list.is_ranked && (
                  <div className="hidden md:flex flex-col gap-0.5 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity">
                    <span className="block w-3 h-px bg-zinc-400" />
                    <span className="block w-3 h-px bg-zinc-400" />
                    <span className="block w-3 h-px bg-zinc-400" />
                  </div>
                )}

                {/* ── Poster ── */}
                <button
                  type="button"
                  onClick={() => router.push(mediaHref)}
                  className="w-11 h-16 bg-zinc-900 rounded overflow-hidden shrink-0 border border-zinc-800/50 focus:outline-none"
                  tabIndex={-1}
                  aria-label={`Go to ${item.title}`}
                >
                  {item.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="w-full h-full object-cover block"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg opacity-20">🎬</div>
                  )}
                </button>

                {/* ── Info ── */}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => router.push(mediaHref)}
                    className="text-left w-full focus:outline-none"
                  >
                    <p className="font-semibold text-sm text-white truncate hover:underline underline-offset-2 decoration-zinc-600">
                      {item.title}
                    </p>
                  </button>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {item.year ? `${item.year} · ` : ""}
                    {TYPE_LABEL[item.media_type] ?? item.media_type}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-zinc-600 italic mt-0.5 truncate">{item.notes}</p>
                  )}
                </div>

                {/* ── Desktop remove button — hidden on mobile ── */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    aria-label={`Remove ${item.title}`}
                    className="p-2 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all shrink-0 hidden md:block"
                  >
                    ✕
                  </button>
                )}

                {/* ── Mobile overflow menu — ranked lists only, hidden on desktop ── */}
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
                            { label: "Move Up",       toIdx: index - 1,             disabled: index === 0 },
                            { label: "Move Down",     toIdx: index + 1,             disabled: index === items.length - 1 },
                            { label: "Move to Top",   toIdx: 0,                     disabled: index === 0 },
                            { label: "Move to Bottom",toIdx: items.length - 1,      disabled: index === items.length - 1 },
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
      )}

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

// ── Visibility picker (reused in edit form) ────────────────────────────────────

const VISIBILITY_OPTIONS: { value: ListVisibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
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

// ── Segmented pair (reused in edit form) ──────────────────────────────────────

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
