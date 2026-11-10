"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { listReports, reviewReport, type MessageReport, type ReportStatus } from "@/lib/messaging/api"
import { C, pillButton, textInput } from "./ui"

const TABS: { value: ReportStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
]

export default function MessageReportsClient() {
  const [status, setStatus] = useState<ReportStatus>("open")
  const [reports, setReports] = useState<MessageReport[] | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const client = createClient()
    if (!client) return
    listReports(client, status).then(setReports).catch((e: Error) => setError(e.message))
  }, [status])

  useEffect(() => { load() }, [load])

  async function resolve(id: string, next: Exclude<ReportStatus, "open">) {
    const client = createClient()
    if (!client) return
    try {
      await reviewReport(client, id, next, notes[id])
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 16px 96px", display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0, color: C.text, fontSize: 26 }}>Message reports</h1>
      <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>
        Private. Reporters and reported users can&apos;t see this queue. You see the reported message only, not the rest of the conversation.
      </p>
      <div role="tablist" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={status === t.value} style={pillButton(status === t.value)}
            onClick={() => { if (t.value !== status) { setReports(null); setStatus(t.value) } }}>
            {t.label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" style={{ color: "#ff8a8a" }}>{error}</p> : null}
      {reports === null ? (
        <p style={{ color: C.muted }}>Loading…</p>
      ) : reports.length === 0 ? (
        <p style={{ color: C.muted }}>Nothing here.</p>
      ) : (
        reports.map((r) => (
          <article key={r.id} style={{ border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, display: "grid", gap: 10, background: C.panel }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: C.muted, fontSize: 12 }}>
              <span style={{ color: C.text, textTransform: "capitalize" }}>{r.reason.replace("_", " ")}</span>
              <span>Reported @{r.reported_username ?? "unknown"}</span>
              <span>by @{r.reporter_username ?? "unknown"}</span>
              <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString()}</time>
            </div>
            <blockquote style={{ margin: 0, padding: "8px 12px", borderLeft: `2px solid ${C.line}`, color: C.text, whiteSpace: "pre-wrap" }}>
              {r.message_body}
            </blockquote>
            {r.details ? <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Reporter&apos;s note: {r.details}</p> : null}
            {r.status === "open" || r.status === "reviewing" ? (
              <>
                <textarea rows={2} placeholder="Resolution note (private)" value={notes[r.id] ?? ""} maxLength={1000}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} style={{ ...textInput, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {r.status === "open" ? <button type="button" style={pillButton()} onClick={() => resolve(r.id, "reviewing")}>Mark reviewing</button> : null}
                  <button type="button" style={pillButton()} onClick={() => resolve(r.id, "dismissed")}>Dismiss</button>
                  <button type="button" style={pillButton(true)} onClick={() => resolve(r.id, "actioned")}>Actioned</button>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>
                {r.resolution_note ? `Note: ${r.resolution_note}` : "No note."} {r.reviewed_at ? `· ${new Date(r.reviewed_at).toLocaleString()}` : ""}
              </p>
            )}
          </article>
        ))
      )}
    </main>
  )
}
