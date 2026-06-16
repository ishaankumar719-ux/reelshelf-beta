import type { SupabaseClient } from "@supabase/supabase-js"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ListMediaType = "movie" | "tv" | "book"

export interface UserList {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: boolean
  is_ranked: boolean
  created_at: string
  updated_at: string
}

export interface ListItemCover {
  media_type: ListMediaType
  poster_url: string | null
  title: string
}

export interface UserListWithCount extends UserList {
  item_count: number
  coverItems: ListItemCover[]
}

export interface UserListItem {
  id: string
  list_id: string
  media_type: ListMediaType
  media_id: string
  title: string
  poster_url: string | null
  year: string | null
  rank_order: number
  notes: string | null
  created_at: string
}

export interface DiscoveryList {
  id: string
  title: string
  description: string | null
  is_ranked: boolean
  created_at: string
  item_count: number
  media_types: ListMediaType[]
  coverItems: ListItemCover[]
  creator: {
    username: string | null
    display_name: string | null
  }
}

export interface ListWithItems {
  list: UserList
  items: UserListItem[]
  creator: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

// ── Poster URL helper ─────────────────────────────────────────────────────────

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w342"

// Guarantees absolute URL for poster_url column — never a relative TMDB path.
export function toAbsolutePosterUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${TMDB_IMG_BASE}${path}`
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function fetchListsForProfile(
  supabase: SupabaseClient,
  userId: string,
  includePrivate: boolean
): Promise<UserListWithCount[]> {
  let query = supabase
    .from("user_lists")
    .select("id, user_id, title, description, is_public, is_ranked, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (!includePrivate) {
    query = query.eq("is_public", true)
  }

  const { data, error } = await query
  if (error || !data || (data as UserList[]).length === 0) return []

  const ids = (data as UserList[]).map((l) => l.id)
  const { data: itemRows } = await supabase
    .from("user_list_items")
    .select("list_id, media_type, poster_url, title")
    .in("list_id", ids)
    .order("rank_order", { ascending: true })

  type ItemRow = { list_id: string; media_type: ListMediaType; poster_url: string | null; title: string }

  const counts = new Map<string, number>()
  const covers = new Map<string, ListItemCover[]>()
  for (const row of (itemRows ?? []) as ItemRow[]) {
    counts.set(row.list_id, (counts.get(row.list_id) ?? 0) + 1)
    const bucket = covers.get(row.list_id) ?? []
    if (bucket.length < 4) bucket.push({ media_type: row.media_type, poster_url: row.poster_url, title: row.title })
    covers.set(row.list_id, bucket)
  }

  return (data as UserList[]).map((l) => ({
    ...l,
    item_count: counts.get(l.id) ?? 0,
    coverItems: covers.get(l.id) ?? [],
  }))
}

export async function fetchListWithItems(
  supabase: SupabaseClient,
  listId: string
): Promise<ListWithItems | null> {
  const { data: listData, error: listError } = await supabase
    .from("user_lists")
    .select("id, user_id, title, description, is_public, is_ranked, created_at, updated_at")
    .eq("id", listId)
    .single()

  if (listError || !listData) return null

  const list = listData as UserList

  const [{ data: itemsData }, { data: profileData }] = await Promise.all([
    supabase
      .from("user_list_items")
      .select("id, list_id, media_type, media_id, title, poster_url, year, rank_order, notes, created_at")
      .eq("list_id", listId)
      .order("rank_order", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", list.user_id)
      .single(),
  ])

  return {
    list,
    items: (itemsData ?? []) as UserListItem[],
    creator: (profileData ?? {
      id: list.user_id,
      username: null,
      display_name: null,
      avatar_url: null,
    }) as ListWithItems["creator"],
  }
}

export async function createList(
  supabase: SupabaseClient,
  userId: string,
  data: { title: string; description?: string; is_public: boolean; is_ranked: boolean }
): Promise<UserList | null> {
  const { data: result, error } = await supabase
    .from("user_lists")
    .insert({
      user_id: userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      is_public: data.is_public,
      is_ranked: data.is_ranked,
    })
    .select()
    .single()

  if (error) return null
  return result as UserList
}

export async function updateList(
  supabase: SupabaseClient,
  listId: string,
  data: Partial<Pick<UserList, "title" | "description" | "is_public" | "is_ranked">>
): Promise<boolean> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.title !== undefined) patch.title = data.title.trim()
  if (data.description !== undefined) patch.description = data.description?.trim() || null
  if (data.is_public !== undefined) patch.is_public = data.is_public
  if (data.is_ranked !== undefined) patch.is_ranked = data.is_ranked

  const { error } = await supabase.from("user_lists").update(patch).eq("id", listId)
  return !error
}

export async function deleteList(
  supabase: SupabaseClient,
  listId: string
): Promise<boolean> {
  const { error } = await supabase.from("user_lists").delete().eq("id", listId)
  return !error
}

export async function addListItem(
  supabase: SupabaseClient,
  listId: string,
  item: {
    media_type: ListMediaType
    media_id: string
    title: string
    poster_url: string | null
    year: string | null
    rank_order: number
    notes?: string | null
    author?: string | null
  }
): Promise<UserListItem | null> {
  const { data, error } = await supabase
    .from("user_list_items")
    .insert({
      list_id: listId,
      media_type: item.media_type,
      media_id: item.media_id,
      title: item.title,
      poster_url: item.poster_url,
      year: item.year,
      rank_order: item.rank_order,
      notes: item.notes ?? null,
      author: item.author ?? null,
    })
    .select()
    .single()

  if (error) return null
  return data as UserListItem
}

export async function removeListItem(
  supabase: SupabaseClient,
  itemId: string
): Promise<boolean> {
  const { error } = await supabase.from("user_list_items").delete().eq("id", itemId)
  return !error
}

// Batch-update rank_order for two swapped items.
export async function updateItemRankOrders(
  supabase: SupabaseClient,
  updates: Array<{ id: string; rank_order: number }>
): Promise<boolean> {
  const results = await Promise.all(
    updates.map(({ id, rank_order }) =>
      supabase.from("user_list_items").update({ rank_order }).eq("id", id)
    )
  )
  return results.every((r) => !r.error)
}
