import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchListsForProfile } from "@/lib/supabase/lists"
import ListPreviewCard from "@/components/lists/ListPreviewCard"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

interface UserListsSectionProps {
  userId: string
  isOwner: boolean
}

export default async function UserListsSection({
  userId,
  isOwner,
}: UserListsSectionProps) {
  const supabase = await createClient()
  if (!supabase) return null

  const lists = await fetchListsForProfile(supabase, userId, isOwner)

  // Visitors with no public lists — hide the section entirely
  if (lists.length === 0 && !isOwner) return null

  return (
    <section className="w-full py-4 md:py-5 md:px-6" style={{ fontFamily: FONT }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center px-4 md:px-0 mb-4">
        <h2 className="text-xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
          Lists
        </h2>

        {isOwner && (
          <Link
            href="/lists/create"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 32,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.78)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.03em",
              textDecoration: "none",
              transition: "border-color 0.12s, color 0.12s",
              fontFamily: FONT,
            }}
            onMouseEnter={undefined}
          >
            + New List
          </Link>
        )}
      </div>

      {/* ── Owner empty state ───────────────────────────────────────────────── */}
      {lists.length === 0 && isOwner && (
        <div
          className="mx-4 md:mx-0"
          style={{
            borderRadius: 14,
            border: "1.5px dashed rgba(255,255,255,0.12)",
            padding: "28px 24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 14,
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.4)",
              fontFamily: FONT,
            }}
          >
            You haven&apos;t created any lists yet.
            <br />
            <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 13 }}>
              Create your first list to rank your favourite media.
            </span>
          </p>

          <Link
            href="/lists/create"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 44,
              padding: "0 24px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.88)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.02em",
              textDecoration: "none",
              fontFamily: FONT,
            }}
          >
            Create your first list
          </Link>
        </div>
      )}

      {/* ── List grid ──────────────────────────────────────────────────────── */}
      {lists.length > 0 && (
        <div
          className="px-4 md:px-0"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {lists.map((list) => (
            <ListPreviewCard key={list.id} list={list} isOwner={isOwner} />
          ))}
        </div>
      )}

    </section>
  )
}
