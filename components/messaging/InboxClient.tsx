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

export default function InboxClient() {
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
      else load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyInvite(null)
    }
  }

  if (!authLoading && !userId) {
    return (
      <Shell>
        <p style={{ color: C.muted }}>
          <Link href="/auth" style={{ color: C.text }}>Sign in</Link> to see your messages.
        </p>
      </Shell>
    )
  }

  const invites = (rows ?? []).filter((r) => r.my_status === "invited")
  const conversations = (rows ?? []).filter((r) => r.my_status === "active")

  return (
    <Shell
      actions={
        <>
          <button type="button" style={pillButton()} onClick={() => setDialog("group")}>New group</button>
          <button type="button" style={pillButton(true)} onClick={() => setDialog("direct")}>New message</button>
        </>
      }
    >
      {error ? (
        <div role="alert" style={{ display: "flex", gap: 12, alignItems: "center", color: "#ff8a8a", fontSize: 14 }}>
          {error}
          <button type="button" style={pillButton()} onClick={load}>Retry</button>
        </div>
      ) : null}

      {invites.length > 0 ? (
        <section aria-label="Group invitations" style={{ display: "grid", gap: 8 }}>
          <h2 style={sectionHeading}>Invitations</h2>
          {invites.map((invite) => (
            <div key={invite.conversation_id} style={{ ...rowStyle, cursor: "default" }}>
              <GroupGlyph />
              <span style={{ display: "grid", flex: 1, minWidth: 0 }}>
                <span style={{ color: C.text, fontSize: 15 }}>{invite.title}</span>
                <span style={{ color: C.muted, fontSize: 13 }}>
                  Private group · {invite.member_count} {invite.member_count === 1 ? "member" : "members"}
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

      <section aria-label="Conversations" style={{ display: "grid", gap: 4 }}>
        {rows === null && !error ? (
          <p style={{ color: C.muted }}>Loading…</p>
        ) : conversations.length === 0 ? (
          <div style={{ padding: "32px 0", color: C.muted, display: "grid", gap: 8 }}>
            <p style={{ margin: 0 }}>No messages yet.</p>
            <p style={{ margin: 0, fontSize: 13, color: C.faint }}>
              Message someone who follows you back, or start a private group.
            </p>
          </div>
        ) : (
          conversations.map((c) => <InboxRow key={c.conversation_id} c={c} userId={userId} />)
        )}
      </section>

      {dialog ? (
        <NewConversationDialog
          mode={dialog}
          onClose={() => setDialog(null)}
          onDone={(id) => { setDialog(null); router.push(`/messages/${id}`) }}
        />
      ) : null}
    </Shell>
  )
}

function InboxRow({ c, userId }: { c: ConversationSummary; userId: string | null }) {
  const name = conversationName(c)
  const unread = c.unread_count > 0
  const preview = c.last_message_body
    ? `${c.last_message_sender_id === userId ? "You: " : ""}${c.last_message_body}`
    : c.kind === "group" ? "No messages yet" : ""
  return (
    <Link href={`/messages/${c.conversation_id}`} style={rowStyle} data-testid="inbox-row">
      {c.kind === "group" ? <GroupGlyph /> : <Avatar url={c.other_avatar_url} name={name} />}
      <span style={{ display: "grid", flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ color: C.text, fontSize: 15, fontWeight: unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </span>
          <time dateTime={c.last_message_at ?? undefined} style={{ marginLeft: "auto", color: unread ? C.text : C.faint, fontSize: 12, flexShrink: 0 }}>
            {shortTimestamp(c.last_message_at)}
          </time>
        </span>
        <span style={{ color: unread ? C.text : C.muted, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {preview}
        </span>
      </span>
      {unread ? (
        <span aria-label={`${c.unread_count} unread`} style={{
          minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: C.accent, color: "#fff",
          fontSize: 11, fontWeight: 700, lineHeight: "20px", textAlign: "center", flexShrink: 0,
        }}>
          {c.unread_count > 99 ? "99+" : c.unread_count}
        </span>
      ) : null}
    </Link>
  )
}

function Shell({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 96px", display: "grid", gap: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 28, color: C.text, marginRight: "auto" }}>Messages</h1>
        {actions}
      </header>
      {children}
    </main>
  )
}

const sectionHeading: React.CSSProperties = {
  margin: 0, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.faint,
}

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 16,
  border: `1px solid ${C.line}`, background: C.panel, textDecoration: "none", color: "inherit",
}
