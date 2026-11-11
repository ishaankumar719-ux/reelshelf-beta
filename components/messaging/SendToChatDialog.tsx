"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import {
  SHARE_NOTE_MAX_LENGTH,
  conversationName,
  listMessageableUsers,
  listShareDestinations,
  mediaTypeLabel,
  newClientId,
  openDirectConversation,
  shareTitle,
  type ConversationSummary,
  type MessageableUser,
  type SharedTitle,
} from "@/lib/messaging/api"
import { Avatar, C, GroupGlyph, Modal, pillButton, textInput } from "./ui"

type Destination =
  | { type: "conversation"; id: string; name: string }
  | { type: "person"; userId: string; name: string }

const destinationKey = (d: Destination) => (d.type === "conversation" ? `c:${d.id}` : `p:${d.userId}`)

/** "Send to chat" for one title: pick a recent DM, a joined group or a mutual
 *  follower, add an optional note, send to that one destination. */
export default function SendToChatDialog({ title, onClose }: { title: SharedTitle; onClose: () => void }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [recent, setRecent] = useState<ConversationSummary[] | null>(null)
  const [search, setSearch] = useState("")
  const [people, setPeople] = useState<MessageableUser[]>([])
  const [peopleFor, setPeopleFor] = useState<string | null>(null)
  const [selected, setSelected] = useState<Destination | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ conversationId: string; name: string } | null>(null)
  // One id per (destination, note): a retry after a failure reuses it, so the
  // server stores the share once even if the first attempt did land.
  const attempt = useRef<{ key: string; clientId: string; conversationId?: string } | null>(null)

  useEffect(() => {
    const client = createClient()
    if (!client || !userId) return
    let cancelled = false
    listShareDestinations(client)
      .then((rows) => { if (!cancelled) setRecent(rows) })
      .catch((e: Error) => { if (!cancelled) { setRecent([]); setError(e.message) } })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    const client = createClient()
    if (!client || !userId) return
    let cancelled = false
    const handle = window.setTimeout(() => {
      listMessageableUsers(client, search)
        .then((rows) => { if (!cancelled) setPeople(rows) })
        .catch(() => { if (!cancelled) setPeople([]) })
        .finally(() => { if (!cancelled) setPeopleFor(search) })
    }, 200)
    return () => { cancelled = true; window.clearTimeout(handle) }
  }, [search, userId])

  const query = search.trim().toLowerCase()
  const visibleRecent = useMemo(
    () => (recent ?? []).filter((c) => !query || conversationName(c).toLowerCase().includes(query)
      || (c.other_username ?? "").toLowerCase().includes(query)),
    [recent, query],
  )
  // People you already have a DM with show under Recent, not twice.
  const visiblePeople = useMemo(() => {
    const withDm = new Set((recent ?? []).filter((c) => c.kind === "direct").map((c) => c.other_user_id))
    return people.filter((p) => !withDm.has(p.user_id))
  }, [people, recent])

  async function send() {
    const client = createClient()
    if (!client || !selected || busy) return
    const key = `${destinationKey(selected)}|${note.trim()}`
    if (attempt.current?.key !== key) attempt.current = { key, clientId: newClientId() }
    const current = attempt.current
    setBusy(true)
    setError(null)
    try {
      const conversationId = selected.type === "conversation"
        ? selected.id
        : (current.conversationId ??= await openDirectConversation(client, selected.userId))
      await shareTitle(client, conversationId, title, note, current.clientId)
      setSent({ conversationId, name: selected.name })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const heading = "Send to chat"
  const summaryLine = `${mediaTypeLabel(title.media_type)} · ${title.title}${title.year ? ` (${title.year})` : ""}`

  if (!authLoading && !userId) {
    return (
      <Modal title={heading} onClose={onClose}>
        <p style={{ margin: 0, color: C.muted }}>
          <Link href="/auth" style={{ color: C.text }}>Sign in</Link> to send {title.title} to a friend.
        </p>
      </Modal>
    )
  }

  if (sent) {
    return (
      <Modal title={heading} onClose={onClose}>
        <p role="status" style={{ margin: 0, color: C.text }}>Sent {title.title} to {sent.name}.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/messages/${sent.conversationId}`} style={pillButton(true)}>Open chat</Link>
          <button type="button" onClick={onClose} style={pillButton()}>Done</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={heading} onClose={onClose}>
      <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>{summaryLine}</p>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats and friends"
        aria-label="Search chats and friends" style={textInput} />

      <div role="radiogroup" aria-label="Send to" style={{ display: "grid", gap: 4 }}>
        {recent === null ? <p style={{ margin: 0, color: C.muted }}>Loading…</p> : null}
        {visibleRecent.length ? <SectionLabel>Recent</SectionLabel> : null}
        {visibleRecent.map((c) => {
          const d: Destination = { type: "conversation", id: c.conversation_id, name: conversationName(c) }
          return (
            <Choice key={destinationKey(d)} selected={selected ? destinationKey(selected) === destinationKey(d) : false}
              onSelect={() => setSelected(d)} disabled={busy}
              icon={c.kind === "group" ? <GroupGlyph size={36} /> : <Avatar url={c.other_avatar_url} name={d.name} size={36} />}
              label={d.name} detail={c.kind === "group" ? `Group · ${c.member_count} ${c.member_count === 1 ? "member" : "members"}` : c.other_username ? `@${c.other_username}` : null} />
          )
        })}
        {visiblePeople.length ? <SectionLabel>Friends</SectionLabel> : null}
        {visiblePeople.map((p) => {
          const d: Destination = { type: "person", userId: p.user_id, name: p.display_name || `@${p.username}` }
          return (
            <Choice key={destinationKey(d)} selected={selected ? destinationKey(selected) === destinationKey(d) : false}
              onSelect={() => setSelected(d)} disabled={busy}
              icon={<Avatar url={p.avatar_url} name={d.name} size={36} />} label={d.name} detail={`@${p.username}`} />
          )
        })}
        {recent !== null && peopleFor === search && !visibleRecent.length && !visiblePeople.length ? (
          <p style={{ margin: 0, color: C.muted }}>
            {search ? "No chats or friends match that search." : "No chats yet. You can send titles to people who follow you back."}
          </p>
        ) : null}
      </div>

      <label style={{ display: "grid", gap: 6, color: C.muted, fontSize: 12 }}>
        Add a note (optional)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={SHARE_NOTE_MAX_LENGTH} rows={2}
          placeholder="Why they should watch or read it" style={{ ...textInput, resize: "vertical", fontFamily: "inherit" }} />
      </label>

      {error ? <p role="alert" style={{ margin: 0, color: "#ff8a8a", fontSize: 13 }}>{error}</p> : null}

      <button type="button" onClick={() => void send()} disabled={!selected || busy}
        style={{ ...pillButton(true), opacity: !selected || busy ? 0.6 : 1 }}>
        {busy ? "Sending…" : error ? "Try again" : selected ? `Send to ${selected.name}` : "Choose a chat"}
      </button>
    </Modal>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.faint, padding: "6px 4px 2px" }}>{children}</span>
}

function Choice({ selected, onSelect, disabled, icon, label, detail }: {
  selected: boolean
  onSelect: () => void
  disabled: boolean
  icon: React.ReactNode
  label: string
  detail: string | null
}) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 10px", borderRadius: 14,
        border: `1px solid ${selected ? "rgba(255,255,255,0.24)" : "transparent"}`,
        background: selected ? "rgba(255,255,255,0.06)" : "transparent", color: C.text, textAlign: "left", cursor: "pointer",
      }}>
      {icon}
      <span style={{ display: "grid", minWidth: 0 }}>
        <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {detail ? <span style={{ fontSize: 12, color: C.muted }}>{detail}</span> : null}
      </span>
      <span aria-hidden="true" style={{ marginLeft: "auto", color: selected ? C.text : C.faint }}>{selected ? "●" : "○"}</span>
    </button>
  )
}
