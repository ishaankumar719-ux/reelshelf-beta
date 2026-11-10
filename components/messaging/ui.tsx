"use client"

import type { CSSProperties, ReactNode } from "react"

export const C = {
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.35)",
  line: "rgba(255,255,255,0.08)",
  panel: "rgba(255,255,255,0.03)",
  accent: "#e5484d",
  mine: "rgba(255,255,255,0.14)",
  theirs: "rgba(255,255,255,0.05)",
}

export const pillButton = (primary = false): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 36,
  padding: "0 16px",
  borderRadius: 999,
  border: `1px solid ${primary ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)"}`,
  background: primary ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.04)",
  color: C.text,
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
  textDecoration: "none",
  flexShrink: 0,
})

export const textInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 14,
  border: `1px solid ${C.line}`,
  background: "rgba(255,255,255,0.04)",
  color: C.text,
  padding: "10px 14px",
  fontSize: 15,
  outline: "none",
}

export function Avatar({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  const initial = name.replace(/^@/, "").charAt(0).toUpperCase() || "?"
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.08)",
        color: C.muted,
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      ) : (
        initial
      )}
    </span>
  )
}

export function GroupGlyph({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.08)",
        color: C.muted,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M15.5 14.2c2.5-.3 4.4 1.3 5 4.3" />
      </svg>
    </span>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
      onKeyDown={(event) => { if (event.key === "Escape") onClose() }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: 22,
          border: `1px solid ${C.line}`,
          background: "#0f0f10",
          padding: 20,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: C.text }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ ...pillButton(), width: 36, padding: 0 }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
