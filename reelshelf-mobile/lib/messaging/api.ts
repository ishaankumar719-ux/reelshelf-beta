// Private messaging data layer, shared by the website and the iPhone app.
// The iPhone app keeps an identical copy at reelshelf-mobile/lib/messaging/api.ts
// (separate package, no shared workspace): change both together.
//
// Framework-free: every function takes the caller's Supabase client. All
// writes go through the database functions in
// supabase/migrations/20261110_private_messaging.sql, which enforce mutual
// follows, invitations, membership and blocking. Reads use RLS.
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"

export type ConversationKind = "direct" | "group"
export type MemberStatus = "invited" | "active" | "declined" | "left" | "removed"
export type ReportReason = "spam" | "harassment" | "hate" | "sexual" | "self_harm" | "other"
export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed"

export interface ConversationSummary {
  conversation_id: string
  kind: ConversationKind
  title: string | null
  my_status: "active" | "invited"
  my_role: "owner" | "member"
  invited_by: string | null
  other_user_id: string | null
  other_username: string | null
  other_display_name: string | null
  other_avatar_url: string | null
  member_count: number
  last_message_body: string | null
  last_message_sender_id: string | null
  last_message_at: string | null
  unread_count: number
  i_blocked: boolean
  can_send: boolean
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  body: string
  client_id: string
  seq: number
  created_at: string
}

export interface ConversationMember {
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  role: "owner" | "member"
  status: "active" | "invited"
  last_read_seq: number
}

