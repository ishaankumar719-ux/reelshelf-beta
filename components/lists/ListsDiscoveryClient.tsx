"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import DiscoveryListCard from "@/components/lists/DiscoveryListCard"
import type { DiscoveryList } from "@/lib/supabase/lists"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 16,
}

type SortMode = "trending" | "liked" | "recent"

const SORT_LABELS: Record<SortMode, string> = {
  trending: "Trending",
  liked:    "Most Liked",
  recent:   "Recent",
}

interface ListsDiscoveryClientProps {
  lists: DiscoveryList[]
  currentUserId: string | null
  likedListIds: string[]
  savedListIds: string[]
}

export default function ListsDiscoveryClient({
  lists,
  currentUserId,
  likedListIds,
  savedListIds,
}: ListsDiscoveryClientProps) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortMode>("trending")

  const likedSet = useMemo(() => new Set(likedListIds), [likedListIds])
  const savedSet = useMemo(() => new Set(savedListIds), [savedListIds])

  const filtered = useMemo<DiscoveryList[] | null>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return lists.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q) ||
        (l.creator.username ?? "").toLowerCase().includes(q) ||
        (l.creator.display_name ?? "").toLowerCase().includes(q),
    )
  }, [lists, search])

  const sorted = useMemo(() => {
    const copy = [...lists]
    if (sort === "trending") {
      copy.sort((a, b) => b.trending_score - a.trending_score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sort === "liked") {
      copy.sort((a, b) => b.like_count - a.like_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else {
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return copy
  }, [lists, sort])

  function renderCard(l: DiscoveryList) {
    return (
      <DiscoveryListCard
        key={l.id}
        list={l}
        currentUserId={currentUserId}
        isLiked={likedSet.has(l.id)}
        isSaved={savedSet.has(l.id)}
      />
    )
  }

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px 80px", fontFamily: FONT }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "48px 0 36px",
          borderBottom: "0.5px solid rgba(255,255,255,0.08)",
          marginBottom: 40,
        }}
      >
        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "clamp(26px, 5vw, 38px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "rgba(255,255,255,0.94)",
            lineHeight: 1.1,
          }}
        >
          Discover Lists
        </h1>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 14,
            color: "rgba(255,255,255,0.38)",
            lineHeight: 1.6,
            maxWidth: 460,
          }}
        >
          Explore rankings, recommendations and collections from the ReelShelf community.
        </p>

        <input
          type="search"
          placeholder="Search by title, description or creator…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            maxWidth: 400,
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: "rgba(255,255,255,0.85)",
            outline: "none",
            fontFamily: FONT,
            boxSizing: "border-box",
            caretColor: "rgba(255,255,255,0.7)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)" }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)" }}
        />
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {lists.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            border: "1.5px dashed rgba(255,255,255,0.1)",
            borderRadius: 16,
          }}
        >
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(255,255,255,0.38)", lineHeight: 1.65 }}>
            Nobody has created any public lists yet.
          </p>
          <Link
            href="/lists/create"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 42,
              padding: "0 22px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.88)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: FONT,
            }}
          >
            Create First List
          </Link>
        </div>
      )}

      {/* ── Search results ─────────────────────────────────────────────────── */}
      {filtered !== null && lists.length > 0 && (
        filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)" }}>
            No lists match &ldquo;{search}&rdquo;.
          </p>
        ) : (
          <section style={{ marginBottom: 48 }}>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.38)", fontFamily: FONT }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
            <div style={GRID}>
              {filtered.map((l) => renderCard(l))}
            </div>
          </section>
        )
      )}

      {/* ── Sorted section (only when not searching) ───────────────────────── */}
      {filtered === null && lists.length > 0 && (
        <>
          {/* Sort controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 24,
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "4px 5px",
              width: "fit-content",
            }}
          >
            {(["trending", "liked", "recent"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSort(mode)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: sort === mode ? "0.5px solid rgba(255,255,255,0.14)" : "none",
                  background: sort === mode ? "rgba(255,255,255,0.09)" : "transparent",
                  color: sort === mode ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.36)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: FONT,
                  transition: "background 0.12s, color 0.12s",
                  letterSpacing: "0.01em",
                }}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>

          <section>
            <div style={GRID}>
              {sorted.map((l) => renderCard(l))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
