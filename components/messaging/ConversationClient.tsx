"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import {
  CAPTION_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  blockUser,
  buildThread,
  classifyMediaFile,
  conversationName,
  discardMediaUpload,
  fetchMessages,
  firstUnreadSeq,
  getConversation,
  getGifAttachment,
  getMediaAttachment,
  getTitleAttachment,
  leaveGroup,
  listMembers,
  markRead,
  mediaPaths,
  mergeMessages,
  messageTime,
  newClientId,
  removeMember,
  reportMessage,
  respondToInvite,
  sendGif,
  sendMedia,
  sendMessage,
  shareTitle,
  subscribeToConversation,
  unblockUser,
  uploadMediaObject,
  type ChatMessage,
  type ConversationMember,
  type ConversationSummary,
  type GifPick,
  type ReportReason,
} from "@/lib/messaging/api"
import GifPicker from "./GifPicker"
import { GifView, PhotoLightbox, PhotoView, VideoView, mediaSrc, prepareMedia, type PreparedMedia } from "./MessageMedia"
import NewConversationDialog from "./NewConversationDialog"
import TitleCard from "./TitleCard"
import { Avatar, C, GroupGlyph, Modal, pillButton, textInput } from "./ui"

type LocalMessage = ChatMessage & {
  state: "sent" | "sending" | "failed"
  /** A photo or video still being sent from this browser. */
  pending?: PreparedMedia & { caption: string | null; progress: "uploading" | "posting" }
}

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
  const [members, setMembers] = useState<Record<string, ConversationMember>>({})
  const [staged, setStaged] = useState<PreparedMedia | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [divider, setDivider] = useState<{ seq: number; count: number } | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  const stickToBottom = useRef(true)
  const dragDepth = useRef(0)
  // Unread count as the thread opened, before it's marked read.
  const openedUnread = useRef<number | null>(null)

  const refreshSummary = useCallback(async () => {
    const client = createClient()
    if (!client) return null
    const next = await getConversation(client, conversationId)
    if (openedUnread.current === null && next) openedUnread.current = next.unread_count
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
        listMembers(client!, conversationId)
          .then((rows) => { if (!cancelled) setMembers(Object.fromEntries(rows.map((m) => [m.user_id, m]))) })
          .catch(() => { /* names are cosmetic */ })
        const page = await fetchMessages(client!, conversationId)
        if (cancelled) return
        setMessages((prev) => mergeMessages(prev, page.messages.map((m) => ({ ...m, state: "sent" as const }))))
        setHasMore((prev) => prev || page.hasMore)
        setDivider((prev) => {
          if (prev || !openedUnread.current) return prev
          const seq = firstUnreadSeq(page.messages, userId, openedUnread.current)
          return seq == null ? null : { seq, count: openedUnread.current }
        })
        markSeen()
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
        return false
      }
    }

    void loadLatest()
    const unsubscribe = subscribeToConversation(client, conversationId, (incoming) => {
      setMessages((prev) => mergeMessages(prev, [{ ...incoming, state: "sent" }]))
      if (incoming.sender_id !== userId) markSeen()
    }, loadLatest)
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
  }, [messages, staged])

  // With unread messages, open at the "new messages" divider instead (once).
  const jumpedToDivider = useRef(false)
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el || !divider || jumpedToDivider.current) return
    const mark = el.querySelector<HTMLElement>('[data-testid="unread-divider"]')
    if (!mark) return
    jumpedToDivider.current = true
    if (el.scrollHeight - el.clientHeight <= 0) return
    const target = mark.offsetTop - el.offsetTop - 8
    if (target < el.scrollHeight - el.clientHeight) {
      el.scrollTop = target
      stickToBottom.current = false
    }
  }, [divider, messages])

  // Free local previews when they're no longer shown.
  useEffect(() => () => { if (staged) URL.revokeObjectURL(staged.previewUrl) }, [staged])

  const thread = useMemo(
    () => buildThread(messages, userId, divider?.seq ?? null, divider?.count ?? 0),
    [messages, userId, divider],
  )

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

  function patch(clientId: string, change: Partial<LocalMessage>) {
    setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...m, ...change } : m)))
  }

  /** Sends (or re-sends) one message. Uploads use a fixed path per client id
   *  and every send is idempotent on it, so Retry picks up where it failed. */
  async function deliver(local: LocalMessage) {
    const client = createClient()
    if (!client || !userId) return
    patch(local.client_id, { state: "sending" })
    try {
      let stored: ChatMessage
      const shared = getTitleAttachment(local)
      const gif = getGifAttachment(local)
      if (local.pending) {
        const p = local.pending
        const paths = mediaPaths(conversationId, userId, local.client_id, p.file.type)
        patch(local.client_id, { pending: { ...p, progress: "uploading" } })
        await uploadMediaObject(client, paths.path, p.file, p.file.type)
        if (p.kind === "video" && p.thumb) await uploadMediaObject(client, paths.thumbPath, p.thumb, "image/jpeg")
        patch(local.client_id, { pending: { ...p, progress: "posting" } })
        stored = await sendMedia(client, conversationId, {
          kind: p.kind, path: paths.path, thumbPath: p.kind === "video" ? paths.thumbPath : null,
          width: p.width, height: p.height, durationMs: p.durationMs, caption: p.caption,
        }, local.client_id)
      } else if (gif) {
        stored = await sendGif(client, conversationId, gif, local.client_id)
      } else if (shared) {
        stored = await shareTitle(client, conversationId, shared, shared.note, local.client_id)
      } else {
        stored = await sendMessage(client, conversationId, local.body, local.client_id)
      }
      setMessages((prev) => {
        const old = prev.find((m) => m.client_id === local.client_id)
        if (old?.pending) URL.revokeObjectURL(old.pending.previewUrl)
        return mergeMessages(prev, [{ ...stored, state: "sent" }])
      })
    } catch (e) {
      patch(local.client_id, { state: "failed" })
      setError((e as Error).message)
      void refreshSummary()
    }
  }

  /** Drops a photo or video that failed to send, and deletes whatever part
   *  of it reached storage. */
  async function discard(local: LocalMessage) {
    setMessages((prev) => prev.filter((m) => m.client_id !== local.client_id))
    if (local.pending) URL.revokeObjectURL(local.pending.previewUrl)
    const client = createClient()
    if (!client || !userId || !local.pending) return
    const paths = mediaPaths(conversationId, userId, local.client_id, local.pending.file.type)
    await discardMediaUpload(client, local.pending.kind === "video" ? [paths.path, paths.thumbPath] : [paths.path])
  }

  function enqueue(partial: Pick<LocalMessage, "body"> & Partial<LocalMessage>) {
    if (!userId) return
    const local: LocalMessage = {
      id: `local-${newClientId()}`,
      client_id: newClientId(),
      conversation_id: conversationId,
      sender_id: userId,
      seq: (pendingSeq += 1),
      created_at: new Date().toISOString(),
      kind: "text",
      state: "sending",
      ...partial,
    }
    stickToBottom.current = true
    setError(null)
    setMessages((prev) => [...prev, local])
    void deliver(local)
  }

  function submit() {
    const text = draft.trim()
    if (staged) {
      enqueue({
        body: staged.kind === "image" ? "Sent a photo" : "Sent a video",
        kind: staged.kind,
        pending: { ...staged, caption: text || null, progress: "uploading" },
      })
      setStaged(null)
      setDraft("")
      return
    }
    if (!text) return
    setDraft("")
    enqueue({ body: text })
  }

  function sendPickedGif(gif: GifPick) {
    setGifOpen(false)
    enqueue({ body: "Sent a GIF", kind: "gif", attachment: gif })
    textRef.current?.focus()
  }

  async function stageFile(file: File | null | undefined) {
    if (!file) return
    const check = classifyMediaFile(file.type, file.size)
    if ("error" in check) { setError(check.error); return }
    setPreparing(true)
    setError(null)
    try {
      const prepared = await prepareMedia(file, check.kind)
      setStaged((prev) => { if (prev) URL.revokeObjectURL(prev.previewUrl); return prepared })
      stickToBottom.current = true
      textRef.current?.focus()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPreparing(false)
    }
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
    return <Notice><Link href="/auth" style={{ color: C.text }}>Sign in</Link> to see your messages.</Notice>
  }
  if (summary === undefined) return <Notice>Loading…</Notice>
  if (summary === null) {
    return (
      <Notice>
        This conversation isn&apos;t available. You may have left it or been removed.
        <Link href="/messages" style={{ ...pillButton(), marginTop: 12 }}>Back to messages</Link>
      </Notice>
    )
  }

  const client = createClient()
  const name = conversationName(summary)
  const isGroup = summary.kind === "group"
  const canAttach = summary.can_send

  if (summary.my_status === "invited") {
    return (
      <Notice>
        <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
          <GroupGlyph size={64} />
          <h1 style={{ margin: 0, color: C.text, fontSize: 22 }}>{name}</h1>
          <p style={{ margin: 0, color: C.muted }}>You&apos;ve been invited to this private group. Join to read and send messages.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={pillButton()} onClick={() => client && act(() => respondToInvite(client, conversationId, false), () => router.push("/messages"))}>Decline</button>
            <button type="button" style={pillButton(true)} onClick={() => client && act(() => respondToInvite(client, conversationId, true), () => { window.location.reload() })}>Join group</button>
          </div>
          {error ? <p role="alert" style={{ color: C.danger }}>{error}</p> : null}
        </div>
      </Notice>
    )
  }

  const memberName = (id: string | null) => {
    if (!id) return "Former member"
    const m = members[id]
    return m ? (m.display_name || `@${m.username}`) : "Former member"
  }
  const sendReady = staged ? !preparing : !!draft.trim()

  return (
    <div
      style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}
      onDragEnter={(e) => {
        if (!canAttach || !Array.from(e.dataTransfer.types).includes("Files")) return
        e.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => { if (dragging) { e.preventDefault(); e.dataTransfer.dropEffect = "copy" } }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false) }}
      onDrop={(e) => {
        if (!dragging) return
        e.preventDefault()
        dragDepth.current = 0
        setDragging(false)
        void stageFile(e.dataTransfer.files?.[0])
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", minHeight: 64, boxSizing: "border-box", borderBottom: `1px solid ${C.line}` }}>
        <Link href="/messages" aria-label="Back to messages" className="msg-only-narrow" style={{ ...roundButton, marginLeft: -6 }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        {isGroup ? <GroupGlyph size={40} /> : <Avatar url={summary.other_avatar_url} name={name} size={40} />}
        <span style={{ display: "grid", minWidth: 0, flex: 1, gap: 2 }}>
          {summary.kind === "direct" && summary.other_username ? (
            <Link href={`/u/${summary.other_username}`} style={{ color: C.text, fontSize: 16, fontWeight: 700, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</Link>
          ) : (
            <span style={{ color: C.text, fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          )}
          <span style={{ color: C.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isGroup ? groupSubtitle(Object.values(members), userId, summary.member_count) : summary.other_username ? `@${summary.other_username}` : ""}
          </span>
        </span>
        {isGroup ? (
          <button type="button" style={{ ...pillButton(), height: 44 }} onClick={() => setPanel("members")}>Members</button>
        ) : summary.other_user_id ? (
          <button
            type="button"
            style={{ ...pillButton(), height: 44 }}
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
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 16px 12px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", justifyContent: "flex-end", maxWidth: 820, margin: "0 auto" }}>
          {hasMore ? (
            <button type="button" onClick={loadEarlier} disabled={loadingEarlier} style={{ ...pillButton(), alignSelf: "center", margin: "8px 0" }}>
              {loadingEarlier ? "Loading…" : "Load earlier messages"}
            </button>
          ) : null}
          {messages.length === 0 ? (
            <p style={{ color: C.faint, textAlign: "center", margin: "auto 0" }}>No messages yet. Say hello.</p>
          ) : null}
          {thread.map((item) => {
            if (item.type === "day") {
              return (
                <div key={item.key} role="separator" style={{ textAlign: "center", margin: "16px 0 8px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{item.label}</span>
                </div>
              )
            }
            if (item.type === "unread") {
              return (
                <div key={item.key} role="separator" aria-label={`${item.count} new ${item.count === 1 ? "message" : "messages"}`} data-testid="unread-divider"
                  style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 6px" }}>
                  <span style={{ flex: 1, height: 1, background: C.accent, opacity: 0.5 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{item.count} new {item.count === 1 ? "message" : "messages"}</span>
                  <span style={{ flex: 1, height: 1, background: C.accent, opacity: 0.5 }} />
                </div>
              )
            }
            const m = item.message
            return (
              <MessageRow
                key={item.key}
                message={m}
                mine={item.mine}
                isGroup={isGroup}
                startsRun={item.startsRun}
                endsRun={item.endsRun}
                senderName={memberName(m.sender_id)}
                senderAvatar={m.sender_id ? members[m.sender_id]?.avatar_url ?? null : null}
                onRetry={() => void deliver(m)}
                onDiscard={() => void discard(m)}
                onReport={() => setReporting(m)}
                onOpenPhoto={setLightbox}
              />
            )
          })}
        </div>
      </div>

      {error ? <p role="alert" style={{ margin: "0 16px 8px", color: C.danger, fontSize: 13 }}>{error}</p> : null}

      {summary.can_send ? (
        <form
          onSubmit={(e) => { e.preventDefault(); submit() }}
          style={{ position: "relative", padding: "10px 16px 14px", borderTop: `1px solid ${C.line}` }}
        >
          {gifOpen ? <GifPicker onPick={sendPickedGif} onClose={() => setGifOpen(false)} /> : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
            hidden
            onChange={(e) => { void stageFile(e.target.files?.[0]); e.target.value = "" }}
          />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: 820, margin: "0 auto" }}>
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add a photo or video" title="Add a photo or video"
              style={{ ...roundButton, background: "rgba(255,255,255,0.06)" }} disabled={preparing}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, borderRadius: 22, border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.04)", padding: staged ? 8 : 0 }}>
              {staged ? <StagedPreview media={staged} onRemove={() => { setStaged(null); textRef.current?.focus() }} /> : null}
              {preparing ? <span style={{ color: C.muted, fontSize: 13, padding: "6px 8px 0" }}>Preparing…</span> : null}
              <textarea
                ref={textRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }}
                onPaste={(e) => {
                  const file = Array.from(e.clipboardData.files ?? [])[0]
                  if (file) { e.preventDefault(); void stageFile(file) }
                }}
                maxLength={staged ? CAPTION_MAX_LENGTH : MESSAGE_MAX_LENGTH}
                rows={1}
                placeholder={staged ? "Add a caption (optional)" : "Message"}
                aria-label={staged ? "Caption" : "Message"}
                style={{ ...textInput, border: "none", background: "transparent", resize: "none", maxHeight: 160, minHeight: 42, padding: "11px 14px", fontFamily: C.font }}
              />
            </div>
            <button type="button" onClick={() => setGifOpen((v) => !v)} aria-label="Choose a GIF" aria-expanded={gifOpen} title="GIF"
              disabled={!!staged}
              style={{ ...roundButton, width: "auto", padding: "0 8px", borderRadius: 12, opacity: staged ? 0.4 : 1 }}>
              <span style={{ border: `1.5px solid ${gifOpen ? C.accent : C.muted}`, color: gifOpen ? C.accent : C.text, borderRadius: 6, padding: "2px 5px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>GIF</span>
            </button>
            <button type="submit" disabled={!sendReady} style={{
              height: 44, padding: "0 18px", borderRadius: 999, border: "none", flexShrink: 0, cursor: sendReady ? "pointer" : "default",
              background: sendReady ? C.accent : "rgba(255,255,255,0.08)", color: sendReady ? "#fff" : C.faint,
              fontSize: 14, fontWeight: 700, fontFamily: C.font,
            }}>Send</button>
          </div>
        </form>
      ) : (
        <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "14px 16px", margin: 0, borderTop: `1px solid ${C.line}` }}>
          {summary.i_blocked
            ? "You blocked this account. Unblock to send messages."
            : summary.kind === "direct" && !summary.other_user_id
              ? "This account no longer exists."
              : "You can't send messages in this conversation."}
        </p>
      )}

      {dragging ? (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 30, background: "rgba(7,7,11,0.86)", display: "grid", placeItems: "center", padding: 32, pointerEvents: "none",
        }}>
          <div style={{
            width: "100%", maxWidth: 520, padding: "40px 32px", borderRadius: 20, border: `2px dashed ${C.accent}`,
            background: C.card, display: "grid", justifyItems: "center", gap: 10, textAlign: "center",
          }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, background: C.accent, display: "grid", placeItems: "center" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: C.text }} data-testid="drop-target">Drop to share in {name}</span>
            <span style={{ fontSize: 14, color: C.muted }}>Photos and videos. You can add a caption before sending.</span>
          </div>
        </div>
      ) : null}

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
      {lightbox ? <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} /> : null}
    </div>
  )
}

function groupSubtitle(members: ConversationMember[], userId: string | null, count: number) {
  const active = members.filter((m) => m.status === "active")
  if (active.length === 0) return `${count} ${count === 1 ? "member" : "members"}`
  const others = active.filter((m) => m.user_id !== userId).map((m) => m.display_name || `@${m.username}`)
  if (others.length <= 3) return [...others, "you"].join(", ")
  return `${others.slice(0, 2).join(", ")} and ${others.length - 2} others`
}

function StagedPreview({ media, onRemove }: { media: PreparedMedia; onRemove: () => void }) {
  return (
    <div style={{ position: "relative", width: 132, height: 132 }} data-testid="staged-media">
      {media.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
        <img src={media.previewUrl} alt="Photo to send" style={{ width: 132, height: 132, objectFit: "cover", borderRadius: 14, display: "block" }} />
      ) : (
        <span style={{ position: "relative", display: "block", width: 132, height: 132, borderRadius: 14, overflow: "hidden", background: "#000" }}>
          <video src={media.previewUrl} muted playsInline preload="metadata" aria-label="Video to send"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span style={{ position: "absolute", left: 6, bottom: 6, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(7,7,11,0.7)", padding: "2px 6px", borderRadius: 6 }}>
            Video
          </span>
        </span>
      )}
      <button type="button" onClick={onRemove} aria-label={media.kind === "image" ? "Remove photo" : "Remove video"} style={{
        position: "absolute", top: -10, right: -10, width: 44, height: 44, border: "none", background: "transparent", padding: 0,
        display: "grid", placeItems: "center", cursor: "pointer",
      }}>
        <span style={{ width: 26, height: 26, borderRadius: 999, background: C.text, color: C.base, display: "grid", placeItems: "center", boxShadow: `0 0 0 2px ${C.base}` }}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg>
        </span>
      </button>
    </div>
  )
}

function MessageRow({ message, mine, isGroup, startsRun, endsRun, senderName, senderAvatar, onRetry, onDiscard, onReport, onOpenPhoto }: {
  message: LocalMessage
  mine: boolean
  isGroup: boolean
  startsRun: boolean
  endsRun: boolean
  senderName: string
  senderAvatar: string | null
  onRetry: () => void
  onDiscard: () => void
  onReport: () => void
  onOpenPhoto: (src: string) => void
}) {
  const shared = getTitleAttachment(message)
  const gif = getGifAttachment(message)
  const media = getMediaAttachment(message)
  const pending = message.pending
  const showAvatar = isGroup && !mine
  const caption = pending?.caption ?? media?.caption ?? null
  const plainText = !shared && !gif && !media && !pending

  let content: React.ReactNode
  if (pending) {
    content = <PhotoView src={pending.previewUrl} width={pending.width} height={pending.height} />
    if (pending.kind === "video") {
      content = (
        <span style={{ position: "relative", display: "block", maxWidth: "100%" }}>
          <VideoView src={null} poster={null} width={pending.width} height={pending.height} durationMs={pending.durationMs} />
          <video src={pending.previewUrl} muted playsInline preload="metadata" aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
        </span>
      )
    }
  } else if (media?.kind === "image") {
    const src = mediaSrc(media.path)
    content = <PhotoView src={src} width={media.width} height={media.height} onOpen={() => onOpenPhoto(src)} />
  } else if (media?.kind === "video") {
    content = <VideoView src={mediaSrc(media.path)} poster={media.thumb_path ? mediaSrc(media.thumb_path) : null}
      width={media.width} height={media.height} durationMs={media.duration_ms} />
  } else if (gif) {
    content = <GifView gif={gif} />
  } else if (shared) {
    content = (
      <span style={{ display: "block", width: 290, maxWidth: "100%", padding: 6, borderRadius: 18, background: mine ? C.mine : C.theirs, boxSizing: "border-box" }}>
        <TitleCard title={shared} />
        {shared.note ? <span style={{ display: "block", padding: "8px 6px 2px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{shared.note}</span> : null}
      </span>
    )
  } else {
    content = message.body
  }

  const status = message.state === "failed" ? (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span style={{ color: C.danger }}>{pending ? "Upload failed" : "Not sent"}</span>
      <button type="button" onClick={onRetry} data-testid="retry" style={{ ...linkButton, padding: "12px 6px", margin: "-12px -6px" }}>Retry</button>
      {pending ? (
        <button type="button" onClick={onDiscard} data-testid="discard" style={{ ...linkButton, padding: "12px 6px", margin: "-12px -6px" }}>Discard</button>
      ) : null}
    </span>
  ) : message.state === "sending" ? (
    pending ? (pending.progress === "uploading" ? `Uploading ${pending.kind === "video" ? "video" : "photo"}…` : "Sending…") : "Sending…"
  ) : endsRun ? messageTime(message.created_at) : null

  return (
    <div className="msg-row" data-testid="message" data-state={message.state} data-kind={message.kind ?? "text"}
      style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: mine ? "flex-end" : "flex-start", marginTop: startsRun ? 10 : 2 }}>
      {showAvatar ? (
        endsRun ? <Avatar url={senderAvatar} name={senderName} size={30} /> : <span style={{ width: 30, flexShrink: 0 }} />
      ) : null}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 3, minWidth: 0, maxWidth: "min(78%, 560px)", opacity: message.state === "sending" && !pending ? 0.7 : 1 }}>
        {isGroup && !mine && startsRun ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text, paddingLeft: 12 }}>{senderName}</span>
        ) : null}
        {plainText ? (
          <div style={{
            padding: "9px 14px", borderRadius: 18, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
            background: mine ? C.mine : C.theirs, color: C.text, fontSize: 15, lineHeight: 1.42,
            border: message.state === "failed" ? `1px solid ${C.danger}` : "1px solid transparent",
          }}>{content}</div>
        ) : (
          <div style={{ borderRadius: 18, outline: message.state === "failed" ? `1px solid ${C.danger}` : "none", position: "relative", maxWidth: "100%" }}>
            {content}
            {pending && message.state === "sending" ? (
              <span style={{ position: "absolute", inset: 0, borderRadius: 16, background: "rgba(7,7,11,0.45)", display: "grid", placeItems: "center" }}>
                <span className="msg-spinner" aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 999, border: "3px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", animation: "msgspin 0.9s linear infinite" }} />
                <style>{"@keyframes msgspin { to { transform: rotate(360deg) } }"}</style>
              </span>
            ) : null}
          </div>
        )}
        {caption ? (
          <div style={{
            padding: "9px 14px", borderRadius: 18, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
            background: mine ? C.mine : C.theirs, color: C.text, fontSize: 15, lineHeight: 1.42,
          }}>{caption}</div>
        ) : null}
        {status ? (
          <span style={{ display: "flex", gap: 10, fontSize: 11, color: C.faint, padding: "0 6px" }}>{status}</span>
        ) : null}
        {!mine && message.state === "sent" ? (
          <button type="button" onClick={onReport} className={endsRun ? "msg-report msg-report-end" : "msg-report"}
            style={{ ...linkButton, position: "absolute", left: "100%", bottom: status ? 8 : -8, marginLeft: 2, padding: "14px 8px", whiteSpace: "nowrap" }}>
            Report
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 32, textAlign: "center", color: C.muted }}>
      <div style={{ display: "grid", justifyItems: "center", maxWidth: 360 }}>{children}</div>
    </div>
  )
}

const roundButton: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 999, border: "none", background: "transparent", color: C.text,
  display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0,
}

const linkButton: React.CSSProperties = {
  background: "none", border: 0, padding: 0, color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline",
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
      {error ? <p role="alert" style={{ margin: 0, color: C.danger, fontSize: 13 }}>{error}</p> : null}
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
          {error ? <p role="alert" style={{ margin: 0, color: C.danger, fontSize: 13 }}>{error}</p> : null}
          <button type="button" disabled={state === "busy"} style={pillButton(true)} onClick={submit}>
            {state === "busy" ? "…" : "Send report"}
          </button>
        </>
      )}
    </Modal>
  )
}

