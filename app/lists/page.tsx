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
    return <ListsDiscoveryClient lists={[]} />
  }

  const { data: rawLists } = await supabase
    .from("user_lists")
    .select("id, user_id, title, description, is_ranked, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100)

  if (!rawLists || rawLists.length === 0) {
    return <ListsDiscoveryClient lists={[]} />
  }

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
    (profiles as RawProfile[] ?? []).map((p) => [p.id, p]),
  )

  const itemsByList = new Map<string, RawItem[]>()
  for (const item of (items as RawItem[] ?? [])) {
    const bucket = itemsByList.get(item.list_id) ?? []
    bucket.push(item)
    itemsByList.set(item.list_id, bucket)
  }

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
      title: list.title,
      description: list.description,
      is_ranked: list.is_ranked,
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

  return <ListsDiscoveryClient lists={lists} />
}
