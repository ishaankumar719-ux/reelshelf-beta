import SearchPageClient, {
  type TMDBSearchResult,
} from "@/components/search/SearchPageClient"

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

async function fetchTmdbResults(query: string, apiKey: string): Promise<TMDBSearchResult[]> {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/multi` +
      `?api_key=${apiKey}` +
      `&query=${encodeURIComponent(query)}` +
      `&language=en-US`,
    { next: { revalidate: 0 } }
  )

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as { results?: TMDBSearchResult[] }
  return (payload.results ?? []).filter((result) => result.media_type !== "person")
}

async function fetchTrending(apiKey: string): Promise<TMDBSearchResult[]> {
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/movie/week` +
      `?api_key=${apiKey}&language=en-US`,
    { next: { revalidate: 3600 } }
  )

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as { results?: TMDBSearchResult[] }
  return (payload.results ?? [])
    .filter((result) => result.media_type !== "person")
    .slice(0, 18)
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  const initialQuery = (resolvedSearchParams.q ?? "").trim()
  const apiKey = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY

  if (!apiKey) {
    return <SearchPageClient initialQuery={initialQuery} results={[]} trending={[]} />
  }

  const [trending, results] = await Promise.all([
    fetchTrending(apiKey),
    initialQuery.length >= 2 ? fetchTmdbResults(initialQuery, apiKey) : Promise.resolve([]),
  ])

  return (
    <SearchPageClient
      initialQuery={initialQuery}
      results={results}
      trending={trending}
    />
  )
}
