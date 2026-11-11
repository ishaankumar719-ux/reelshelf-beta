"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import {
  MESSAGE_MAX_LENGTH,
  blockUser,
  conversationName,
  fetchMessages,
  getConversation,
  leaveGroup,
  listMembers,
  markRead,
  mergeMessages,
  newClientId,
  removeMember,
  reportMessage,
  respondToInvite,
  sendMessage,
  subscribeToConversation,
  unblockUser,
  type ChatMessage,
  type ConversationMember,
  type ConversationSummary,
  type ReportReason,
} from "@/lib/messaging/api"
import NewConversationDialog from "./NewConversationDialog"
import { Avatar, C, GroupGlyph, Modal, pillButton, textInput } from "./ui"

type LocalMessage = ChatMessage & { state: "sent" | "sending" | "failed" }

// Unsent messages sort after everything stored, in the order they were written.
let pendingSeq = Number.MAX_SAFE_INTEGER / 2

export default function ConversationClient({ conversationId }: { conversationId: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const userId = user?.id ?? null
  const [summary, setSummary] = useState<ConversationSummary | null | undefined>(undefined)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<"members" | "invite" | null>(null)
  const [reporting, setReporting] = useState<ChatMessage | null>(null)
  const [names, setNames] = useState<Record<string, string>>({})
  const listRef = useRef<HTMLDivElement | null>(null)
  const stickToBottom = useRef(true)

  const refreshSummary = useCallback(async () => {
    const client = createClient()
    if (!client) return null
    const next = await getConversation(client, conversationId)
    setSummary(next)
    return next
  }, [conversationId])

  const markSeen = useCallback(() => {
    const client = createClient()
    if (!client || document.visibilityState !== "visible") return
    markRead(client, conversationId).catch(() => { /* not active any more; summary refresh shows why */ })
  }, [conversationId])

  // Initial load + realtime.
  useEffect(() => {
    const client = createClient()
    if (!client || !userId) return
    let cancelled = false

    async function loadLatest() {
      try {
        const current = await refreshSummary()
        if (cancelled || !current || current.my_status !== "active") return
        if (current.kind === "group") {
          listMembers(client!, conversationId)
            .then((rows) => { if (!cancelled) setNames(Object.fromEntries(rows.map((m) => [m.user_id, m.display_name || `@${m.username}`]))) })
            .catch(() => { /* names are cosmetic */ })
        }
        const page = await fetchMessages(client!, conversationId)
        if (cancelled) return
        setMessages((prev) => mergeMessages(prev, page.messages.map((m) => ({ ...m, state: "sent" as const }))))
        setHasMore((prev) => prev || page.hasMore)
        markSeen()
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }

    void loadLatest()
    const unsubscribe = subscribeToConversation(client, conversationId, (incoming) => {
      setMessages((prev) => mergeMessages(prev, [{ ...incoming, state: "sent" }]))
      if (incoming.sender_id !== userId) markSeen()
    })
    // Catch up on anything missed while the tab was hidden or offline.
    const onVisible = () => { if (document.visibilityState === "visible") void loadLatest() }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onVisible)
    return () => {
      cancelled = true
      unsubscribe()
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onVisible)
    }
  }, [conversationId, userId, refreshSummary, markSeen])

  // Keep the view pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = listRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  async function loadEarlier() {
    const client = createClient()
    const oldest = messages.find((m) => m.state === "sent")
    if (!client || !oldest || loadingEarlier) return
    setLoadingEarlier(true)
    const el = listRef.current
    const before = el ? el.scrollHeight - el.scrollTop : 0
    try {
      const page = await fetchMessages(client, conversationId, { beforeSeq: oldest.seq })
      stickToBottom.current = false
      setMessages((prev) => mergeMessages(prev, page.messages.map((m) => ({ ...m, state: "sent" as const }))))
      setHasMore(page.hasMore)
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - before })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingEarlier(false)
    }
  }

  async function deliver(local: LocalMessage) {
    const client = createClient()
    if (!client) return
    setMessages((prev) => prev.map((m) => (m.client_id === local.client_id ? { ...m, state: "sending" } : m)))
    try {
      const stored = await sendMessage(client, conversationId, local.body, local.client_id)
      setMessages((prev) => mergeMessages(prev, [{ ...stored, state: "sent" }]))
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.client_id === local.client_id ? { ...m, state: "failed" } : m)))
      setError((e as Error).message)
      void refreshSummary()
    }
  }

  function submit() {
    const body = draft.trim()
    if (!body || !userId) return
    const local: LocalMessage = {
      id: `local-${newClientId()}`,
      client_id: newClientId(),
      conversation_id: conversationId,
      sender_id: userId,
      body,
      seq: (pendingSeq += 1),
      created_at: new Date().toISOString(),
      state: "sending",
    }
    stickToBottom.current = true
    setDraft("")
    setError(null)
    setMessages((prev) => [...prev, local])
    void deliver(local)
  }

  async function act(fn: () => Promise<unknown>, after?: () => void) {
    try {
      setError(null)
      await fn()
      after?.()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!authLoading && !userId) {
    return <Frame><p style={{ color: C.muted }}><Link href="/auth" style={{ color: C.text }}>Sign in</Link> to see your messages.</p></Frame>
  }
  if (summary === undefined) return <Frame><p style={{ color: C.muted }}>Loading…</p></Frame>
  if (summary === null) {
    return (
      <Frame>
        <p style={{ color: C.muted }}>This conversation isn&apos;t available. You may have left it or been removed.</p>
        <Link href="/messages" style={pillButton()}>Back to messages</Link>
      </Frame>
    )
  }

  const client = createClient()
  const name = conversationName(summary)

  if (summary.my_status === "invited") {
    return (
      <Frame>
        <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
          <GroupGlyph size={56} />
          <h1 style={{ margin: 0, color: C.text, fontSize: 22 }}>{name}</h1>
          <p style={{ margin: 0, color: C.muted }}>You&apos;ve been invited to this private group. Join to read and send messages.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={pillButton()} onClick={() => client && act(() => respondToInvite(client, conversationId, false), () => router.push("/messages"))}>Decline</button>
            <button type="button" style={pillButton(true)} onClick={() => client && act(() => respondToInvite(client, conversationId, true), () => { window.location.reload() })}>Join group</button>
          </div>
          {error ? <p role="alert" style={{ color: "#ff8a8a" }}>{error}</p> : null}
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <header style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
        <Link href="/messages" aria-label="Back to messages" style={{ ...pillButton(), width: 36, padding: 0 }}>←</Link>
        {summary.kind === "group" ? <GroupGlyph size={36} /> : <Avatar url={summary.other_avatar_url} name={name} size={36} />}
        <span style={{ display: "grid", minWidth: 0, flex: 1 }}>
          {summary.kind === "direct" && summary.other_username ? (
            <Link href={`/u/${summary.other_username}`} style={{ color: C.text, fontSize: 16, textDecoration: "none" }}>{name}</Link>
          ) : (
            <span style={{ color: C.text, fontSize: 16 }}>{name}</span>
          )}
          <span style={{ color: C.muted, fontSize: 12 }}>
            {summary.kind === "group" ? `Private group · ${summary.member_count} members` : summary.other_username ? `@${summary.other_username}` : ""}
          </span>
        </span>
        {summary.kind === "group" ? (
          <button type="button" style={pillButton()} onClick={() => setPanel("members")}>Members</button>
        ) : summary.other_user_id ? (
          <button
            type="button"
            style={pillButton()}
            onClick={() => client && summary.other_user_id && act(
              () => (summary.i_blocked ? unblockUser(client, summary.other_user_id!) : blockUser(client, summary.other_user_id!)),
              () => void refreshSummary(),
            )}
          >
            {summary.i_blocked ? "Unblock" : "Block"}
          </button>
        ) : null}
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        aria-live="polite"
        style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, padding: "12px 0" }}
      >
        {hasMore ? (
          <button type="button" onClick={loadEarlier} disabled={loadingEarlier} style={{ ...pillButton(), alignSelf: "center" }}>
            {loadingEarlier ? "Loading…" : "Load earlier messages"}
          </button>
        ) : null}
        {messages.length === 0 ? (
          <p style={{ color: C.faint, textAlign: "center", margin: "auto 0" }}>No messages yet. Say hello.</p>
        ) : null}
        {messages.map((m) => (
          <Bubble key={m.client_id} message={m} mine={m.sender_id === userId}
            senderName={summary.kind === "group" && m.sender_id ? names[m.sender_id] ?? "Former member" : null}
            onRetry={() => void deliver(m)} onReport={() => setReporting(m)} />
        ))}
      </div>

      {error ? <p role="alert" style={{ margin: "0 0 8px", color: "#ff8a8a", fontSize: 13 }}>{error}</p> : null}

      {summary.can_send ? (
        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingTop: 8, borderTop: `1px solid ${C.line}` }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={1}
            placeholder="Message"
            aria-label="Message"
            style={{ ...textInput, resize: "none", maxHeight: 160, minHeight: 42 }}
          />
          <button type="submit" disabled={!draft.trim()} style={{ ...pillButton(true), height: 42, opacity: draft.trim() ? 1 : 0.5 }}>Send</button>
        </form>
      ) : (
        <p style={{ color: C.muted, fontSize: 13, textAlign: "center", paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
          {summary.i_blocked
            ? "You blocked this account. Unblock to send messages."
            : summary.kind === "direct" && !summary.other_user_id
              ? "This account no longer exists."
              : "You can't send messages in this conversation."}
        </p>
      )}

      {panel === "members" ? (
        <MembersPanel
          summary={summary}
          userId={userId}
          onClose={() => setPanel(null)}
          onInvite={() => setPanel("invite")}
          onLeft={() => router.push("/messages")}
          onChanged={() => void refreshSummary()}
        />
      ) : null}
      {panel === "invite" ? (
        <NewConversationDialog mode="invite" conversationId={conversationId} onClose={() => setPanel(null)}
          onDone={() => { setPanel(null); void refreshSummary() }} />
      ) : null}
      {reporting ? <ReportDialog message={reporting} onClose={() => setReporting(null)} /> : null}
    </Frame>
  )
}

