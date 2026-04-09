import type { SearchResult } from "@/src/hooks/useSearch"

type SearchApiResponse = {
  films: SearchResult[]
  series: SearchResult[]
  books: SearchResult[]
}

export async function searchMedia(
  query: string,
  options?: {
    types?: string
    type?: string
    limit?: number
    signal?: AbortSignal
  }
): Promise<SearchApiResponse> {
  console.log("[SEARCH] Query received:", query)

  const params = new URLSearchParams()
  params.set("q", query)

  if (options?.types) {
    params.set("types", options.types)
  }

  if (options?.type) {
    params.set("type", options.type)
  }

  if (typeof options?.limit === "number") {
    params.set("limit", String(options.limit))
  }

  const response = await fetch(`/api/search?${params.toString()}`, {
    cache: "no-store",
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error("Search failed.")
  }

  return (await response.json()) as SearchApiResponse
}
