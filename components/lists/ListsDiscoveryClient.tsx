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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 700,
          color: "rgba(255,255,255,0.78)",
          letterSpacing: "-0.01em",
          fontFamily: FONT,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: FONT }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

interface ListsDiscoveryClientProps {
  lists: DiscoveryList[]
}

export default function ListsDiscoveryClient({ lists }: ListsDiscoveryClientProps) {
  const [search, setSearch] = useState("")

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

  const trending = useMemo(
    () => [...lists].sort((a, b) => b.item_count - a.item_count).slice(0, 12),
    [lists],
  )
  const recent = useMemo(() => lists.slice(0, 12), [lists])
  const mixed = useMemo(() => lists.filter((l) => l.media_types.length >= 2), [lists])

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

        {/* Search bar */}
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

      {/* ── Global empty state ─────────────────────────────────────────────── */}
      {lists.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            border: "1.5px dashed rgba(255,255,255,0.1)",
            borderRadius: 16,
          }}
        >
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 14,
              color: "rgba(255,255,255,0.38)",
              lineHeight: 1.65,
            }}
          >
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
            <SectionHeader title={`Results (${filtered.length})`} />
            <div style={GRID}>
              {filtered.map((l) => <DiscoveryListCard key={l.id} list={l} />)}
            </div>
          </section>
        )
      )}

      {/* ── Sections (only when not searching) ─────────────────────────────── */}
      {filtered === null && lists.length > 0 && (
        <>
          {trending.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <SectionHeader title="Trending" subtitle="Most-populated public lists" />
              <div style={GRID}>
                {trending.map((l) => <DiscoveryListCard key={l.id} list={l} />)}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <SectionHeader title="Recently Added" />
              <div style={GRID}>
                {recent.map((l) => <DiscoveryListCard key={l.id} list={l} />)}
              </div>
            </section>
          )}

          {mixed.length > 0 && (
            <section style={{ marginBottom: 48 }}>
              <SectionHeader
                title="Mixed Media"
                subtitle="Lists spanning films, TV, and books"
              />
              <div style={GRID}>
                {mixed.map((l) => <DiscoveryListCard key={l.id} list={l} />)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
