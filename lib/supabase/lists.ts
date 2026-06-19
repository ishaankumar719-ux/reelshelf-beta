import type { SupabaseClient } from "@supabase/supabase-js"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ListMediaType = "movie" | "tv" | "book"

export type ListVisibility = "public" | "private" | "unlisted"

export interface UserList {
  id: string
  user_id: string
  title: string
  description: string | null
  visibility: ListVisibility
  is_ranked: boolean
  like_count: number
  save_count: number
  trending_score: number
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
  user_id: string
  title: string
  description: string | null
  is_ranked: boolean
  like_count: number
  save_count: number
  trending_score: number
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
  isOwnerView: boolean
): Promise<UserListWithCount[]> {
  let query = supabase
    .from("user_lists")
    .select("id, user_id, title, description, visibility, is_ranked, like_count, save_count, trending_score, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (!isOwnerView) {
    query = query.eq("visibility", "public")
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
    .select("id, user_id, title, description, visibility, is_ranked, like_count, save_count, trending_score, created_at, updated_at")
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
  data: { title: string; description?: string; visibility: ListVisibility; is_ranked: boolean }
): Promise<UserList | null> {
  const { data: result, error } = await supabase
    .from("user_lists")
    .insert({
      user_id: userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      visibility: data.visibility,
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
  data: Partial<Pick<UserList, "title" | "description" | "visibility" | "is_ranked">>
): Promise<boolean> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.title !== undefined) patch.title = data.title.trim()
  if (data.description !== undefined) patch.description = data.description?.trim() || null
  if (data.visibility !== undefined) patch.visibility = data.visibility
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

export async function fetchRecentPublicLists(
  supabase: SupabaseClient,
  limit = 6
): Promise<DiscoveryList[]> {
  const { data: rawLists } = await supabase
    .from("user_lists")
    .select("id, user_id, title, description, is_ranked, like_count, save_count, trending_score, created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!rawLists || rawLists.length === 0) return []

  type RawList = {
    id: string; user_id: string; title: string; description: string | null
    is_ranked: boolean; like_count: number; save_count: number
    trending_score: number; created_at: string
  }
  type RawItem = { list_id: string; media_type: ListMediaType; poster_url: string | null; title: string }
  type RawProfile = { id: string; username: string | null; display_name: string | null }

  const listIds = (rawLists as RawList[]).map((l) => l.id)
  const userIds = Array.from(new Set((rawLists as RawList[]).map((l) => l.user_id)))

  const [{ data: items }, { data: profiles }] = await Promise.all([
    supabase
      .from("user_list_items")
      .select("list_id, media_type, poster_url, title")
      .in("list_id", listIds)
      .order("rank_order", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds),
  ])

  const profileMap = new Map(
    (profiles as RawProfile[] ?? []).map((p) => [p.id, p])
  )

  const itemsByList = new Map<string, RawItem[]>()
  for (const item of (items as RawItem[] ?? [])) {
    const bucket = itemsByList.get(item.list_id) ?? []
    bucket.push(item)
    itemsByList.set(item.list_id, bucket)
  }

  return (rawLists as RawList[]).map((list) => {
    const listItems = itemsByList.get(list.id) ?? []
    const mediaTypesSet = new Set(listItems.map((i) => i.media_type))
    const coverItems: ListItemCover[] = listItems.slice(0, 4).map((i) => ({
      media_type: i.media_type,
      poster_url: i.poster_url,
      title: i.title,
    }))
    const profile = profileMap.get(list.user_id)
    return {
      id: list.id,
      user_id: list.user_id,
      title: list.title,
      description: list.description,
      is_ranked: list.is_ranked,
      like_count: list.like_count,
      save_count: list.save_count,
      trending_score: list.trending_score,
      created_at: list.created_at,
      item_count: listItems.length,
      media_types: Array.from(mediaTypesSet) as ListMediaType[],
      coverItems,
      creator: {
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
      },
    }
  })
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
