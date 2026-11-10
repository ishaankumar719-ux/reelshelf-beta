"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  createGroup,
  inviteToGroup,
  listMessageableUsers,
  openDirectConversation,
  type MessageableUser,
} from "@/lib/messaging/api"
import { Avatar, C, Modal, pillButton, textInput } from "./ui"

type Mode = "direct" | "group" | "invite"

/** Pick a mutual follower to DM, name a group and pick invitees, or (mode
 *  "invite") add people to an existing group. */
export default function NewConversationDialog({
  mode: initialMode,
  conversationId,
  excludeIds = [],
  onClose,
  onDone,
}: {
  mode: Mode
  conversationId?: string
  excludeIds?: string[]
  onClose: () => void
  onDone: (conversationId: string) => void
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [search, setSearch] = useState("")
  const [people, setPeople] = useState<MessageableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const client = createClient()
    if (!client) return
    let cancelled = false
    setLoading(true)
    const handle = window.setTimeout(() => {
      listMessageableUsers(client, search)
        .then((rows) => { if (!cancelled) setPeople(rows) })
        .catch((e: Error) => { if (!cancelled) setError(e.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 200)
    return () => { cancelled = true; window.clearTimeout(handle) }
  }, [search])

  const visible = people.filter((p) => !excludeIds.includes(p.user_id))

  async function startDirect(userId: string) {
    const client = createClient()
    if (!client || busy) return
    setBusy(true)
    setError(null)
    try {
      onDone(await openDirectConversation(client, userId))
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  async function submitGroup() {
    const client = createClient()
    if (!client || busy) return
    setBusy(true)
    setError(null)
    try {
      if (mode === "invite" && conversationId) {
        await inviteToGroup(client, conversationId, selected)
        onDone(conversationId)
      } else {
        onDone(await createGroup(client, title, selected))
      }
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const heading = mode === "direct" ? "New message" : mode === "group" ? "New group" : "Invite people"

  return (
    <Modal title={heading} onClose={onClose}>
      {mode !== "invite" ? (
        <div style={{ display: "flex", gap: 8 }} role="tablist">
          {(["direct", "group"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              style={pillButton(mode === m)}>
              {m === "direct" ? "Message" : "Group"}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "group" ? (
        <label style={{ display: "grid", gap: 6, color: C.muted, fontSize: 12 }}>
          Group name
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. District 12 book club"
            style={textInput} />
        </label>
      ) : null}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people you follow each other with"
        aria-label="Search mutual followers" style={textInput} />

      <p style={{ margin: 0, color: C.faint, fontSize: 12 }}>
        {mode === "direct"
          ? "You can message people who follow you back."
          : "You can invite people who follow you back. They'll join once they accept."}
      </p>

      <div style={{ display: "grid", gap: 4 }}>
        {loading ? (
          <p style={{ color: C.muted, margin: 0 }}>Loading…</p>
        ) : visible.length === 0 ? (
          <p style={{ color: C.muted, margin: 0 }}>
            {search ? "Nobody matches that search." : "No mutual followers yet. Follow people and ask them to follow you back."}
          </p>
        ) : (
          visible.map((person) => {
            const name = person.display_name || `@${person.username}`
            const isSelected = selected.includes(person.user_id)
            return (
              <button
                key={person.user_id}
                type="button"
                disabled={busy}
                onClick={() => (mode === "direct" ? startDirect(person.user_id) : toggle(person.user_id))}
                aria-pressed={mode === "direct" ? undefined : isSelected}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 10px",
                  borderRadius: 14, border: `1px solid ${isSelected ? "rgba(255,255,255,0.24)" : "transparent"}`,
                  background: isSelected ? "rgba(255,255,255,0.06)" : "transparent", color: C.text,
                  textAlign: "left", cursor: "pointer",
                }}
              >
                <Avatar url={person.avatar_url} name={name} size={36} />
                <span style={{ display: "grid" }}>
                  <span style={{ fontSize: 14 }}>{name}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>@{person.username}</span>
                </span>
                {mode !== "direct" ? (
                  <span style={{ marginLeft: "auto", color: isSelected ? C.text : C.faint }}>{isSelected ? "✓" : "+"}</span>
                ) : null}
              </button>
            )
          })
        )}
      </div>

      {error ? <p role="alert" style={{ margin: 0, color: "#ff8a8a", fontSize: 13 }}>{error}</p> : null}

      {mode !== "direct" ? (
        <button
          type="button"
          onClick={submitGroup}
          disabled={busy || (mode === "group" ? !title.trim() : selected.length === 0)}
          style={{ ...pillButton(true), opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "…" : mode === "group" ? `Create group${selected.length ? ` · invite ${selected.length}` : ""}` : `Invite ${selected.length}`}
        </button>
      ) : null}
    </Modal>
  )
}
