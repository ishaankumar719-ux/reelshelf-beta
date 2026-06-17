"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getMediaHref } from "@/lib/mediaRoutes"
import ListCoverCollage from "@/components/lists/ListCoverCollage"
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

  // Edit mode
  const [editingMeta,       setEditingMeta]       = useState(false)
  const [editTitle,         setEditTitle]         = useState("")
  const [editDesc,          setEditDesc]          = useState("")
  const [editVisibility,    setEditVisibility]    = useState<ListVisibility>("public")
  const [editRanked,        setEditRanked]        = useState(true)
  const [metaSaving,        setMetaSaving]        = useState(false)

  // Add media
  const [searchOpen,        setSearchOpen]        = useState(false)

  // Drag state
  const [draggedIndex,      setDraggedIndex]      = useState<number | null>(null)

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
        .select("id, user_id, title, description, visibility, is_ranked, created_at")
        .eq("id", listId)
        .single(),
    ])

    if (listErr || !listData) { setNotFound(true); setLoading(false); return }

    // Private list guard — public and unlisted (direct link) are both viewable
    const owned = user?.id === listData.user_id
    if (listData.visibility === "private" && !owned) { setNotFound(true); setLoading(false); return }

    const [{ data: itemsData }, { data: profileData }] = await Promise.all([
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
    ])

    setList(listData)
    setItems((itemsData ?? []) as ListItem[])
    setCreator(profileData as Creator | null)
    setIsOwner(owned)
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
      setItems(updated)
      if (updated.length > 0) {
        await supabase.rpc("update_list_items_order", {
          payload: updated.map((it) => ({ id: it.id, rank_order: it.rank_order })),
        })
      }
    }
  }

  // ── Drag-and-drop (owner only, desktop) ───────────────────────────────────

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

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-zinc-600 text-sm tracking-wide">Loading…</span>
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
              <span className="text-[10px] text-zinc-600">Drag to reorder</span>
            </div>
          )}
          {items.map((item, index) => {
            const mediaHref = getMediaHref({ id: item.media_id, mediaType: item.media_type })
            const isDragging = draggedIndex === index

            return (
              <div
                key={item.id}
                draggable={isOwner}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={() => void handleDragEnd()}
                className={[
                  "flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 group",
                  isDragging
                    ? "opacity-40 border-zinc-700 bg-zinc-900 scale-[0.98]"
                    : "border-zinc-900 bg-zinc-950/60 hover:border-zinc-800 hover:bg-zinc-950/90",
                  isOwner ? "cursor-grab active:cursor-grabbing" : "",
                ].join(" ")}
              >
                {/* Rank — only shown for ranked lists */}
                {list.is_ranked && (
                  <div className="w-8 text-center text-sm font-black text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 select-none">
                    #{item.rank_order}
                  </div>
                )}

                {/* Drag handle — visible affordance for the owner on any list */}
                {isOwner && (
                  <div className="hidden md:flex flex-col gap-0.5 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity">
                    <span className="block w-3 h-px bg-zinc-400" />
                    <span className="block w-3 h-px bg-zinc-400" />
                    <span className="block w-3 h-px bg-zinc-400" />
                  </div>
                )}

                {/* Poster */}
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

                {/* Info */}
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

                {/* Remove */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    aria-label={`Remove ${item.title}`}
                    className="p-2 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all shrink-0 md:block"
                  >
                    ✕
                  </button>
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
