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
  /** Display name (else username) of whoever sent the last message. Missing
   *  from servers older than 20261123_message_previews_and_media_cleanup. */
  last_message_sender_name?: string | null
}

/** The inbox's one-line preview: "You: …" for your own last message, and in
 *  groups the sender's name ("Maya: …") so you know who said it. */
export function inboxPreview(c: ConversationSummary, userId: string | null): string {
  if (!c.last_message_body) return c.kind === "group" ? "No messages yet" : ""
  if (c.last_message_sender_id && c.last_message_sender_id === userId) return `You: ${c.last_message_body}`
  if (c.kind === "group") {
    const name = c.last_message_sender_id ? c.last_message_sender_name?.trim() : null
    return `${name || (c.last_message_sender_id ? "Someone" : "Former member")}: ${c.last_message_body}`
  }
  return c.last_message_body
}

export type SharedMediaType = "film" | "tv" | "book"

/** A film, TV show or book as sent to a chat. `media_id` is the stable
 *  catalogue id: the TMDB id for films and TV; for books the id Search and
 *  the Diary use (an Open Library work id such as "OL5735360W" for
 *  catalogued books, see canonicalBookId). */
export interface SharedTitle {
  media_type: SharedMediaType
  media_id: string
  title: string
  year: number | null
  poster_url: string | null
}

export interface TitleAttachment extends SharedTitle {
  note: string | null
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  /** For a title share: the readable fallback older apps show. */
  body: string
  client_id: string
  seq: number
  created_at: string
  /** Missing on rows from before title sharing; treat as "text". */
  kind?: MessageKind
  attachment?: TitleAttachment | GifAttachment | MediaAttachment | Record<string, unknown> | null
}

export type MessageKind = "text" | "title" | "gif" | "image" | "video"

/** A GIF picked from GIPHY. `url` is always on GIPHY's own media hosts. */
export interface GifAttachment {
  giphy_id: string
  url: string
  width: number
  height: number
  title: string | null
}

/** A photo or video in the private message-media bucket. Never a public URL:
 *  read it with the reader's own session (see mediaRequest). */
