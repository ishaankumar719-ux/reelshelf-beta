"use client"

import { useEffect, useRef, useState } from "react"
import { searchMedia } from "@/src/lib/searchMedia"

export interface RushmoreSearchResult {
  media_id: number
  media_type: "film" | "series"
  title: string
  year: string | null
  poster_path: string | null
  director: string | null
}

interface SearchApiResponse {
  films: Array<{
    id: number
    title: string
    year: string | null
    poster_path: string | null
    director?: string | null
  }>
  series: Array<{
    id: number
    title: string
    year: string | null
    poster_path: string | null
    director?: string | null
  }>
}

interface UseRushmoreSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: RushmoreSearchResult[]
  isLoading: boolean
  clear: () => void
}

function mapFilmResult(item: SearchApiResponse["films"][number]): RushmoreSearchResult {
  return {
    media_id: item.id,
    media_type: "film",
    title: item.title,
    year: item.year,
    poster_path: item.poster_path,
    director: item.director ?? null,
  }
}

function mapSeriesResult(item: SearchApiResponse["series"][number]): RushmoreSearchResult {
  return {
    media_id: item.id,
    media_type: "series",
    title: item.title,
    year: item.year,
    poster_path: item.poster_path,
    director: item.director ?? null,
  }
}

export function useRushmoreSearch(): UseRushmoreSearchReturn {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<RushmoreSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      abortRef.current?.abort()
      setResults([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)

      try {
        const payload = await searchMedia(query, {
          type: "both",
          limit: 6,
          signal: controller.signal,
        })
        const films = (payload.films || []).map(mapFilmResult)
        const series = (payload.series || []).map(mapSeriesResult)
        const merged = [...films, ...series].slice(0, 6)
        console.log("[SEARCH] Results being set:", merged)
        setResults(merged)
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return
        }

        console.log("[SEARCH] Results being set:", [])
        setResults([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 300)

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
    clear: () => {
      abortRef.current?.abort()
      setQuery("")
      setResults([])
      setIsLoading(false)
    },
  }
}
