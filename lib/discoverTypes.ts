export interface DiscoverItem {
  id: string
  mediaType: "movie" | "tv" | "book"
  title: string
  year: string
  poster: string | null
  href: string
  subtitle?: string
  reason?: string
  releaseBadge?: string
  badge?: string
  trendScore?: number
}

export interface CollectionCard {
  slug: string
  name: string
  description: string
  posters: string[]
  count: number
}

export interface HeroCard {
  mediaType: "movie" | "tv" | "book"
  title: string
  year: string
  poster: string | null
  href: string
  meta?: string
}