export interface MediaAttachment {
  path: string
  thumb_path: string | null
  width: number | null
  height: number | null
  duration_ms: number | null
  mime: string | null
  size: number | null
  caption: string | null
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
  recipient_unavailable: "This account no longer exists.",
  not_active_member: "You're no longer in this conversation.",
  not_group_owner: "Only the group owner can do that.",
  no_pending_invite: "This invitation is no longer available.",
  invalid_title: "Give the group a name (up to 80 characters).",
  invalid_body: "Messages need some text (up to 4,000 characters).",
  too_many_invitees: "You can invite up to 50 people at once.",
  message_not_found: "That message isn't available.",
  cannot_report_own_message: "You can't report your own message.",
  not_admin: "You don't have access to reports.",
  invalid_media_type: "That title can't be shared.",
  invalid_media_id: "That title can't be shared.",
  invalid_media_title: "That title can't be shared.",
  invalid_year: "That title can't be shared.",
  note_too_long: "Keep the note under 500 characters.",
  invalid_gif: "That GIF can't be sent.",
  invalid_media: "That file can't be sent. Photos: JPEG, PNG, WebP or GIF. Videos: MP4 or MOV.",
  media_too_large: "That file is too big. Photos up to 10 MB, videos up to 50 MB.",
  media_not_uploaded: "The upload didn't finish. Try again.",
  caption_too_long: "Keep the caption under 1,000 characters.",
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

/** One conversation's summary (title, other person, my status), or null if
 *  you can't see it. Unlike the inbox, includes a DM with no messages yet. */
export async function getConversation(client: SupabaseClient, conversationId: string) {
  const rows = await rpc<ConversationSummary[]>(client, "list_conversations", { p_conversation: conversationId })
  return rows?.[0] ?? null
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
    .select("id, conversation_id, sender_id, body, client_id, seq, created_at, kind, attachment")
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

// ── Title shares ─────────────────────────────────────────────────────────────
// Format and server checks: supabase/migrations/20261111_message_title_shares.sql.

export const SHARE_NOTE_MAX_LENGTH = 500

const MEDIA_LABEL: Record<SharedMediaType, string> = { film: "Film", tv: "TV", book: "Book" }
const FALLBACK_LABEL: Record<SharedMediaType, string> = { film: "film", tv: "TV show", book: "book" }

/** "Film", "TV" or "Book" for the card. */
export function mediaTypeLabel(type: SharedMediaType): string {
  return MEDIA_LABEL[type]
}

/** The text older apps show, built exactly as the server builds it, so an
 *  optimistic row matches the stored one. */
export function titleFallback(title: Pick<SharedTitle, "media_type" | "title">, note?: string | null): string {
  const cleanNote = note?.trim()
  return `Shared a ${FALLBACK_LABEL[title.media_type]}: ${title.title.trim()}${cleanNote ? ` · ${cleanNote}` : ""}`
}

/** Open Library work ids that the catalogue knows under another id: retired
 *  work ids Open Library redirects, and the "local-<slug>" ids an older build
 *  used for the Hunger Games novels. Same table as WORK_ALIASES in the iPhone
 *  app's lib/bookIdentity.ts, so a shared book opens the diary Search and the
 *  franchise hub use. */
const BOOK_ID_ALIASES: Record<string, string> = {
  OL42360848W: "OL43426400W", // Sunrise on the Reaping (merged duplicate)
  "local-the-hunger-games": "OL5735363W",
  "local-catching-fire": "OL5735360W",
  "local-mockingjay": "OL14908941W",
  "local-the-ballad-of-songbirds-and-snakes": "OL20716197W",
}

/** The id a book is shared and opened under: route prefixes stripped
 *  ("book-", "ol-", "/works/") and known aliases resolved. */
export function canonicalBookId(id: string): string {
  let clean = id.trim()
  if (clean.startsWith("book-")) clean = clean.slice(5)
  if (clean.startsWith("ol-")) clean = clean.slice(3)
  if (clean.startsWith("/works/")) clean = clean.slice(7)
  return BOOK_ID_ALIASES[clean] ?? clean
}

export function isOpenLibraryWorkId(id: string): boolean {
  return /^OL\d+W$/.test(id)
}

/** The title card on a message, or null for a plain message (or a card this
 *  app version doesn't understand, which then shows its readable body). */
export function getTitleAttachment(message: Pick<ChatMessage, "kind" | "attachment">): TitleAttachment | null {
  if (message.kind !== "title" || !message.attachment) return null
  const a = message.attachment as Partial<TitleAttachment>
  if (a.media_type !== "film" && a.media_type !== "tv" && a.media_type !== "book") return null
  if (typeof a.media_id !== "string" || typeof a.title !== "string" || !a.title) return null
  return {
    media_type: a.media_type,
    media_id: a.media_id,
    title: a.title,
    year: typeof a.year === "number" ? a.year : null,
    poster_url: typeof a.poster_url === "string" && a.poster_url.startsWith("https://") ? a.poster_url : null,
    note: typeof a.note === "string" && a.note ? a.note : null,
  }
}

/** Sends one title (and an optional note) to one conversation. Same
 *  membership, blocking and retry rules as sendMessage: resending with the
 *  same clientId returns the stored message. */
export function shareTitle(
  client: SupabaseClient,
  conversationId: string,
  title: SharedTitle,
  note: string | null,
  clientId: string,
) {
  const mediaId = title.media_type === "book" ? canonicalBookId(title.media_id) : title.media_id
  // Google Books hands out http:// thumbnails; the server only keeps https.
  const poster = title.poster_url?.trim().replace(/^http:\/\//, "https://") || null
  return rpc<ChatMessage>(client, "share_title", {
    p_conversation: conversationId,
    p_client_id: clientId,
    p_media_type: title.media_type,
    p_media_id: mediaId,
    p_title: title.title,
    p_year: title.year,
    p_poster_url: poster,
    p_note: note?.trim() ? note.trim() : null,
  })
}

/** Destinations for a share: conversations you can post in right now
 *  (joined groups and DMs that aren't blocked), most recent first. */
export async function listShareDestinations(client: SupabaseClient) {
  const rows = await listConversations(client)
  return rows.filter((c) => c.my_status === "active" && c.can_send)
}

// ── GIFs, photos and videos ──────────────────────────────────────────────────
// Format and server checks: supabase/migrations/20261117_message_media.sql.

export const MEDIA_BUCKET = "message-media"
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const CAPTION_MAX_LENGTH = 1000
export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
export const VIDEO_MIME = ["video/mp4", "video/quicktime"] as const

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/quicktime": "mov",
}

/** Checks a picked or dropped file before anything is uploaded. Returns the
 *  message kind, or the copy to show when it can't be sent. */
export function classifyMediaFile(mime: string | null | undefined, size: number | null | undefined):
  { kind: "image" | "video" } | { error: string } {
  const type = (mime ?? "").toLowerCase()
  if ((IMAGE_MIME as readonly string[]).includes(type)) {
    if (size != null && size > IMAGE_MAX_BYTES) return { error: "Photos can be up to 10 MB." }
    return { kind: "image" }
  }
  if ((VIDEO_MIME as readonly string[]).includes(type)) {
    if (size != null && size > VIDEO_MAX_BYTES) return { error: "Videos can be up to 50 MB." }
    return { kind: "video" }
  }
  return { error: "Send a photo (JPEG, PNG, WebP or GIF) or a video (MP4 or MOV)." }
}

/** Where an upload for this message goes: one fixed path per client id, so a
 *  retry writes (or finds) the same object instead of a second copy. */
export function mediaPaths(conversationId: string, userId: string, clientId: string, mime: string) {
  const ext = MIME_EXT[mime.toLowerCase()] ?? "bin"
  const base = `${conversationId}/${userId}/${clientId}`
  return { path: `${base}.${ext}`, thumbPath: `${base}-thumb.jpg` }
}

/** Uploads one object. An object already at that path (an earlier attempt
 *  that got that far) counts as uploaded. */
export async function uploadMediaObject(
  client: SupabaseClient,
  path: string,
  body: Blob | ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, body, { contentType, upsert: false })
  if (!error) return
  const status = (error as { statusCode?: string | number }).statusCode
  if (String(status) === "409" || /already exists|duplicate/i.test(error.message)) return
  throw new MessagingError("upload_failed", "The upload didn't finish. Check your connection and try again.")
}

/** Deletes the file(s) of a photo or video that was never posted (Discard
 *  after a failed send). Storage only allows this for your own upload while
 *  no message uses it; anything left over is removed by the hourly
 *  message-media-sweeper after 24 hours. Never throws. */
export async function discardMediaUpload(client: SupabaseClient, paths: string[]): Promise<void> {
  try {
    await client.storage.from(MEDIA_BUCKET).remove(paths)
  } catch {
    // The sweeper catches whatever is left.
  }
}

export interface MediaSend {
  kind: "image" | "video"
  path: string
  thumbPath: string | null
  width: number | null
  height: number | null
  durationMs: number | null
  caption: string | null
}

/** Posts a photo or video whose file(s) are already uploaded. Idempotent on
 *  clientId like every other send. */
export function sendMedia(client: SupabaseClient, conversationId: string, media: MediaSend, clientId: string) {
  return rpc<ChatMessage>(client, "send_media", {
    p_conversation: conversationId,
    p_client_id: clientId,
    p_kind: media.kind,
    p_path: media.path,
    p_thumb_path: media.thumbPath,
    p_width: media.width ? Math.round(media.width) : null,
    p_height: media.height ? Math.round(media.height) : null,
    p_duration_ms: media.durationMs != null ? Math.round(media.durationMs) : null,
    p_caption: media.caption?.trim() ? media.caption.trim() : null,
  })
}

export interface GifPick {
  giphy_id: string
  url: string
  width: number
  height: number
  title: string | null
}

export function sendGif(client: SupabaseClient, conversationId: string, gif: GifPick, clientId: string) {
  return rpc<ChatMessage>(client, "send_gif", {
    p_conversation: conversationId,
    p_client_id: clientId,
    p_giphy_id: gif.giphy_id,
    p_url: gif.url,
    p_width: Math.round(gif.width),
    p_height: Math.round(gif.height),
    p_title: gif.title,
  })
}

export function getGifAttachment(message: Pick<ChatMessage, "kind" | "attachment">): GifAttachment | null {
  if (message.kind !== "gif" || !message.attachment) return null
  const a = message.attachment as Partial<GifAttachment>
  if (typeof a.url !== "string" || !/^https:\/\/(media[0-9]?\.giphy\.com|i\.giphy\.com)\//.test(a.url)) return null
  return {
    giphy_id: String(a.giphy_id ?? ""),
    url: a.url,
    width: typeof a.width === "number" && a.width > 0 ? a.width : 200,
    height: typeof a.height === "number" && a.height > 0 ? a.height : 200,
    title: typeof a.title === "string" ? a.title : null,
  }
}

export function getMediaAttachment(message: Pick<ChatMessage, "kind" | "attachment">): (MediaAttachment & { kind: "image" | "video" }) | null {
  if ((message.kind !== "image" && message.kind !== "video") || !message.attachment) return null
  const a = message.attachment as Partial<MediaAttachment>
  if (typeof a.path !== "string" || !a.path) return null
  if (message.kind === "video" && typeof a.thumb_path !== "string") return null
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null)
  return {
    kind: message.kind,
    path: a.path,
    thumb_path: typeof a.thumb_path === "string" ? a.thumb_path : null,
    width: num(a.width),
    height: num(a.height),
    duration_ms: num(a.duration_ms),
    mime: typeof a.mime === "string" ? a.mime : null,
    size: num(a.size),
    caption: typeof a.caption === "string" && a.caption ? a.caption : null,
  }
}

/** The request that reads a private photo or video with the reader's own
 *  token. Storage checks current membership on every request, so someone who
 *  left or was removed gets nothing even with an old link. */
// Supabase's CDN caches authenticated downloads per URL and token, so someone
// removed from a chat could keep loading a URL they already opened until their
// token expires. A `cacheNonce` makes the request go to storage, where the
// membership policy runs. Pass a new nonce each time a chat is opened.
export function mediaRequest(supabaseUrl: string, apiKey: string, accessToken: string, path: string, nonce?: string) {
  const query = nonce ? `?cacheNonce=${encodeURIComponent(nonce)}` : ""
  return {
    uri: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/authenticated/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}${query}`,
    headers: { Authorization: `Bearer ${accessToken}`, apikey: apiKey },
  }
}

/** Box for a photo, video or GIF in the thread: fits within maxW × maxH and
 *  keeps the aspect ratio (square when the size isn't known). */
export function fitMedia(width: number | null, height: number | null, maxW: number, maxH: number) {
  const w = width && width > 0 ? width : 1
  const h = height && height > 0 ? height : 1
  const scale = Math.min(maxW / w, maxH / h)
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

/** "0:24", "12:05". */
export function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return ""
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

// ── Thread layout ────────────────────────────────────────────────────────────

export type ThreadItem<T> =
  | { type: "day"; key: string; label: string }
  | { type: "unread"; key: string; count: number }
  | {
      type: "message"
      key: string
      message: T
      mine: boolean
      /** First message of a run from this sender: show their name (groups). */
      startsRun: boolean
      /** Last message of a run: show the avatar and the time. */
      endsRun: boolean
    }

const RUN_GAP_MS = 5 * 60_000

/** "Today", "Yesterday", "Monday", "12 Oct", "12 Oct 2024". */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((start(now) - start(d)) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "long" })
  return d.toLocaleDateString(undefined, {
    day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  })
}

/** Turns messages (oldest first) into what the thread draws: day headers,
 *  one "new messages" divider before the first unread message, and runs of
 *  messages from the same sender within five minutes. `firstUnreadSeq` is
 *  fixed when the thread opens, so the divider doesn't move while you read. */
export function buildThread<T extends { client_id: string; sender_id: string | null; created_at: string; seq: number }>(
  messages: T[],
  userId: string | null,
  firstUnreadSeq: number | null,
  unreadCount = 0,
  now: Date = new Date(),
): ThreadItem<T>[] {
  const out: ThreadItem<T>[] = []
  let lastDay = ""
  let dividerDone = false
  messages.forEach((m, i) => {
    const day = new Date(m.created_at).toDateString()
    if (day !== lastDay) {
      out.push({ type: "day", key: `day-${day}`, label: dayLabel(m.created_at, now) })
      lastDay = day
    }
    if (!dividerDone && firstUnreadSeq != null && m.seq >= firstUnreadSeq && m.sender_id !== userId) {
      out.push({ type: "unread", key: "unread", count: unreadCount })
      dividerDone = true
    }
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const sameRun = (a: T | undefined, b: T | undefined) =>
      !!a && !!b && a.sender_id === b.sender_id &&
      new Date(a.created_at).toDateString() === new Date(b.created_at).toDateString() &&
      Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < RUN_GAP_MS
    const nextIsDivider = !dividerDone && !!next && firstUnreadSeq != null && next.seq >= firstUnreadSeq && next.sender_id !== userId
    out.push({
      type: "message",
      key: m.client_id,
      message: m,
      mine: m.sender_id === userId,
      startsRun: !sameRun(prev, m) || out[out.length - 1]?.type === "unread",
      endsRun: !sameRun(m, next) || nextIsDivider,
    })
  })
  return out
}

/** The seq of the first unread message when a thread opens: the
 *  `unreadCount`-th newest message from someone else. Null when all read. */
export function firstUnreadSeq<T extends { sender_id: string | null; seq: number }>(
  messages: T[], userId: string | null, unreadCount: number,
): number | null {
  if (unreadCount <= 0) return null
  let seen = 0
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].sender_id === userId) continue
    seen += 1
    if (seen === unreadCount) return messages[i].seq
  }
  return messages.find((m) => m.sender_id !== userId)?.seq ?? null
}

/** Time under a message: "14:05". */
export function messageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
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

/** Joins a realtime channel with the signed-in user's CURRENT token and keeps
 *  it joined.
 *
 *  Why not just .subscribe(): when the socket drops (laptop sleep, network
 *  change, the iPhone app backgrounded — close code 1001) supabase-js rejoins
 *  with the token the channel was first joined with. After an hour that token
 *  has expired, every rejoin is refused, and the channel loops on
 *  CHANNEL_ERROR without ever recovering, while messages sent meanwhile are
 *  never fetched.
 *
 *  Here, on CHANNEL_ERROR / TIMED_OUT / an unexpected CLOSED the channel is
 *  dropped and rebuilt with a freshly read session token (getSession refreshes
 *  an expired one), backing off 1 s → 30 s. Once it's SUBSCRIBED again,
 *  `onResync` runs so the caller refetches whatever it missed (thread, inbox,
 *  badge). Returns an unsubscribe that also stops any pending rejoin. */
/** Catch-up after a reconnect. Return (or resolve) `false` if it failed so
 *  it is retried. */
export type Resync = () => unknown

function keepChannel(
  client: SupabaseClient,
  label: string,
  configure: (channel: RealtimeChannel) => RealtimeChannel,
  onResync?: Resync,
): () => void {
  let channel: RealtimeChannel | null = null
  let cancelled = false
  let attempt = 0
  let recovering = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const connect = async () => {
    if (cancelled) return
    try {
      const { data } = await client.auth.getSession()
      if (data.session?.access_token) await client.realtime.setAuth(data.session.access_token)
    } catch {
      // offline: the join below fails and we back off
    }
    if (cancelled) return
    const current = configure(client.channel(`${label}:${newClientId()}`))
    channel = current
    current.subscribe((status, error) => {
      if (cancelled || channel !== current) return
      if (status === "SUBSCRIBED") {
        attempt = 0
        if (recovering) {
          recovering = false
          void resync(0)
        }
        return
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (status !== "CLOSED") console.warn(`[messaging] realtime ${label}: ${status}, rejoining`, error?.message ?? "")
        recovering = true
        channel = null
        void client.removeChannel(current)
        const delay = Math.min(30_000, 1_000 * 2 ** attempt) + Math.floor(Math.random() * 400)
        attempt += 1
        timer = setTimeout(() => void connect(), delay)
      }
    })
  }

  // The catch-up fetch can fail if the socket is back before the rest of the
  // network is; retry it a few times instead of silently missing messages.
  const resync = async (tries: number): Promise<void> => {
    if (cancelled || !onResync) return
    let ok = false
    try { ok = (await onResync()) !== false } catch { ok = false }
    if (ok || cancelled || tries >= 5) return
    timer = setTimeout(() => void resync(tries + 1), 1_000 * 2 ** tries)
  }

  void connect()
  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
    if (channel) void client.removeChannel(channel)
    channel = null
  }
}

/** New messages in one conversation. `onResync` runs after a dropped
 *  connection comes back, to fetch anything sent in the meantime. */
export function subscribeToConversation(
  client: SupabaseClient,
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
  onResync?: Resync,
): () => void {
  return keepChannel(client, `messages:${conversationId}`, (channel) =>
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new as ChatMessage),
    ), onResync)
}

/** Anything that can change your inbox or badge: a new message anywhere you
 *  belong, or your own read marker / membership changing on another device.
 *  `onChange` also runs after a dropped connection comes back. */
export function subscribeToInbox(client: SupabaseClient, userId: string, onChange: Resync): () => void {
  return keepChannel(client, `inbox:${userId}`, (channel) =>
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => void onChange())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
        () => void onChange(),
      ), onChange)
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
