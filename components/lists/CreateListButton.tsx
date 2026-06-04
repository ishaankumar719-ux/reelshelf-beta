"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createList } from "@/lib/supabase/lists"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

export default function CreateListButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [isRanked, setIsRanked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setTitle("")
    setDescription("")
    setIsPublic(true)
    setIsRanked(true)
    setError(null)
  }

  function closeModal() {
    setOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const client = createClient()
    if (!client) { setError("Not connected. Please refresh."); return }

    setSaving(true)
    setError(null)

    const created = await createList(client, userId, {
      title: trimmedTitle,
      description: description.trim() || undefined,
      is_public: isPublic,
      is_ranked: isRanked,
    })

    setSaving(false)

    if (!created) {
      setError("Failed to create list. Please try again.")
      return
    }

    closeModal()
    router.push(`/lists/${created.id}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 12px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.65)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          cursor: "pointer",
          fontFamily: FONT,
          transition: "all 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"
          e.currentTarget.style.color = "rgba(255,255,255,0.88)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"
          e.currentTarget.style.color = "rgba(255,255,255,0.65)"
        }}
      >
        + New list
      </button>

      {open && (
        /* Backdrop */
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            fontFamily: FONT,
          }}
          onPointerDown={closeModal}
        >
          {/* Panel */}
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              borderRadius: "20px 20px 0 0",
              background: "rgba(12,12,20,0.99)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderBottom: "none",
              boxShadow: "0 -8px 48px rgba(0,0,0,0.6)",
              padding: "12px 24px 40px",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            </div>

            <h2
              style={{
                margin: "0 0 20px",
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              New list
            </h2>

            <form onSubmit={(e) => void handleSubmit(e)}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Title */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="List title *"
                  maxLength={100}
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "11px 14px",
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description (optional)"
                  rows={2}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "11px 14px",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    outline: "none",
                    resize: "none",
                    fontFamily: FONT,
                    boxSizing: "border-box",
                  }}
                />

                {/* Toggles */}
                <div style={{ display: "flex", gap: 8 }}>
                  <ToggleChip
                    active={isPublic}
                    label={isPublic ? "Public" : "Private"}
                    onClick={() => setIsPublic((v) => !v)}
                  />
                  <ToggleChip
                    active={isRanked}
                    label={isRanked ? "Ranked" : "Unranked"}
                    onClick={() => setIsRanked((v) => !v)}
                  />
                </div>

                {error && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "rgba(251,113,133,0.8)",
                    }}
                  >
                    {error}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={saving || !title.trim()}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 10,
                      border: "none",
                      background: saving || !title.trim()
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.12)",
                      color: saving || !title.trim()
                        ? "rgba(255,255,255,0.28)"
                        : "rgba(255,255,255,0.92)",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      cursor: saving || !title.trim() ? "not-allowed" : "pointer",
                      fontFamily: FONT,
                      transition: "all 0.15s",
                    }}
                  >
                    {saving ? "Creating…" : "Create list"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      height: 44,
                      padding: "0 20px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.38)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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
        height: 32,
        padding: "0 14px",
        borderRadius: 999,
        border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
        color: active ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.32)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.04em",
        fontFamily: FONT,
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  )
}
