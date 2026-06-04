"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  addListItem,
  removeListItem,
  updateItemRankOrders,
  updateList,
  deleteList,
} from "@/lib/supabase/lists"
import type { UserListItem } from "@/lib/supabase/lists"
import MediaSearchSelector from "./MediaSearchSelector"
import type { MediaSearchResult } from "./MediaSearchSelector"
import { getMediaHref } from "@/lib/mediaRoutes"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const TYPE_LABEL: Record<string, string> = { movie: "Film", tv: "TV", book: "Book" }
const TYPE_COLOR: Record<string, string> = {
  movie: "rgba(96,165,250,0.75)",
  tv:    "rgba(167,139,250,0.75)",
  book:  "rgba(52,211,153,0.75)",
}

interface ListMeta {
  title: string
  description: string | null
  is_public: boolean
  is_ranked: boolean
}

interface ListItemsEditorProps {
  listId: string
  initialItems: UserListItem[]
  initialList: ListMeta
}

export default function ListItemsEditor({
  listId,
  initialItems,
  initialList,
}: ListItemsEditorProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [items, setItems] = useState<UserListItem[]>(
    [...initialItems].sort((a, b) => a.rank_order - b.rank_order)
  )
  const [meta, setMeta] = useState<ListMeta>(initialList)
  const [showSearch, setShowSearch] = useState(false)
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaDirty, setMetaDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const client = createClient()

  // ── Metadata save ────────────────────────────────────────────────────────────

  async function saveMeta() {
    if (!client || !metaDirty) return
    setMetaSaving(true)
    await updateList(client, listId, meta)
    setMetaSaving(false)
    setMetaDirty(false)
    startTransition(() => router.refresh())
  }

  function patchMeta(patch: Partial<ListMeta>) {
    setMeta((prev) => ({ ...prev, ...patch }))
    setMetaDirty(true)
  }

  // ── Delete list ──────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!client) return
    if (!window.confirm("Delete this list? This cannot be undone.")) return
    setDeleting(true)
    await deleteList(client, listId)
    router.push("/profile")
  }

  // ── Move item ────────────────────────────────────────────────────────────────

  async function moveItem(idx: number, dir: "up" | "down") {
    if (!client) return
    const neighborIdx = dir === "up" ? idx - 1 : idx + 1
    if (neighborIdx < 0 || neighborIdx >= items.length) return

    const item = items[idx]
    const neighbor = items[neighborIdx]

    // Optimistic swap
    const updated = items.map((it) => {
      if (it.id === item.id) return { ...it, rank_order: neighbor.rank_order }
      if (it.id === neighbor.id) return { ...it, rank_order: item.rank_order }
      return it
    }).sort((a, b) => a.rank_order - b.rank_order)

    setItems(updated)

    await updateItemRankOrders(client, [
      { id: item.id, rank_order: neighbor.rank_order },
      { id: neighbor.id, rank_order: item.rank_order },
    ])
  }

  // ── Remove item ──────────────────────────────────────────────────────────────

  async function removeItem(itemId: string) {
    if (!client) return
    setItems((prev) => prev.filter((it) => it.id !== itemId))
    await removeListItem(client, itemId)
    startTransition(() => router.refresh())
  }

  // ── Add item from search ─────────────────────────────────────────────────────

  async function handleAddItem(selected: MediaSearchResult) {
    if (!client) return
    setShowSearch(false)

    const maxOrder = items.length > 0 ? Math.max(...items.map((it) => it.rank_order)) : 0
    const newRank = maxOrder + 1

    const inserted = await addListItem(client, listId, {
      media_type: selected.media_type,
      media_id: selected.media_id,
      title: selected.title,
      poster_url: selected.poster_url,
      year: selected.year,
      rank_order: newRank,
    })

    if (inserted) {
      setItems((prev) => [...prev, inserted])
      startTransition(() => router.refresh())
    }
  }

  const existingIds = items.map((it) => it.media_id)

  return (
    <div style={{ fontFamily: FONT }}>
      {showSearch && (
        <MediaSearchSelector
          existingMediaIds={existingIds}
          onSelect={handleAddItem}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* ── Metadata editor ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.32)",
            }}
          >
            List settings
          </span>
          <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Title */}
          <input
            type="text"
            value={meta.title}
            onChange={(e) => patchMeta({ title: e.target.value })}
            maxLength={100}
            placeholder="List title"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.88)",
              outline: "none",
              fontFamily: FONT,
              boxSizing: "border-box",
            }}
          />

          {/* Description */}
          <textarea
            value={meta.description ?? ""}
            onChange={(e) => patchMeta({ description: e.target.value || null })}
            placeholder="Description (optional)"
            rows={2}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "rgba(255,255,255,0.62)",
              outline: "none",
              resize: "vertical",
              fontFamily: FONT,
              boxSizing: "border-box",
            }}
          />

          {/* Toggle row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ToggleChip
              active={meta.is_public}
              label={meta.is_public ? "Public" : "Private"}
              onClick={() => patchMeta({ is_public: !meta.is_public })}
            />
            <ToggleChip
              active={meta.is_ranked}
              label={meta.is_ranked ? "Ranked" : "Unranked"}
              onClick={() => patchMeta({ is_ranked: !meta.is_ranked })}
            />
          </div>

          {/* Save button */}
          {metaDirty && (
            <button
              type="button"
              onClick={() => void saveMeta()}
              disabled={metaSaving || !meta.title.trim()}
              style={{
                alignSelf: "flex-start",
                height: 36,
                padding: "0 18px",
                borderRadius: 999,
                border: "none",
                background: metaSaving ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)",
                color: metaSaving ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.88)",
                fontSize: 12,
                fontWeight: 600,
                cursor: metaSaving ? "wait" : "pointer",
                letterSpacing: "0.04em",
                fontFamily: FONT,
                transition: "all 0.15s",
              }}
            >
              {metaSaving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </section>

      {/* ── Items section ────────────────────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.32)",
            }}
          >
            Items{items.length > 0 ? ` · ${items.length}` : ""}
          </span>
          <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />

          <button
            type="button"
            onClick={() => setShowSearch(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 30,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.72)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.04em",
              fontFamily: FONT,
            }}
          >
            + Add
          </button>
        </div>

        {items.length === 0 && (
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.22)",
              fontStyle: "italic",
              margin: "8px 0 20px",
            }}
          >
            No items yet — click + Add to get started.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((item, idx) => {
            const href = getMediaHref({ id: item.media_id, mediaType: item.media_type })
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "0.5px solid rgba(255,255,255,0.055)",
                }}
              >
                {/* Rank arrows — only for ranked lists */}
                {meta.is_ranked && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      flexShrink: 0,
                    }}
                  >
                    <ArrowBtn
                      dir="up"
                      disabled={idx === 0}
                      onClick={() => void moveItem(idx, "up")}
                    />
                    <ArrowBtn
                      dir="down"
                      disabled={idx === items.length - 1}
                      onClick={() => void moveItem(idx, "down")}
                    />
                  </div>
                )}

                {/* Rank number */}
                {meta.is_ranked && (
                  <span
                    style={{
                      minWidth: 28,
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.35)",
                      flexShrink: 0,
                    }}
                  >
                    #{idx + 1}
                  </span>
                )}

                {/* Poster */}
                <Link href={href} style={{ flexShrink: 0, textDecoration: "none" }}>
                  <div
                    style={{
                      width: 36,
                      height: 54,
                      borderRadius: 3,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.04)",
                      border: "0.5px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {item.poster_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          opacity: 0.25,
                        }}
                      >
                        🎬
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={href} style={{ textDecoration: "none" }}>
                    <p
                      style={{
                        margin: "0 0 3px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.85)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.title}
                    </p>
                  </Link>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {item.year && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.32)" }}>
                        {item.year}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: TYPE_COLOR[item.media_type] ?? "rgba(255,255,255,0.3)",
                      }}
                    >
                      {TYPE_LABEL[item.media_type] ?? item.media_type}
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => void removeItem(item.id)}
                  aria-label={`Remove ${item.title}`}
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "0.5px solid rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Danger zone ──────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          style={{
            height: 34,
            padding: "0 16px",
            borderRadius: 999,
            border: "0.5px solid rgba(251,113,133,0.22)",
            background: "rgba(251,113,133,0.04)",
            color: deleting ? "rgba(251,113,133,0.3)" : "rgba(251,113,133,0.65)",
            fontSize: 11,
            fontWeight: 600,
            cursor: deleting ? "wait" : "pointer",
            letterSpacing: "0.04em",
            fontFamily: FONT,
            transition: "all 0.15s",
          }}
        >
          {deleting ? "Deleting…" : "Delete list"}
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ArrowBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down"
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "Move up" : "Move down"}
      style={{
        width: 22,
        height: 18,
        borderRadius: 4,
        border: "0.5px solid rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.03)",
        color: disabled ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.55)",
        fontSize: 10,
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        flexShrink: 0,
        padding: 0,
      }}
    >
      {dir === "up" ? "↑" : "↓"}
    </button>
  )
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 30,
        padding: "0 14px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
        color: active ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.32)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.04em",
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  )
}
