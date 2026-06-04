"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { createClient } from "@/lib/supabase/client"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

// ── Segmented control ──────────────────────────────────────────────────────────
// active=true  → left option selected
// active=false → right option selected

function SegmentedControl({
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
    <div
      className="flex bg-zinc-950 border border-zinc-900 rounded-lg p-1 gap-0.5"
      style={{ fontFamily: FONT }}
    >
      <button
        type="button"
        onClick={() => onChange(true)}
        className={[
          "flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-100 leading-none",
          active
            ? "bg-zinc-800 text-white border border-zinc-700/50"
            : "text-zinc-500 hover:text-zinc-300",
        ].join(" ")}
      >
        {labelA}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={[
          "flex-1 py-2 px-3 text-sm font-semibold rounded-md transition-all duration-100 leading-none",
          !active
            ? "bg-zinc-800 text-white border border-zinc-700/50"
            : "text-zinc-500 hover:text-zinc-300",
        ].join(" ")}
      >
        {labelB}
      </button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CreateListPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [isRanked, setIsRanked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 16px", fontFamily: FONT }}>
        <div style={{ height: 28, width: 120, borderRadius: 6, background: "rgba(255,255,255,0.06)", marginBottom: 32 }} />
        {[44, 80, 52, 52].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 10, background: "rgba(255,255,255,0.04)", marginBottom: 14 }} />
        ))}
      </div>
    )
  }

  // ── Auth gate ───────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 16px", textAlign: "center", fontFamily: FONT }}>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
          Sign in required to create lists.
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 42,
            padding: "0 22px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.78)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            fontFamily: FONT,
          }}
        >
          Sign in
        </Link>
      </div>
    )
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const supabase = createClient()
    if (!supabase || !user) {
      setError("Connection unavailable. Please refresh.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Check if it's the user's first list
      const { count } = await supabase
        .from("user_lists")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      // Insert the new list row
      const { data: newList, error: listError } = await supabase
        .from("user_lists")
        .insert([{
          title: trimmed,
          description: description.trim() || null,
          is_public: isPublic,
          is_ranked: isRanked,
          user_id: user.id,
        }])
        .select()
        .single()

      if (listError) throw listError

      // If first list, unlock the List Maker achievement natively.
      // badge_id is UUID → resolve via slug first; silently skip if not found.
      if (count === 0) {
        const { data: badgeDef } = await supabase
          .from("badges")
          .select("id")
          .eq("slug", "list_maker")
          .maybeSingle()

        if (badgeDef?.id) {
          await supabase
            .from("user_badges")
            .insert([{ user_id: user.id, badge_id: badgeDef.id }])
        }
      }

      router.push(`/lists/${newList!.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "36px 16px 80px", fontFamily: FONT }}>

      {/* Back */}
      <Link
        href="/profile"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          color: "rgba(255,255,255,0.36)",
          textDecoration: "none",
          marginBottom: 28,
          letterSpacing: "0.01em",
        }}
      >
        ← Back
      </Link>

      <h1
        style={{
          margin: "0 0 28px",
          fontSize: "clamp(22px,5vw,28px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "rgba(255,255,255,0.94)",
          lineHeight: 1.15,
        }}
      >
        New List
      </h1>

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Title ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="list-title"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.32)",
              }}
            >
              Title *
            </label>
            <input
              id="list-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. All-Time Favourites"
              maxLength={100}
              required
              autoFocus
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                outline: "none",
                fontFamily: FONT,
                boxSizing: "border-box",
                caretColor: "rgba(255,255,255,0.7)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}
            />
            <span
              style={{
                fontSize: 11,
                color: title.length > 85 ? "rgba(251,113,133,0.7)" : "rgba(255,255,255,0.18)",
                alignSelf: "flex-end",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {title.length} / 100
            </span>
          </div>

          {/* ── Description ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="list-description"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.32)",
              }}
            >
              Description{" "}
              <span
                style={{
                  fontWeight: 400,
                  letterSpacing: 0,
                  textTransform: "none",
                  color: "rgba(255,255,255,0.2)",
                }}
              >
                optional
              </span>
            </label>
            <textarea
              id="list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this list about?"
              rows={3}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
                outline: "none",
                resize: "vertical",
                fontFamily: FONT,
                boxSizing: "border-box",
                lineHeight: 1.55,
                caretColor: "rgba(255,255,255,0.7)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}
            />
          </div>

          {/* ── Visibility ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.32)",
              }}
            >
              Visibility
            </span>
            <SegmentedControl
              labelA="Public"
              labelB="Private"
              active={isPublic}
              onChange={setIsPublic}
            />
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.28)", lineHeight: 1.55 }}>
              {isPublic
                ? "Public lists appear on your profile and can be viewed by others."
                : "Private lists are only visible to you."}
            </p>
          </div>

          {/* ── List Type ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.32)",
              }}
            >
              List Type
            </span>
            <SegmentedControl
              labelA="Ranked"
              labelB="Unranked"
              active={isRanked}
              onChange={setIsRanked}
            />
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.28)", lineHeight: 1.55 }}>
              {isRanked
                ? "Ranked lists display numbered positions."
                : "Unranked lists are simple collections without ordering."}
            </p>
          </div>

          {/* ── Error ── */}
          {error && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(251,113,133,0.85)",
                padding: "10px 14px",
                borderRadius: 8,
                border: "0.5px solid rgba(251,113,133,0.18)",
                background: "rgba(251,113,133,0.05)",
              }}
            >
              {error}
            </p>
          )}

          {/* ── Divider ── */}
          <div style={{ height: "0.5px", background: "rgba(255,255,255,0.06)" }} />

          {/* ── Actions ── */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 12,
                border: "none",
                background: saving || !title.trim() ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.11)",
                color: saving || !title.trim() ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.94)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.01em",
                cursor: saving || !title.trim() ? "not-allowed" : "pointer",
                fontFamily: FONT,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {saving ? "Creating…" : "Create list"}
            </button>
            <Link
              href="/profile"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                padding: "0 22px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.09)",
                background: "transparent",
                color: "rgba(255,255,255,0.38)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: FONT,
                flexShrink: 0,
              }}
            >
              Cancel
            </Link>
          </div>

        </div>
      </form>
    </div>
  )
}
