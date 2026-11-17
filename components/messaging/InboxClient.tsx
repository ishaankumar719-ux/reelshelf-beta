"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import {
  conversationName,
  listConversations,
  respondToInvite,
  shortTimestamp,
  subscribeToInbox,
  type ConversationSummary,
} from "@/lib/messaging/api"
import NewConversationDialog from "./NewConversationDialog"
import { Avatar, C, GroupGlyph, pillButton } from "./ui"

/** The conversation list: the left column on desktop, the whole page on
 *  phones. `activeId` is the conversation open beside it, if any. */
export default function InboxClient({ activeId = null }: { activeId?: string | null }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<ConversationSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<"direct" | "group" | null>(null)
  const [busyInvite, setBusyInvite] = useState<string | null>(null)
  const userId = user?.id ?? null

  const load = useCallback(() => {
    const client = createClient()
    if (!client) return
    listConversations(client)
      .then((next) => { setRows(next); setError(null) })
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    const client = createClient()
    if (!client || !userId) return
    load()
    const unsubscribe = subscribeToInbox(client, userId, load)
    const onVisible = () => { if (document.visibilityState === "visible") load() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { unsubscribe(); document.removeEventListener("visibilitychange", onVisible) }
  }, [userId, load])

  async function answer(conversationId: string, accept: boolean) {
    const client = createClient()
    if (!client) return
    setBusyInvite(conversationId)
    try {
      await respondToInvite(client, conversationId, accept)
      if (accept) router.push(`/messages/${conversationId}`)
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyInvite(null)
    }
  }

  const invites = (rows ?? []).filter((r) => r.my_status === "invited")
  const conversations = (rows ?? []).filter((r) => r.my_status === "active")
  const unreadTotal = conversations.reduce((n, c) => n + (c.unread_count > 0 && c.conversation_id !== activeId ? 1 : 0), 0)

  return (
    <>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 16px 10px" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, marginRight: "auto", fontFamily: C.font }}>
          Messages
          {unreadTotal > 0 ? (
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: C.accent }}>{unreadTotal} unread</span>
          ) : null}
        </h1>
        <button type="button" style={iconButton} onClick={() => setDialog("group")} aria-label="New group" title="New group">
          <GroupIcon />
        </button>
        <button type="button" style={{ ...iconButton, background: C.accentSoft, color: C.accent }} onClick={() => setDialog("direct")}
          aria-label="New message" title="New message">
          <ComposeIcon />
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 12px" }}>
        {!authLoading && !userId ? (
          <p style={{ color: C.muted, padding: "8px 8px" }}>
            <Link href="/auth" style={{ color: C.text }}>Sign in</Link> to see your messages.
          </p>
        ) : null}

        {error ? (
          <div role="alert" style={{ display: "flex", gap: 12, alignItems: "center", color: C.danger, fontSize: 14, padding: 8 }}>
            {error}
            <button type="button" style={pillButton()} onClick={load}>Retry</button>
          </div>
        ) : null}

        {invites.length > 0 ? (
          <section aria-label="Group invitations" style={{ display: "grid", gap: 6, padding: "4px 0 12px" }}>
            <h2 style={sectionHeading}>Invitations</h2>
            {invites.map((invite) => (
              <div key={invite.conversation_id} style={{ ...rowStyle, background: C.panel, border: `1px solid ${C.line}` }}>
                <GroupGlyph size={44} />
                <span style={{ display: "grid", flex: 1, minWidth: 0, gap: 2 }}>
                  <span style={{ color: C.text, fontSize: 15, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{invite.title}</span>
                  <span style={{ color: C.muted, fontSize: 13 }}>
                    {invite.member_count} {invite.member_count === 1 ? "member" : "members"}
                  </span>
                </span>
                <button type="button" disabled={busyInvite === invite.conversation_id} style={pillButton()}
                  onClick={() => answer(invite.conversation_id, false)}>Decline</button>
                <button type="button" disabled={busyInvite === invite.conversation_id} style={pillButton(true)}
                  onClick={() => answer(invite.conversation_id, true)}>Join</button>
              </div>
            ))}
          </section>
        ) : null}

        {userId ? (
          <nav aria-label="Conversation list" style={{ display: "grid", gap: 2 }}>
            {rows === null && !error ? (
              <p style={{ color: C.muted, padding: 8 }}>Loading…</p>
            ) : conversations.length === 0 ? (
              <div style={{ padding: "24px 8px", color: C.muted, display: "grid", gap: 6 }}>
                <p style={{ margin: 0, color: C.text }}>No messages yet</p>
                <p style={{ margin: 0, fontSize: 13 }}>Message someone who follows you back, or start a private group.</p>
              </div>
            ) : (
              conversations.map((c) => (
                <InboxRow key={c.conversation_id} c={c} userId={userId} active={c.conversation_id === activeId} />
              ))
            )}
          </nav>
        ) : null}
      </div>

      {dialog ? (
        <NewConversationDialog
          mode={dialog}
          onClose={() => setDialog(null)}
          onDone={(id) => { setDialog(null); load(); router.push(`/messages/${id}`) }}
        />
      ) : null}
    </>
  )
}

function InboxRow({ c, userId, active }: { c: ConversationSummary; userId: string | null; active: boolean }) {
  const name = conversationName(c)
  const unread = c.unread_count > 0 && !active
  const preview = c.last_message_body
    ? `${c.last_message_sender_id === userId ? "You: " : ""}${c.last_message_body}`
    : c.kind === "group" ? "No messages yet" : ""
  return (
    <Link
      href={`/messages/${c.conversation_id}`}
      aria-current={active ? "page" : undefined}
      aria-label={`${name}${unread ? `, ${c.unread_count} unread` : ""}`}
      data-testid="inbox-row"
      style={{
        ...rowStyle,
        background: active ? C.elevated : "transparent",
        boxShadow: active ? `inset 0 0 0 1px ${C.line}` : "none",
      }}
    >
      {c.kind === "group" ? <GroupGlyph size={44} /> : <Avatar url={c.other_avatar_url} name={name} size={44} />}
      <span style={{ display: "grid", flex: 1, minWidth: 0, gap: 3 }}>
        <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ color: C.text, fontSize: 15, fontWeight: unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </span>
          <time dateTime={c.last_message_at ?? undefined}
            style={{ marginLeft: "auto", color: unread ? C.accent : C.faint, fontSize: 12, fontWeight: unread ? 600 : 400, flexShrink: 0 }}>
            {shortTimestamp(c.last_message_at)}
          </time>
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ flex: 1, minWidth: 0, color: unread ? C.text : C.muted, fontSize: 13, fontWeight: unread ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {preview}
          </span>
          {unread ? (
            <span aria-hidden="true" style={{
              minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: C.accent, color: "#fff",
              fontSize: 11, fontWeight: 700, lineHeight: "20px", textAlign: "center", flexShrink: 0, boxSizing: "border-box",
            }}>
              {c.unread_count > 99 ? "99+" : c.unread_count}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

function ComposeIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  )
}

function GroupIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  )
}

const iconButton: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.06)", color: C.text,
  display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
}

const sectionHeading: React.CSSProperties = {
  margin: "0 8px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint,
}

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 14,
  textDecoration: "none", color: "inherit", minHeight: 64, boxSizing: "border-box",
}
