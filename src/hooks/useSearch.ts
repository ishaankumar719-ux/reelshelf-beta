"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

export interface SearchResult {
  id: number
  media_type: "film" | "series" | "book"
  title: string
  year: string | null
  poster_path: string | null
  director?: string | null
  author?: string | null
  href?: string
}

interface SearchApiResponse {
  films: SearchResult[]
  series: SearchResult[]
  books: SearchResult[]
}

export interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  clear: () => void
}

export function useSearch(): UseSearchReturn {
  const searchParams = useSearchParams()
  const routeQuery = searchParams.get("q") ?? ""
  const [query, setQuery] = useState(routeQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setQuery(routeQuery)
  }, [routeQuery])

  useEffect(() => {
    if (query.trim().length < 2) {
      abortRef.current?.abort()
      setResults([])
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&types=film,series,book&limit=7`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        )

        if (!response.ok) {
          throw new Error("Search failed.")
        }

        const payload = (await response.json()) as SearchApiResponse

        setResults([
          ...(payload.films || []).slice(0, 3),
          ...(payload.series || []).slice(0, 2),
          ...(payload.books || []).slice(0, 2),
        ])
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return
        }

        setResults([])
        setError(fetchError instanceof Error ? fetchError.message : "Search failed.")
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 280)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clear: () => {
      abortRef.current?.abort()
      setQuery("")
      setResults([])
      setIsLoading(false)
      setError(null)
    },
  }
}
