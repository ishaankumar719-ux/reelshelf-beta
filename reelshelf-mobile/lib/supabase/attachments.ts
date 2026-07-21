// Review attachment system — real image upload + real GIPHY search/trending,
// replacing the old paste-URL-only fallback. Exact port of the website's real
// system (WEBSITE_ATTACHMENT_SYSTEM_AUDIT.md): same bucket, same path
// convention, same size/MIME checks, same GIPHY endpoints/params, same saved-
// URL field. Storage cleanup-on-replace/remove is a DELIBERATE mobile-side
// improvement beyond website parity (the website never cleans up orphaned
// files) — see deleteReviewAttachment below.
import { supabase } from './client';

const BUCKET = 'review-attachments'; // plural — the ONE real, live bucket (confirmed
// live via storage.buckets: 10MB limit + MIME allowlist match this bucket exactly).
// "review-attachment" (singular) is confirmed dead/legacy — never reference it.
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB, matches the website's real check exactly
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export type UploadImageResult = { url: string } | { error: string };

/** Real Storage upload — mirrors the website's uploadAttachment() exactly:
 *  same bucket, same flat `attachments/{timestamp}-{random}.{ext}` path (no
 *  user/review folder segmentation — confirmed this IS the real convention,
 *  not an oversight), same 10MB/MIME checks, `upsert: false` (every upload is
 *  a new object, never overwritten in place). No compression here — the
 *  caller (the image picker flow) already asked expo-image-picker for a
 *  compressed JPEG via its `quality` option before this is ever called. */
export async function uploadReviewImage(
  uri: string,
  mimeType: string | undefined,
  fileName: string | undefined,
): Promise<UploadImageResult> {
  const client = requireClient();

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_BYTES) {
    return { error: 'Image must be under 10 MB.' };
  }

  const contentType = mimeType || 'image/jpeg';
  if (!ALLOWED_MIME.includes(contentType)) {
    return { error: 'Only JPEG, PNG, WebP, and GIF images are supported.' };
  }

  const ext = (fileName?.split('.').pop() || contentType.split('/')[1] || 'jpg').toLowerCase();
  const path = `attachments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) return { error: error.message };

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

/** Parses the storage path back out of a public URL this same upload function
 *  produced. Only ever operates on one exact, known URL passed in by the
 *  caller — never lists or scans the bucket. */
function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/** Deliberate mobile-side improvement over website parity (explicit product
 *  decision — see WEBSITE_ATTACHMENT_SYSTEM_AUDIT.md §7: the website never
 *  cleans up old files on replace/remove, leaving them permanently orphaned).
 *  Deletes exactly the one path parsed from `publicUrl` — never a broader
 *  bucket operation. Best-effort: a failure here should never block the
 *  user's save/remove action, so callers should treat this as fire-and-forget. */
export async function deleteReviewAttachment(publicUrl: string): Promise<void> {
  const path = extractStoragePath(publicUrl);
  if (!path) return;
  const client = requireClient();
  await client.storage.from(BUCKET).remove([path]);
}

// ── GIPHY ────────────────────────────────────────────────────────────────────
// Same two endpoints/params as the website (search + trending, limit=18,
// rating=g) and the same saved-value convention (fullUrl == images.downsized.url
// goes into attachment_url). Diverges from the website deliberately in two
// ways, both explicit product decisions: real failures are thrown (not
// swallowed to []) so the UI can show a genuine error+Retry state, and an
// `offset` param supports mobile-only pagination the website never had.

export interface GiphyGif {
  id:         string;
  title:      string;
  previewUrl: string; // images.fixed_height_small.url — grid thumbnail
  fullUrl:    string;  // images.downsized.url — the saved attachment value
  width:      number;
  height:     number;
  provider:   'giphy';
}

export interface GiphyFetchResult {
  gifs:    GiphyGif[];
  hasMore: boolean;
}

/** Classifies WHY a GIPHY request failed so the UI can show a specific
 *  message and decide whether Retry would even help:
 *  - 'invalid-key': 401/403 — the key itself is wrong/revoked, retrying won't help.
 *  - 'rate-limited': 429 — transient, retrying later will likely help.
 *  - 'offline': the fetch never reached GIPHY at all (no connectivity) — transient.
 *  - 'request-failed': any other non-OK status or unexpected exception — transient. */
export type GiphyErrorKind = 'invalid-key' | 'rate-limited' | 'offline' | 'request-failed';

export class GiphyFetchError extends Error {
  readonly kind: GiphyErrorKind;
  readonly status?: number;
  constructor(kind: GiphyErrorKind, message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

const GIPHY_LIMIT = 18;

export function hasGiphyKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GIPHY_API_KEY);
}

/** Missing key is treated as a caller-side precondition, not a fetch failure —
 *  callers must check `hasGiphyKey()` themselves and show the dedicated
 *  "unavailable" state instead of ever calling this. */
export async function fetchGiphyGifs(
  query: string,
  offset: number,
  signal?: AbortSignal,
): Promise<GiphyFetchResult> {
  const key = process.env.EXPO_PUBLIC_GIPHY_API_KEY ?? '';
  if (!key) throw new Error('EXPO_PUBLIC_GIPHY_API_KEY is not configured');

  const base = 'https://api.giphy.com/v1/gifs';
  const endpoint = query.trim()
    ? `${base}/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=${GIPHY_LIMIT}&offset=${offset}&rating=g`
    : `${base}/trending?api_key=${key}&limit=${GIPHY_LIMIT}&offset=${offset}&rating=g`;
  const redactedEndpoint = endpoint.replace(key, '<redacted>');

  let res: Response;
  try {
    res = await fetch(endpoint, { signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e; // let the caller's abort check see this
    // React Native's fetch throws a plain TypeError ("Network request failed")
    // when the request never reaches the server at all — no connectivity.
    if (__DEV__) console.warn(`[giphy] network exception ${redactedEndpoint} — ${String(e)}`);
    throw new GiphyFetchError('offline', 'Network request failed');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable body>');
    if (__DEV__) {
      console.warn(`[giphy] ${res.status} ${redactedEndpoint} — ${body.slice(0, 300)}`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new GiphyFetchError('invalid-key', `GIPHY rejected the API key (${res.status})`, res.status);
    }
    if (res.status === 429) {
      throw new GiphyFetchError('rate-limited', 'GIPHY rate limit exceeded (429)', res.status);
    }
    throw new GiphyFetchError('request-failed', `GIPHY request failed (${res.status})`, res.status);
  }

  const json = await res.json();
  if (__DEV__) {
    console.log(`[giphy] 200 ${redactedEndpoint} — ${Array.isArray(json?.data) ? json.data.length : 0} results`);
  }
  const data = Array.isArray(json.data) ? json.data : [];
  const gifs: GiphyGif[] = data
    .filter((g: any) => g?.id && g?.images?.fixed_height_small?.url && g?.images?.downsized?.url)
    .map((g: any) => ({
      id:         g.id,
      title:      typeof g.title === 'string' ? g.title : '',
      previewUrl: g.images.fixed_height_small.url,
      fullUrl:    g.images.downsized.url,
      width:      Number(g.images.fixed_height_small.width) || 0,
      height:     Number(g.images.fixed_height_small.height) || 0,
      provider:   'giphy' as const,
    }));

  const totalCount = Number(json?.pagination?.total_count) || 0;
  const returnedOffset = Number(json?.pagination?.offset) || offset;
  const hasMore = returnedOffset + gifs.length < totalCount;

  return { gifs, hasMore };
}
