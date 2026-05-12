"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/AuthProvider"
import { uploadAttachment } from "@/lib/supabase/storage"

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "ui", label: "UI Issue" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
] as const

const fieldStyle: React.CSSProperties = {
  width: "100%",
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

const labelStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 12,
  color: "rgba(255,255,255,0.45)",
  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
  display: "block",
}

export default function BetaFeedbackButton() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>("bug")
  const [message, setMessage] = useState("")
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  function close() {
    setOpen(false)
    setCategory("bug")
    setMessage("")
    setScreenshotFile(null)
    setSubmitted(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const client = createClient()
      if (!client) throw new Error("Not connected to Supabase.")

      let screenshotUrl: string | null = null
      if (screenshotFile) {
        const result = await uploadAttachment(screenshotFile)
        if ("url" in result) {
          screenshotUrl = result.url
        }
      }

      const { error: insertError } = await client.from("beta_feedback").insert({
        user_id: user?.id ?? null,
        category,
        message: message.trim(),
        page_url: pathname,
        screenshot_url: screenshotUrl,
      })

      if (insertError) throw new Error(insertError.message)

      setSubmitted(true)
      window.setTimeout(() => close(), 2200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 86px)",
          right: 14,
          zIndex: 48,
          height: 34,
          padding: "0 13px",
          borderRadius: 999,
          border: "0.5px solid rgba(255,255,255,0.13)",
          background: "rgba(10,10,16,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "rgba(255,255,255,0.52)",
          fontSize: 11,
          letterSpacing: "0.04em",
          cursor: "pointer",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
          boxShadow: "0 2px 12px rgba(0,0,0,0.28)",
          transition: "color 0.15s ease, border-color 0.15s ease",
        }}
        className="md:bottom-4"
        onMouseEnter={(ev) => {
          ev.currentTarget.style.color = "rgba(255,255,255,0.78)"
          ev.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"
        }}
        onMouseLeave={(ev) => {
          ev.currentTarget.style.color = "rgba(255,255,255,0.52)"
          ev.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"
        }}
      >
        Feedback
      </button>

      {/* Backdrop + modal */}
      {open ? (
        <div
          ref={backdropRef}
          onClick={(e) => {
            if (e.target === backdropRef.current) close()
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 24,
              border: "0.5px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(180deg, rgba(14,14,22,0.99) 0%, rgba(8,8,14,0.99) 100%)",
              boxShadow: "0 28px 90px rgba(0,0,0,0.65)",
              padding: "22px 22px 24px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.28)",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  ReelShelf Beta
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 17,
                    fontWeight: 500,
                    letterSpacing: "-0.3px",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  Send Feedback
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 22,
                  cursor: "pointer",
                  padding: "0 0 0 8px",
                  lineHeight: 1,
                  marginTop: -2,
                }}
              >
                ×
              </button>
            </div>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "rgba(29,158,117,0.14)",
                    border: "0.5px solid rgba(29,158,117,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                    fontSize: 18,
                  }}
                >
                  ✓
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "rgba(255,255,255,0.75)",
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                  }}
                >
                  Feedback received. Thank you.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Category */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ ...fieldStyle, height: 42, appearance: "none", paddingRight: 12 }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value} style={{ background: "#0e0e16" }}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="What did you notice?"
                    style={{ ...fieldStyle, padding: "10px 12px", resize: "none", lineHeight: 1.65 }}
                  />
                </div>

                {/* Screenshot (optional) */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    Screenshot{" "}
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                  />
                  {screenshotFile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.55)",
                          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 280,
                        }}
                      >
                        {screenshotFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScreenshotFile(null)}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      style={{
                        height: 36,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        color: "rgba(255,255,255,0.38)",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                      }}
                    >
                      Attach screenshot
                    </button>
                  )}
                </div>

                {error ? (
                  <p
                    style={{
                      margin: "0 0 14px",
                      color: "#f87171",
                      fontSize: 13,
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 999,
                    border: "none",
                    background: "white",
                    color: "black",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: submitting || !message.trim() ? "not-allowed" : "pointer",
                    opacity: submitting || !message.trim() ? 0.5 : 1,
                    fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {submitting ? "Sending…" : "Send Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
