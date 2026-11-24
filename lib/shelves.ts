"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaType } from "./media";
import { getMediaHref } from "./mediaRoutes";

export type Visibility = "public" | "unlisted" | "private";
export type SystemShelf = "film" | "tv" | "reading";

export type ShelfItem = {
  /** Row id: saved_items.id or user_list_items.id */
  key: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  poster: string | null;
  year: string | null;
  creator: string | null;
  note: string | null;
  rank: number | null;
  href: string;
};

export type Shelf = {
  id: string; // "film" | "tv" | "reading" | list uuid
  kind: "system" | "list";
  title: string;
  description: string | null;
  visibility: Visibility;
  ranked: boolean;
  items: ShelfItem[];
  /** For unlisted links */
  shareUrl: string | null;
  listHref: string | null;
};

export const SYSTEM_SHELVES: { id: SystemShelf; title: string; listType: string }[] = [
  { id: "film", title: "Films to watch", listType: "watchlist" },
  { id: "tv", title: "Shows to watch", listType: "watchlist" },
  { id: "reading", title: "Reading list", listType: "reading_shelf" },
];

type SavedRow = {
  id: string;
  media_id: string;
  media_type: MediaType;
  title: string;
  poster: string | null;
  year: number | null;
  creator: string | null;
};

type ListRow = {
  id: string;
  title: string;
  description: string | null;
  is_ranked: boolean;
  visibility: Visibility;
  user_list_items: {
    id: string;
    media_id: string;
    media_type: MediaType;
    title: string;
    poster_url: string | null;
    year: string | null;
    author: string | null;
    notes: string | null;
    rank_order: number;
  }[];
};

function hrefFor(mediaId: string, mediaType: MediaType) {
  try {
    return getMediaHref({ id: mediaId, mediaType });
  } catch {
    return "#";
  }
}

function fromSaved(r: SavedRow): ShelfItem {
  return {
    key: r.id,
    mediaId: r.media_id,
    mediaType: r.media_type,
    title: r.title,
    poster: r.poster,
    year: r.year ? String(r.year) : null,
    creator: r.creator,
    note: null,
    rank: null,
    href: hrefFor(r.media_id, r.media_type),
  };
}

/**
 * The legacy local-watchlist sync can write the same title twice ("tmdb-123" and "123").
 * Show each title once, keeping the first (best-placed) copy.
 */
function dedupe(items: ShelfItem[]) {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = `${i.mediaType}:${i.mediaId.replace(/^tmdb-/, "")}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function fromList(l: ListRow): Shelf {
  const items = [...(l.user_list_items ?? [])]
    .sort((a, b) => a.rank_order - b.rank_order)
    .map<ShelfItem>((i) => ({
      key: i.id,
      mediaId: i.media_id,
      mediaType: i.media_type,
      title: i.title,
      poster: i.poster_url,
      year: i.year,
      creator: i.author,
      note: i.notes,
      rank: l.is_ranked ? i.rank_order : null,
      href: hrefFor(i.media_id, i.media_type),
    }));
  return {
    id: l.id,
    kind: "list",
    title: l.title,
    description: l.description,
    visibility: l.visibility ?? "private",
    ranked: l.is_ranked,
    items,
    shareUrl: null,
    listHref: `/lists/${l.id}`,
  };
}

const LIST_SELECT =
  "id, title, description, is_ranked, visibility, user_list_items(id, media_id, media_type, title, poster_url, year, author, notes, rank_order)";

async function systemShelf(
  sb: SupabaseClient,
  userId: string,
  shelf: SystemShelf,
  visibility: Visibility,
  token: string | null,
  shareBase: string | null
): Promise<Shelf> {
  const { data } = await sb.rpc("get_shelf_items", {
    p_user: userId,
    p_shelf: shelf,
    p_token: token,
  });
  const def = SYSTEM_SHELVES.find((s) => s.id === shelf)!;
  return {
    id: shelf,
    kind: "system",
    title: def.title,
    description: null,
    visibility,
    ranked: false,
    items: dedupe(((data ?? []) as SavedRow[]).map(fromSaved)),
    shareUrl: shareBase ? `${shareBase}?shelf=${shelf}${token ? `&t=${token}` : ""}` : null,
    listHref: null,
  };
}

/** Everything the owner sees on /shelves. */
export async function loadOwnShelves(sb: SupabaseClient, userId: string, username: string | null) {
  const [{ data: settings }, { data: lists }] = await Promise.all([
    sb.from("shelf_settings").select("film_visibility, tv_visibility, reading_visibility, share_token").eq("user_id", userId).maybeSingle(),
    sb.from("user_lists").select(LIST_SELECT).eq("user_id", userId).order("updated_at", { ascending: false }),
  ]);
  const vis = (s: SystemShelf): Visibility =>
    ((settings as Record<string, Visibility> | null)?.[`${s}_visibility`] ?? "private") as Visibility;
  const token = (settings as { share_token?: string } | null)?.share_token ?? null;
  const base = username ? `/u/${username}/shelves` : null;
  const system = await Promise.all(
    SYSTEM_SHELVES.map((s) => systemShelf(sb, userId, s.id, vis(s.id), vis(s.id) === "unlisted" ? token : null, base))
  );
  const custom = ((lists ?? []) as ListRow[]).map(fromList);
  return { shelves: [...system, ...custom], token };
}

/** What someone else may see: public system shelves + public lists, or one unlisted shelf via token. */
export async function loadProfileShelves(
  sb: SupabaseClient,
  userId: string,
  opts: { shelf?: string | null; token?: string | null }
) {
  if (opts.shelf && opts.token) {
    if (SYSTEM_SHELVES.some((s) => s.id === opts.shelf)) {
      const shelf = await systemShelf(sb, userId, opts.shelf as SystemShelf, "unlisted", opts.token, null);
      return shelf.items.length ? [shelf] : [];
    }
  }
  const [{ data: rows }, { data: lists }] = await Promise.all([
    sb.rpc("profile_shelves", { p_user: userId }),
    sb.from("user_lists").select(LIST_SELECT).eq("user_id", userId).eq("visibility", "public").order("updated_at", { ascending: false }),
  ]);
  const visible = ((rows ?? []) as { shelf: SystemShelf; visibility: Visibility }[]).filter((r) => r.visibility === "public");
  const system = await Promise.all(visible.map((r) => systemShelf(sb, userId, r.shelf, "public", null, null)));
  return [...system.filter((s) => s.items.length), ...((lists ?? []) as ListRow[]).map(fromList)];
}

export async function saveShelfOrder(sb: SupabaseClient, shelf: Shelf, ordered: ShelfItem[]) {
  if (shelf.kind === "system") {
    const listType = SYSTEM_SHELVES.find((s) => s.id === shelf.id)!.listType;
    return sb.rpc("reorder_shelf", { p_list_type: listType, p_ids: ordered.map((i) => i.key) });
  }
  return sb.rpc("update_list_items_order", {
    payload: ordered.map((i, idx) => ({ id: i.key, rank_order: idx + 1 })),
  });
}

export async function setShelfVisibility(sb: SupabaseClient, userId: string, shelf: Shelf, v: Visibility) {
  if (shelf.kind === "system") {
    return sb
      .from("shelf_settings")
      .upsert({ user_id: userId, [`${shelf.id}_visibility`]: v, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }
  return sb.from("user_lists").update({ visibility: v, is_public: v === "public" }).eq("id", shelf.id);
}

/** TMDB posters come at w342/w500; spines only need a slim slice. */
export function posterAt(url: string | null, size: "w154" | "w185" | "w342") {
  if (!url) return null;
  return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
}