export interface MessageableUser {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export interface MessageReport {
  id: string
  created_at: string
  status: ReportStatus
  reason: ReportReason
  details: string | null
  message_body: string
  conversation_id: string
  reporter_id: string
  reporter_username: string | null
  reported_user_id: string | null
  reported_username: string | null
  resolution_note: string | null
  reviewed_at: string | null
}

export const MESSAGE_PAGE_SIZE = 30
export const MESSAGE_MAX_LENGTH = 4000

/** Database error codes raised by the messaging functions, mapped to copy. */
const ERROR_COPY: Record<string, string> = {
  not_mutual_followers: "You can only message people who follow you back.",
  blocked: "You can't message this account.",
  not_active_member: "You're no longer in this conversation.",
  not_group_owner: "Only the group owner can do that.",
  no_pending_invite: "This invitation is no longer available.",
  invalid_title: "Give the group a name (up to 80 characters).",
  invalid_body: "Messages need some text (up to 4,000 characters).",
  too_many_invitees: "You can invite up to 50 people at once.",
  message_not_found: "That message isn't available.",
  cannot_report_own_message: "You can't report your own message.",
  not_admin: "You don't have access to reports.",
}

export class MessagingError extends Error {
  readonly code: string
  constructor(code: string, message?: string) {
    super(message ?? ERROR_COPY[code] ?? "Something went wrong. Try again.")
    this.name = "MessagingError"
    this.code = code
  }
}

function toError(error: { message?: string; code?: string } | null): MessagingError {
  const raw = error?.message ?? "unknown"
  const code = Object.keys(ERROR_COPY).find((key) => raw.includes(key)) ?? error?.code ?? "unknown"
  return new MessagingError(code, ERROR_COPY[code])
}

async function rpc<T>(client: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(fn, args ?? {})
  if (error) throw toError(error)
  return data as T
}

/** RFC 4122 v4 id for a new outgoing message. A retry must reuse it. */
export function newClientId(): string {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  const bytes = new Uint8Array(16)
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ── Inbox & badge ────────────────────────────────────────────────────────────
export function listConversations(client: SupabaseClient) {
  return rpc<ConversationSummary[]>(client, "list_conversations").then((rows) => rows ?? [])
}

/** Unread messages across your conversations plus pending group invites. */
export function getBadgeCount(client: SupabaseClient) {
  return rpc<number>(client, "messaging_badge_count").then((n) => n ?? 0)
}

// ── Direct messages ──────────────────────────────────────────────────────────
/** Whether the Message button should show on this profile. */
export function canMessage(client: SupabaseClient, otherUserId: string) {
  return rpc<boolean>(client, "can_message", { p_other: otherUserId }).then(Boolean)
}

/** The one DM with this person; creates it on first use. Safe to call twice at once. */
export function openDirectConversation(client: SupabaseClient, otherUserId: string) {
  return rpc<string>(client, "get_or_create_direct_conversation", { p_other: otherUserId })
}

export function listMessageableUsers(client: SupabaseClient, search?: string) {
  return rpc<MessageableUser[]>(client, "list_messageable_users", {
    p_search: search?.trim() ? search.trim() : null,
  }).then((rows) => rows ?? [])
}

// ── Groups ───────────────────────────────────────────────────────────────────
export function createGroup(client: SupabaseClient, title: string, inviteeIds: string[]) {
  return rpc<string>(client, "create_group_conversation", { p_title: title, p_invitees: inviteeIds })
}

export function inviteToGroup(client: SupabaseClient, conversationId: string, inviteeIds: string[]) {
  return rpc<void>(client, "invite_to_group", { p_conversation: conversationId, p_invitees: inviteeIds })
}

export function respondToInvite(client: SupabaseClient, conversationId: string, accept: boolean) {
  return rpc<void>(client, "respond_to_group_invite", { p_conversation: conversationId, p_accept: accept })
}

export function leaveGroup(client: SupabaseClient, conversationId: string) {
  return rpc<void>(client, "leave_group", { p_conversation: conversationId })
}

export function removeMember(client: SupabaseClient, conversationId: string, userId: string) {
  return rpc<void>(client, "remove_group_member", { p_conversation: conversationId, p_user: userId })
}

export function listMembers(client: SupabaseClient, conversationId: string) {
  return rpc<ConversationMember[]>(client, "list_conversation_members", { p_conversation: conversationId }).then(
    (rows) => rows ?? [],
  )
}

/** One conversation's inbox row (title, other person, my status), or null if you can't see it. */
export async function getConversation(client: SupabaseClient, conversationId: string) {
  const rows = await listConversations(client)
  return rows.find((row) => row.conversation_id === conversationId) ?? null
}

// ── Messages ─────────────────────────────────────────────────────────────────
/** Newest-first page from the server, returned oldest-first for display. */
export async function fetchMessages(
  client: SupabaseClient,
  conversationId: string,
  options: { beforeSeq?: number; limit?: number } = {},
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const limit = options.limit ?? MESSAGE_PAGE_SIZE
  let query = client
    .from("messages")
    .select("id, conversation_id, sender_id, body, client_id, seq, created_at")
    .eq("conversation_id", conversationId)
    .order("seq", { ascending: false })
    .limit(limit + 1)
  if (options.beforeSeq != null) query = query.lt("seq", options.beforeSeq)
  const { data, error } = await query
  if (error) throw toError(error)
  const rows = (data ?? []) as ChatMessage[]
  return { messages: rows.slice(0, limit).reverse(), hasMore: rows.length > limit }
}

/** Idempotent: sending again with the same clientId returns the stored message. */
export function sendMessage(client: SupabaseClient, conversationId: string, body: string, clientId: string) {
  return rpc<ChatMessage>(client, "send_message", {
    p_conversation: conversationId,
    p_body: body,
    p_client_id: clientId,
  })
}

export function markRead(client: SupabaseClient, conversationId: string, uptoSeq?: number) {
  return rpc<number>(client, "mark_conversation_read", {
    p_conversation: conversationId,
    p_seq: uptoSeq ?? null,
  })
}

// ── Blocking & reports ───────────────────────────────────────────────────────
export function blockUser(client: SupabaseClient, userId: string) {
  return rpc<void>(client, "block_user", { p_user: userId })
}

export function unblockUser(client: SupabaseClient, userId: string) {
  return rpc<void>(client, "unblock_user", { p_user: userId })
}

export function reportMessage(client: SupabaseClient, messageId: string, reason: ReportReason, details?: string) {
  return rpc<string>(client, "report_message", { p_message: messageId, p_reason: reason, p_details: details ?? null })
}

export function listReports(client: SupabaseClient, status: ReportStatus | null = "open") {
  return rpc<MessageReport[]>(client, "list_message_reports", { p_status: status }).then((rows) => rows ?? [])
}

export function reviewReport(client: SupabaseClient, reportId: string, status: Exclude<ReportStatus, "open">, note?: string) {
  return rpc<void>(client, "review_message_report", { p_report: reportId, p_status: status, p_note: note ?? null })
}

export function isAdmin(client: SupabaseClient) {
  return rpc<boolean>(client, "is_app_admin").then(Boolean)
}

// ── Realtime ─────────────────────────────────────────────────────────────────
// Both subscriptions are filtered server-side by RLS: you only receive message
// inserts for conversations you're an active member of, and changes to your
// own membership rows.

/** New messages in one conversation. */
export function subscribeToConversation(
  client: SupabaseClient,
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const channel: RealtimeChannel = client
    .channel(`messages:${conversationId}:${newClientId()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as ChatMessage),
    )
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

/** Anything that can change your inbox or badge: a new message anywhere you
 *  belong, or your own read marker / membership changing on another device. */
export function subscribeToInbox(client: SupabaseClient, userId: string, onChange: () => void): () => void {
  const channel: RealtimeChannel = client
    .channel(`inbox:${userId}:${newClientId()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => onChange())
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

// ── Display helpers ──────────────────────────────────────────────────────────
export function conversationName(c: Pick<ConversationSummary, "kind" | "title" | "other_display_name" | "other_username">) {
  if (c.kind === "group") return c.title ?? "Group"
  return c.other_display_name || (c.other_username ? `@${c.other_username}` : "ReelShelf member")
}

/** "now", "5m", "3h", "Tue", "12 Oct" — inbox timestamps. */
export function shortTimestamp(iso: string | null, now: Date = new Date()): string {
  if (!iso) return ""
  const then = new Date(iso)
  const diff = Math.max(0, now.getTime() - then.getTime())
  const minute = 60_000
  if (diff < minute) return "now"
  if (diff < 60 * minute) return `${Math.floor(diff / minute)}m`
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))}h`
  if (diff < 7 * 24 * 60 * minute) return then.toLocaleDateString(undefined, { weekday: "short" })
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

/** Merges a page or realtime arrival into the list: one row per message id
 *  (and per client id, so an optimistic row is replaced by its stored copy),
 *  ordered by seq. */
export function mergeMessages<T extends { id: string; client_id: string; seq: number }>(current: T[], incoming: T[]): T[] {
  const byClient = new Map<string, T>()
  for (const message of current) byClient.set(message.client_id, message)
  for (const message of incoming) byClient.set(message.client_id, message)
  const seen = new Set<string>()
  const out: T[] = []
  byClient.forEach((message) => {
    if (seen.has(message.id)) return
    seen.add(message.id)
    out.push(message)
  })
  return out.sort((a, b) => a.seq - b.seq)
}
