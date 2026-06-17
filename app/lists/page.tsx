import { createClient } from "@/lib/supabase/server"
import ListsDiscoveryClient from "@/components/lists/ListsDiscoveryClient"
import type { DiscoveryList, ListItemCover, ListMediaType } from "@/lib/supabase/lists"

export const dynamic = "force-dynamic"

type RawList = {
  id: string
  user_id: string
  title: string
  description: string | null
  is_ranked: boolean
  like_count: number
  save_count: number
  trending_score: number
  created_at: string
}

type RawItem = {
  list_id: string
  media_type: ListMediaType
  poster_url: string | null
  title: string
}

type RawProfile = {
  id: string
  username: string | null
  display_name: string | null
}

export default async function ListsDiscoveryPage() {
  const supabase = await createClient()

  if (!supabase) {
    return <ListsDiscoveryClient lists={[]} currentUserId={null} likedListIds={[]} savedListIds={[]} />
  }

  const { data: rawLists } = await supabase
    .from("user_lists")
    .select("id, user_id, title, description, is_ranked, like_count, save_count, trending_score, created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(100)

  if (!rawLists || rawLists.length === 0) {
    return <ListsDiscoveryClient lists={[]} currentUserId={null} likedListIds={[]} savedListIds={[]} />
  }

  const listIds = (rawLists as RawList[]).map((l) => l.id)
  const userIds = Array.from(new Set((rawLists as RawList[]).map((l) => l.user_id)))

  // Fetch current user for engagement state
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null

  const [
    { data: items },
    { data: profiles },
    { data: likedRows },
    { data: savedRows },
  ] = await Promise.all([
    supabase
      .from("user_list_items")
      .select("list_id, media_type, poster_url, title")
      .in("list_id", listIds)
      .order("rank_order", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds),
    currentUserId
      ? supabase.from("list_likes").select("list_id").eq("user_id", currentUserId).in("list_id", listIds)
      : Promise.resolve({ data: [] }),
    currentUserId
      ? supabase.from("list_saves").select("list_id").eq("user_id", currentUserId).in("list_id", listIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map(
    (profiles as RawProfile[] ?? []).map((p) => [p.id, p]),
  )

  const itemsByList = new Map<string, RawItem[]>()
  for (const item of (items as RawItem[] ?? [])) {
    const bucket = itemsByList.get(item.list_id) ?? []
    bucket.push(item)
    itemsByList.set(item.list_id, bucket)
  }

  const likedListIds = (likedRows ?? []).map((r: { list_id: string }) => r.list_id)
  const savedListIds = (savedRows ?? []).map((r: { list_id: string }) => r.list_id)

  const lists: DiscoveryList[] = (rawLists as RawList[]).map((list) => {
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

  return (
    <ListsDiscoveryClient
      lists={lists}
      currentUserId={currentUserId}
      likedListIds={likedListIds}
      savedListIds={savedListIds}
    />
  )
}
