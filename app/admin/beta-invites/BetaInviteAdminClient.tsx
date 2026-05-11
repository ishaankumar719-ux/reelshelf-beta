"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { BetaInvite } from "./page"

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function generateCode(): string {
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `REEL-${code.slice(0, 4)}-${code.slice(4)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function UsageBar({ current, max }: { current: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min(100, (current / max) * 100)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: pct >= 100 ? "rgba(248,113,113,0.7)" : "rgba(29,158,117,0.7)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.38)",
          fontVariantNumeric: "tabular-nums",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          flexShrink: 0,
        }}
      >
        {current}/{max}
      </span>
    </div>
  )
}

export default function BetaInviteAdminClient({
  initialInvites,
}: {
  initialInvites: BetaInvite[]
}) {
  const [invites, setInvites] = useState<BetaInvite[]>(initialInvites)
  const [code, setCode] = useState(generateCode)
  const [maxUses, setMaxUses] = useState(1)
  const [expiresAt, setExpiresAt] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    try {
      const client = createClient()
      if (!client) throw new Error("Not connected.")

      const payload: Record<string, unknown> = {
        code: code.trim().toUpperCase(),
        max_uses: maxUses,
      }
      if (expiresAt) {
        payload.expires_at = new Date(expiresAt).toISOString()
      }

      const { data, error } = await client
        .from("beta_invites")
        .insert(payload)
        .select("id, code, created_by, claimed_by, claimed_at, max_uses, current_uses, expires_at, is_active, created_at")
        .single()

      if (error) throw new Error(error.message)

      setInvites((prev) => [data as BetaInvite, ...prev])
      setCode(generateCode())
      setMaxUses(1)
      setExpiresAt("")
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create invite.")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeactivate(id: string) {
    const client = createClient()
    if (!client) return

    const { error } = await client
      .from("beta_invites")
      .update({ is_active: false })
      .eq("id", id)

    if (!error) {
      setInvites((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, is_active: false } : inv))
      )
    }
  }

  function copyCode(invite: BetaInvite) {
    void navigator.clipboard.writeText(invite.code)
    setCopiedId(invite.id)
    window.setTimeout(() => setCopiedId(null), 1800)
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.32)",
    marginBottom: 8,
    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.03)",
    color: "white",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
  }

  return (
    <main style={{ padding: "32px 0 80px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Admin · Beta Access
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 6vw, 42px)",
              fontWeight: 500,
              letterSpacing: "-1.5px",
              lineHeight: 1,
            }}
          >
            Beta Invites
          </h1>
        </div>

        {/* Create form */}
        <div
          style={{
            borderRadius: 24,
            border: "0.5px solid rgba(255,255,255,0.1)",
            background: "linear-gradient(180deg, rgba(16,16,24,0.97) 0%, rgba(9,9,14,0.98) 100%)",
            padding: "24px 24px 26px",
            marginBottom: 28,
          }}
        >
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            Create Invite
          </p>

          <form onSubmit={handleCreate}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 12,
                alignItems: "end",
                flexWrap: "wrap",
              }}
              className="admin-form-grid"
            >
              <div>
                <label style={labelStyle}>Code</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    spellCheck={false}
                    style={{ ...inputStyle, letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums", flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setCode(generateCode())}
                    style={{
                      height: 42,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.45)",
                      fontSize: 12,
                      cursor: "pointer",
                      flexShrink: 0,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Regenerate
                  </button>
                </div>
              </div>

              <div style={{ minWidth: 100 }}>
                <label style={labelStyle}>Max Uses</label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  min={1}
                  required
                  style={{ ...inputStyle, width: 100 }}
                />
              </div>

              <div style={{ minWidth: 160 }}>
                <label style={labelStyle}>Expires (optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{ ...inputStyle, colorScheme: "dark" }}
                />
              </div>
            </div>

            {createError ? (
              <p
                style={{
                  margin: "14px 0 0",
                  color: "#f87171",
                  fontSize: 13,
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {createError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={creating}
              style={{
                marginTop: 18,
                height: 42,
                padding: "0 22px",
                borderRadius: 999,
                border: "none",
                background: "white",
                color: "black",
                fontSize: 13,
                fontWeight: 600,
                cursor: creating ? "progress" : "pointer",
                opacity: creating ? 0.6 : 1,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {creating ? "Creating…" : "Create Invite"}
            </button>
          </form>
        </div>

        {/* Invite list */}
        <div
          style={{
            borderRadius: 24,
            border: "0.5px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 90px 1fr 70px",
              gap: 0,
              padding: "10px 20px",
              borderBottom: "0.5px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {["Code", "Uses", "Expires", "Claimed at", ""].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.28)",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {invites.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: "rgba(255,255,255,0.28)",
                fontSize: 14,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              No invites yet. Create one above.
            </div>
          ) : (
            invites.map((invite, idx) => (
              <div
                key={invite.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 90px 1fr 70px",
                  gap: 0,
                  padding: "14px 20px",
                  alignItems: "center",
                  borderBottom:
                    idx < invites.length - 1
                      ? "0.5px solid rgba(255,255,255,0.05)"
                      : "none",
                  background: invite.is_active ? "transparent" : "rgba(255,255,255,0.01)",
                  opacity: invite.is_active ? 1 : 0.45,
                }}
              >
                {/* Code + copy */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      letterSpacing: "0.06em",
                      fontVariantNumeric: "tabular-nums",
                      color: invite.is_active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.38)",
                    }}
                  >
                    {invite.code}
                  </span>
                  {invite.is_active ? (
                    <button
                      type="button"
                      onClick={() => copyCode(invite)}
                      style={{
                        background: "none",
                        border: "none",
                        color: copiedId === invite.id ? "rgba(29,158,117,0.9)" : "rgba(255,255,255,0.25)",
                        fontSize: 11,
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                        transition: "color 0.15s ease",
                      }}
                    >
                      {copiedId === invite.id ? "Copied" : "Copy"}
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.22)",
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>

                {/* Uses bar */}
                <UsageBar current={invite.current_uses} max={invite.max_uses} />

                {/* Expires */}
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.38)",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  {formatDate(invite.expires_at)}
                </span>

                {/* Claimed at */}
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.38)",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  {formatDate(invite.claimed_at)}
                </span>

                {/* Actions */}
                <div style={{ textAlign: "right" }}>
                  {invite.is_active ? (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(invite.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(248,113,113,0.6)",
                        fontSize: 11,
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      Deactivate
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
