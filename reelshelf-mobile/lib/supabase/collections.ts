// Real, editorially-verified collections — replaces the old static seed data
// (data/seedHomeContent.ts's `collections`/`discoverCollections`) and the old
// per-title live-TMDB-discover-query membership check (lib/discoverCollections.ts)
// entirely. Both now read from the shared `collections`/`collection_items`
// tables (see supabase/migrations/20260721_collections.sql), populated and
// individually verified by scripts/validate-collections.ts — never a live
// TMDB query for collection membership anymore, and never anything but
// verification_status='verified' items shown to either app.
import { supabase } from './client';
import { TMDB_IMG_POSTER } from '../tmdb';
import type { MediaType } from '@/data/seedHomeContent';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function dbMediaTypeToApp(dbType: string): MediaType {
  return dbType === 'movie' ? 'film' : (dbType as MediaType);
}
function appMediaTypeToDb(mediaType: MediaType): string {
  return mediaType === 'film' ? 'movie' : mediaType;
}
function toRouteId(mediaType: MediaType, mediaId: string): string {
  return `${mediaType === 'film' ? 'film' : mediaType === 'tv' ? 'tv' : 'book'}-${mediaId}`;
}

export interface CollectionItemCard {
  id:        string; // route id, e.g. "film-493922"
  title:     string;
  year:      number;
  mediaType: MediaType;
  posterUrl: string | null;
}

export interface CollectionCardData {
  /** The collection's slug — used as the route id for /collection/[id], same
   *  convention the old static c-* ids followed (human-readable, stable). */
  id:          string;
  title:       string;
  description: string;
  /** Count of verified items actually returned — no longer an editorial guess. */
  storyCount:  number;
  items:       CollectionItemCard[];
}

async function fetchVerifiedItems(collectionId: string, opts: { limit?: number; excludeMediaId?: string; excludeMediaType?: string } = {}): Promise<CollectionItemCard[]> {
  const client = requireClient();
  let query = client
    .from('collection_items')
    .select('media_id, media_type, title, year, poster_path')
    .eq('collection_id', collectionId)
    .eq('verification_status', 'verified')
    .order('sort_order', { ascending: true });
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .filter((r) => !(opts.excludeMediaId && opts.excludeMediaType && r.media_id === opts.excludeMediaId && r.media_type === opts.excludeMediaType))
    .map((r) => {
      const mediaType = dbMediaTypeToApp(r.media_type as string);
      return {
        id:        toRouteId(mediaType, r.media_id as string),
        title:     r.title as string,
        year:      (r.year as number | null) ?? 0,
        mediaType,
        posterUrl: r.poster_path ? `${TMDB_IMG_POSTER}${r.poster_path}` : null,
      };
    });
}

interface LiveCollectionRow {
  id:          string;
  slug:        string;
  title:       string;
  description: string | null;
}

/** The canonical "what's currently live" query (see
 *  supabase/migrations/20260721_collections.sql) — identical logic every
 *  surface on both mobile and the website must use. */
async function fetchLiveCollectionRows(): Promise<LiveCollectionRow[]> {
  const client = requireClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('collections')
    .select('id, slug, title, description')
    .eq('is_featured', true)
    .lte('active_start_date', nowIso)
    .or(`active_end_date.is.null,active_end_date.gte.${nowIso}`)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function toCard(row: LiveCollectionRow): Promise<CollectionCardData> {
  const items = await fetchVerifiedItems(row.id);
  return { id: row.slug, title: row.title, description: row.description ?? '', storyCount: items.length, items };
}

/** Home's "Collection of the Week" / Discover's Featured Collection Spotlight
 *  — both surfaces feature the same single collection: the first live one by
 *  sort_order. Matches the old behavior of both reading the same
 *  COLLECTION_OF_THE_WEEK_ID constant. */
export async function fetchFeaturedCollection(): Promise<CollectionCardData | null> {
  const live = await fetchLiveCollectionRows();
  if (live.length === 0) return null;
  return toCard(live[0]);
}

/** Discover's Additional Collections row — every other live collection
 *  besides whichever one is currently featured. The old static version only
 *  ever showed a hardcoded subset of 6 (with 5 of the 12 collections
 *  orphaned, reachable nowhere in Discover); now that this is real, dynamic
 *  data, "the rest of what's live" is the natural, non-arbitrary read of
 *  "Additional Collections" rather than reproducing that gap. */
export async function fetchAdditionalCollections(): Promise<CollectionCardData[]> {
  const live = await fetchLiveCollectionRows();
  if (live.length === 0) return [];
  const [, ...rest] = live;
  return Promise.all(rest.map(toCard));
}

/** Collection Detail screen (app/collection/[id].tsx) — id param is the slug. */
export async function fetchCollectionBySlug(slug: string): Promise<CollectionCardData | null> {
  const client = requireClient();
  const { data, error } = await client
    .from('collections')
    .select('id, slug, title, description')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toCard(data);
}

/** Universal Search's Collections category. */
export async function searchCollections(query: string): Promise<CollectionCardData[]> {
  const q = query.trim();
  if (!q) return [];
  const client = requireClient();
  const { data, error } = await client
    .from('collections')
    .select('id, slug, title, description')
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .eq('is_archived', false)
    .limit(15);
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row) => {
    const items = await fetchVerifiedItems(row.id, { limit: 4 });
    return { id: row.slug, title: row.title, description: row.description ?? '', storyCount: items.length, items };
  }));
}

export interface MediaCollectionMembership {
  slug:         string;
  title:        string;
  description:  string;
  previewItems: CollectionItemCard[];
}

/** Movie/TV Detail's "Appears in" section — is THIS exact title a verified
 *  member of any currently-live collection? Real DB membership, not a live
 *  TMDB discover-query re-derivation of the collection's rule (that's what
 *  lib/discoverCollections.ts did before; this replaces it). */
export async function fetchCollectionMembershipForMedia(mediaType: MediaType, tmdbId: string): Promise<MediaCollectionMembership[]> {
  const client = requireClient();
  const dbMediaType = appMediaTypeToDb(mediaType);

  const { data: memberships, error: membershipErr } = await client
    .from('collection_items')
    .select('collection_id')
    .eq('media_id', tmdbId)
    .eq('media_type', dbMediaType)
    .eq('verification_status', 'verified');
  if (membershipErr) throw membershipErr;

  const collectionIds = Array.from(new Set((memberships ?? []).map((m) => m.collection_id as string)));
  if (collectionIds.length === 0) return [];

  // collection_items has no FK to profiles-style RLS concerns, but still two
  // queries merged client-side (same pattern as friendActivity.ts) since we
  // need every matched collection's own "is this collection currently live"
  // state, not just its existence.
  const live = await fetchLiveCollectionRows();
  const liveById = new Map(live.map((c) => [c.id, c]));

  const matched = collectionIds.map((id) => liveById.get(id)).filter((c): c is LiveCollectionRow => !!c);

  return Promise.all(matched.map(async (row) => {
    const previewItems = await fetchVerifiedItems(row.id, { limit: 5, excludeMediaId: tmdbId, excludeMediaType: dbMediaType });
    return {
      slug: row.slug,
      title: row.title,
      description: row.description ?? '',
      previewItems: previewItems.slice(0, 4),
    };
  }));
}
