"use client"

import { useState } from "react"

type LegacyBadge = {
  id: string
  slug: string
  name: string
  description: string
  icon: string
}

type AutoAssignSlug = "original_eight" | "founding_critic" | "day_one_member"

const AUTO_ASSIGN_LABELS: Record<AutoAssignSlug, string> = {
  original_eight:   "First 8 profiles by created_at",
  founding_critic:  "All profiles created before beta cutoff",
  day_one_member:   "All profiles created before beta cutoff",
}

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

export default function LegacyBadgeAdminClient({ badges }: { badges: LegacyBadge[] }) {
  const [grantEmail, setGrantEmail] = useState("")
  const [selectedSlug, setSelectedSlug] = useState(badges[0]?.slug ?? "")
  const [grantStatus, setGrantStatus] = useState<string | null>(null)
  const [grantError, setGrantError] = useState<string | null>(null)
  const [grantLoading, setGrantLoading] = useState(false)

  const [autoStatus, setAutoStatus] = useState<Record<string, string>>({})
  const [autoLoading, setAutoLoading] = useState<Record<string, boolean>>({})

  async function handleGrantSingle() {
    if (!grantEmail.trim() || !selectedSlug) return
    setGrantLoading(true)
    setGrantStatus(null)
    setGrantError(null)

    try {
      const res = await fetch("/api/admin/grant-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant_single",
          targetEmail: grantEmail.trim(),
          badgeSlug: selectedSlug,
        }),
      })
      const json = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setGrantError((json.error as string) ?? "Unknown error")
      } else {
        const results = json.results as Record<string, { granted: number; skipped: number }> | undefined
        const r = results?.[selectedSlug]
        setGrantStatus(
          r
            ? r.granted > 0
              ? `Granted "${selectedSlug}" to ${grantEmail}`
              : `Already had "${selectedSlug}" — skipped`
            : "Done"
        )
        setGrantEmail("")
      }
    } catch (e) {
      setGrantError(String(e))
    } finally {
      setGrantLoading(false)
    }
  }

  async function handleAutoAssign(action: string, slug: string) {
    setAutoLoading((prev) => ({ ...prev, [slug]: true }))
    setAutoStatus((prev) => ({ ...prev, [slug]: "" }))

    try {
      const res = await fetch("/api/admin/grant-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = (await res.json()) as { granted?: number; skipped?: number; error?: string }
      if (!res.ok) {
        setAutoStatus((prev) => ({ ...prev, [slug]: `Error: ${json.error ?? "Unknown"}` }))
      } else {
        setAutoStatus((prev) => ({
          ...prev,
          [slug]: `Granted: ${json.granted ?? 0}  |  Already had: ${json.skipped ?? 0}`,
        }))
      }
    } catch (e) {
      setAutoStatus((prev) => ({ ...prev, [slug]: `Error: ${String(e)}` }))
    } finally {
      setAutoLoading((prev) => ({ ...prev, [slug]: false }))
    }
  }

  const autoAssignBadges: Array<{ slug: AutoAssignSlug; action: string }> = [
    { slug: "original_eight",  action: "auto_original_eight" },
    { slug: "founding_critic", action: "auto_founding_critic" },
    { slug: "day_one_member",  action: "auto_day_one" },
  ]

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px", fontFamily: FONT }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "rgba(212,175,55,0.95)", letterSpacing: "-0.02em" }}>
            Legacy Badge Admin
          </span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>
          Grant founding-era badges to eligible users. These badges are permanently exclusive.
        </p>
      </div>

      {/* Badge catalog */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 14px" }}>
          Legacy Badge Catalog
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {badges.map((badge) => (
            <div
              key={badge.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                border: "0.5px solid rgba(212,175,55,0.18)",
                background: "rgba(212,175,55,0.04)",
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{badge.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(212,175,55,0.9)" }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 1.4 }}>
                  {badge.description}
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(212,175,55,0.4)", flexShrink: 0 }}>
                {badge.slug}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Manual grant */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 14px" }}>
          Manual Grant — Single User
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.8)",
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: FONT,
              outline: "none",
            }}
          >
            {badges.map((b) => (
              <option key={b.slug} value={b.slug} style={{ background: "#0a0a14" }}>
                {b.icon}  {b.name} ({b.slug})
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleGrantSingle() }}
              placeholder="user@example.com"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.85)",
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: FONT,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => void handleGrantSingle()}
              disabled={grantLoading || !grantEmail.trim() || !selectedSlug}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: grantLoading || !grantEmail.trim() ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.85)",
                color: grantLoading || !grantEmail.trim() ? "rgba(212,175,55,0.45)" : "rgba(8,8,14,1)",
                fontSize: 13,
                fontWeight: 700,
                cursor: grantLoading || !grantEmail.trim() ? "not-allowed" : "pointer",
                fontFamily: FONT,
                flexShrink: 0,
              }}
            >
              {grantLoading ? "Granting…" : "Grant"}
            </button>
          </div>

          {grantStatus ? (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(29,200,120,0.85)", fontFamily: FONT }}>
              ✓ {grantStatus}
            </p>
          ) : null}
          {grantError ? (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(239,68,68,0.85)", fontFamily: FONT }}>
              ✗ {grantError}
            </p>
          ) : null}
        </div>
      </section>

      {/* Auto-assign */}
      <section>
        <h2 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 14px" }}>
          Auto-Assign — Eligible Users
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {autoAssignBadges.map(({ slug, action }) => {
            const badge = badges.find((b) => b.slug === slug)
            if (!badge) return null
            const loading = autoLoading[slug] ?? false
            const status  = autoStatus[slug]

            return (
              <div
                key={slug}
                style={{
                  padding: "13px 14px",
                  borderRadius: 10,
                  border: "0.5px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.025)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: status ? 8 : 0 }}>
                  <span style={{ fontSize: 18 }}>{badge.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(212,175,55,0.85)" }}>
                      {badge.name}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      {AUTO_ASSIGN_LABELS[slug]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAutoAssign(action, slug)}
                    disabled={loading}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 7,
                      border: "0.5px solid rgba(212,175,55,0.4)",
                      background: loading ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.12)",
                      color: loading ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.9)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: loading ? "wait" : "pointer",
                      fontFamily: FONT,
                      flexShrink: 0,
                    }}
                  >
                    {loading ? "Running…" : "Auto-assign"}
                  </button>
                </div>
                {status ? (
                  <p style={{ margin: 0, fontSize: 11, color: status.startsWith("Error") ? "rgba(239,68,68,0.8)" : "rgba(29,200,120,0.8)", fontFamily: FONT, paddingLeft: 28 }}>
                    {status}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic", margin: "16px 0 0", lineHeight: 1.5, fontFamily: FONT }}>
          Beta Pioneer and ReelShelf Insider are manual-only — use the single-user grant above.
        </p>
      </section>
    </div>
  )
}
