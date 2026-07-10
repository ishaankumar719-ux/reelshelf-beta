// Shared image-URL resolver — fixes the Top Stories blank-poster bug.
//
// ROOT CAUSE (confirmed by querying real production mount_rushmore rows):
// movies/tv entries store BARE TMDB partial paths, e.g.
// "/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg" — no CDN host, no size bucket. This is
// the same raw `poster_path` TMDB's API returns; every other place in this
// app that touches a raw TMDB path (lib/tmdb.ts's fetchTmdbDetails,
// fetchTmdbCredits, search functions, etc.) immediately prefixes it with
// `TMDB_IMG_POSTER` before storing/rendering it — Top Stories' rendering
// code never did, so it rendered the literal string "/5MwkW...jpg" as a URI,
// which resolves to nothing (blank rectangle), never an actual error state.
//
// Books in mount_rushmore store full OpenLibrary cover URLs
// (https://covers.openlibrary.org/b/id/<id>-M.jpg) — already valid https,
// pass through unchanged. (The task brief anticipated Google Books covers;
// real production data uses OpenLibrary instead — same "already a full URL"
// shape, so the same pass-through path handles it correctly either way.)
// Supabase Storage public URLs (avatars) are always already-full https URLs
// by construction (`storage.from(bucket).getPublicUrl()`) — also pass
// through unchanged, with an http→https upgrade as a defensive no-op for any
// URL shape that might arrive as `http://`.
import { TMDB_IMG_BACKDROP, TMDB_IMG_POSTER, TMDB_IMG_PROFILE } from '@/lib/tmdb';

export type ImageSizeBucket = 'poster' | 'backdrop' | 'profile';

const SIZE_TO_BASE: Record<ImageSizeBucket, string> = {
  poster:   TMDB_IMG_POSTER,
  backdrop: TMDB_IMG_BACKDROP,
  profile:  TMDB_IMG_PROFILE,
};

/** Resolves any of the three real stored image formats in this app to a
 *  renderable https URL, or null when there's genuinely nothing to show
 *  (caller renders the fallback state — never a blank string passed to
 *  <Image>). */
export function resolveImageUrl(path: string | null | undefined, size: ImageSizeBucket = 'poster'): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  // Bare TMDB path — the confirmed bug case.
  if (trimmed.startsWith('/')) {
    return `${SIZE_TO_BASE[size]}${trimmed}`;
  }

  // Already a full URL (OpenLibrary, Google Books, Supabase Storage, or a
  // pre-resolved TMDB URL) — just normalize http → https.
  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }
  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Unrecognized shape (shouldn't happen for the 3 known formats) — treat as
  // missing rather than risk rendering a broken relative string.
  return null;
}
