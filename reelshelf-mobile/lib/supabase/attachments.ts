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
// Exact port of the website's fetchGifs() (components/AttachmentPicker.tsx) —
// same two endpoints, same limit/rating params, same silent-empty-array
// failure behavior (never a jarring error state for a GIF search failure).

export interface GiphyGifResult {
  id:             string;
  thumbnailUrl:   string; // images.fixed_height_small.url — grid thumbnail only
  downsizedUrl:   string; // images.downsized.url — the actual saved attachment value
}

export function hasGiphyKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GIPHY_API_KEY);
}

export async function fetchGiphyGifs(query: string): Promise<GiphyGifResult[]> {
  const key = process.env.EXPO_PUBLIC_GIPHY_API_KEY ?? '';
  if (!key) return [];
  try {
    const base = 'https://api.giphy.com/v1/gifs';
    const endpoint = query.trim()
      ? `${base}/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=18&rating=g`
      : `${base}/trending?api_key=${key}&limit=18&rating=g`;
    const res = await fetch(endpoint);
    if (!res.ok) return [];
    const json = await res.json();
    const data = Array.isArray(json.data) ? json.data : [];
    return data
      .filter((g: any) => g?.id && g?.images?.fixed_height_small?.url && g?.images?.downsized?.url)
      .map((g: any) => ({
        id:           g.id,
        thumbnailUrl: g.images.fixed_height_small.url,
        downsizedUrl: g.images.downsized.url,
      }));
  } catch {
    return [];
  }
}
