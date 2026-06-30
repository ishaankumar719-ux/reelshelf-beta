"use client"

import { useState } from "react"

export default function ShareButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-secure context, etc.) — silent fail
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
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
  )
}