function Bubble({ message, mine, senderName, onRetry, onReport }: {
  message: LocalMessage
  mine: boolean
  senderName: string | null
  onRetry: () => void
  onReport: () => void
}) {
  const time = new Date(message.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  return (
    <div data-testid="message" data-state={message.state}
      style={{ display: "grid", justifyItems: mine ? "end" : "start", gap: 2, opacity: message.state === "sending" ? 0.6 : 1 }}>
      {senderName && !mine ? <span style={{ fontSize: 11, color: C.muted, paddingLeft: 4 }}>{senderName}</span> : null}
      <div style={{
        maxWidth: "78%", padding: "8px 12px", borderRadius: 16, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
        background: mine ? C.mine : C.theirs, color: C.text, fontSize: 15, lineHeight: 1.4,
        border: message.state === "failed" ? "1px solid #ff8a8a" : "1px solid transparent",
      }}>
        {message.body}
      </div>
      <span style={{ display: "flex", gap: 8, fontSize: 11, color: C.faint }}>
        {message.state === "failed" ? (
          <>
            <span style={{ color: "#ff8a8a" }}>Not sent</span>
            <button type="button" onClick={onRetry} style={linkButton}>Retry</button>
          </>
        ) : message.state === "sending" ? "Sending…" : time}
        {!mine && message.state === "sent" ? <button type="button" onClick={onReport} style={linkButton}>Report</button> : null}
      </span>
    </div>
  )
}

function MembersPanel({ summary, userId, onClose, onInvite, onLeft, onChanged }: {
  summary: ConversationSummary
  userId: string | null
  onClose: () => void
  onInvite: () => void
  onLeft: () => void
  onChanged: () => void
}) {
  const [members, setMembers] = useState<ConversationMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isOwner = summary.my_role === "owner"

  const load = useCallback(() => {
    const client = createClient()
    if (!client) return
    listMembers(client, summary.conversation_id)
      .then(setMembers)
      .catch((e: Error) => setError(e.message))
  }, [summary.conversation_id])

  useEffect(() => { load() }, [load])

  async function run(fn: () => Promise<unknown>, after: () => void) {
    try { setError(null); await fn(); after() } catch (e) { setError((e as Error).message) }
  }
  const client = createClient()

  return (
    <Modal title={summary.title ?? "Group"} onClose={onClose}>
      <div style={{ display: "grid", gap: 6 }}>
        {(members ?? []).map((m) => {
          const name = m.display_name || `@${m.username}`
          return (
            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar url={m.avatar_url} name={name} size={32} />
              <span style={{ display: "grid", flex: 1 }}>
                <span style={{ color: C.text, fontSize: 14 }}>{name}{m.user_id === userId ? " (you)" : ""}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>{m.role === "owner" ? "Owner" : m.status === "invited" ? "Invited" : "Member"}</span>
              </span>
              {isOwner && m.user_id !== userId ? (
                <button type="button" style={pillButton()}
                  onClick={() => client && run(() => removeMember(client, summary.conversation_id, m.user_id), () => { load(); onChanged() })}>
                  {m.status === "invited" ? "Cancel invite" : "Remove"}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
      {error ? <p role="alert" style={{ margin: 0, color: "#ff8a8a", fontSize: 13 }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" style={pillButton()}
          onClick={() => client && window.confirm("Leave this group? You'll stop seeing its messages.") &&
            run(() => leaveGroup(client, summary.conversation_id), onLeft)}>
          Leave group
        </button>
        {isOwner ? <button type="button" style={pillButton(true)} onClick={onInvite}>Invite people</button> : null}
      </div>
    </Modal>
  )
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech" },
  { value: "sexual", label: "Sexual content" },
  { value: "self_harm", label: "Self-harm" },
  { value: "other", label: "Something else" },
]

function ReportDialog({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>("spam")
  const [details, setDetails] = useState("")
  const [state, setState] = useState<"idle" | "busy" | "done">("idle")
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const client = createClient()
    if (!client) return
    setState("busy")
    try {
      await reportMessage(client, message.id, reason, details)
      setState("done")
    } catch (e) {
      setError((e as Error).message)
      setState("idle")
    }
  }

  return (
    <Modal title="Report message" onClose={onClose}>
      {state === "done" ? (
        <>
          <p style={{ margin: 0, color: C.text }}>Thanks. The ReelShelf team will review this privately. The sender isn&apos;t told who reported it.</p>
          <button type="button" style={pillButton(true)} onClick={onClose}>Done</button>
        </>
      ) : (
        <>
          <blockquote style={{ margin: 0, padding: "8px 12px", borderLeft: `2px solid ${C.line}`, color: C.muted, whiteSpace: "pre-wrap" }}>
            {message.body}
          </blockquote>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 6 }}>
            <legend style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>What&apos;s wrong with it?</legend>
            {REASONS.map((r) => (
              <label key={r.value} style={{ display: "flex", gap: 8, color: C.text, fontSize: 14 }}>
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                {r.label}
              </label>
            ))}
          </fieldset>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3}
            placeholder="Anything else we should know? (optional)" style={{ ...textInput, resize: "vertical" }} />
          {error ? <p role="alert" style={{ margin: 0, color: "#ff8a8a", fontSize: 13 }}>{error}</p> : null}
          <button type="button" disabled={state === "busy"} style={pillButton(true)} onClick={submit}>
            {state === "busy" ? "…" : "Send report"}
          </button>
        </>
      )}
    </Modal>
  )
}

// On phones the site has a fixed bottom nav (~90px); keep the composer above it.
const FRAME_CSS = `@media (max-width: 760px) {
  .messages-thread { height: calc(100dvh - 64px - 96px - env(safe-area-inset-bottom, 0px)) !important; padding-bottom: 8px !important; }
}`

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="messages-thread" style={{
      maxWidth: 720, margin: "0 auto", padding: "16px 16px 24px", height: "calc(100dvh - 72px)",
      display: "flex", flexDirection: "column", boxSizing: "border-box",
    }}>
      <style>{FRAME_CSS}</style>
      {children}
    </main>
  )
}

const linkButton: React.CSSProperties = {
  background: "none", border: 0, padding: 0, color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline",
}
