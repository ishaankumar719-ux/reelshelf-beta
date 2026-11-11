"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import type { SharedTitle } from "@/lib/messaging/api"

// Loaded on first use, so detail pages don't ship the chat picker up front.
const SendToChatDialog = dynamic(() => import("../messaging/SendToChatDialog"), { ssr: false })

/** Share for a detail page. Without `title` it copies the page link (the
 *  original behaviour). With `title` it opens a menu: Copy link, or Send to
 *  chat. */
export default function ShareButton({ className, style, title }: {
  className?: string
  style?: React.CSSProperties
  title?: SharedTitle
}) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  async function copyLink() {
    setMenuOpen(false)
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-secure context, etc.) — silent fail
    }
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => (title ? setMenuOpen((open) => !open) : void copyLink())}
        aria-haspopup={title ? "menu" : undefined}
        aria-expanded={title ? menuOpen : undefined}
        className={className}
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: copied
            ? "0.5px solid rgba(29,158,117,0.45)"
            : "0.5px solid rgba(255,255,255,0.2)",
          background: copied
            ? "rgba(29,158,117,0.12)"
            : "rgba(255,255,255,0.08)",
          color: copied ? "#1D9E75" : "rgba(255,255,255,0.82)",
          cursor: "pointer",
          transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
          fontWeight: 600,
          ...style,
        }}
      >
        <span>{copied ? "✓" : "↗"}</span>
        <span>{copied ? "Copied!" : "Share"}</span>
      </button>

      {title && menuOpen ? (
        <div role="menu" aria-label="Share"
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, minWidth: 180,
            padding: 6, borderRadius: 12, background: "#141416", border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)", display: "grid", gap: 2,
          }}>
          <MenuItem onClick={() => void copyLink()}>Copy link</MenuItem>
          <MenuItem onClick={() => { setMenuOpen(false); setSending(true) }}>Send to chat</MenuItem>
        </div>
      ) : null}

      {title && sending ? <SendToChatDialog title={title} onClose={() => setSending(false)} /> : null}
    </div>
  )
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      style={{
        textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent",
        color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 600, cursor: "pointer",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}>
      {children}
    </button>
  )
}
