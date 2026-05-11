"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { searchMedia } from "@/src/lib/searchMedia"
import { createClient } from "@/lib/supabase/client"

export interface SearchResult {
  id: number | string
  media_type: "film" | "series" | "book" | "user"
  title: string
  year: string | null
  poster_path: string | null
  director?: string | null
  author?: string | null
  href?: string
  // user-specific
  username?: string | null
  avatar_url?: string | null
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

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

async function searchProfiles(query: string): Promise<SearchResult[]> {
  const client = createClient()
  if (!client) return []

  const { data } = await client
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .not("username", "is", null)
    .limit(4)

  if (!data) return []

  return (data as ProfileRow[]).map((profile) => ({
    id: profile.id,
    media_type: "user" as const,
    title: profile.display_name || profile.username || "Unknown",
    year: null,
    poster_path: null,
    username: profile.username,
    avatar_url: profile.avatar_url,
    href: profile.username ? `/u/${encodeURIComponent(profile.username)}` : "/",
  }))
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
      console.log("[SEARCH] request start:", query)

      try {
        const [payload, profileResults] = await Promise.all([
          searchMedia(query, {
            types: "film,series,book",
            limit: 7,
            signal: controller.signal,
          }),
          searchProfiles(query),
        ])

        const nextResults = [
          ...(payload.films || []).slice(0, 3),
          ...(payload.series || []).slice(0, 2),
          ...(payload.books || []).slice(0, 2),
          ...profileResults,
        ]
        console.log("[SEARCH] Results being set:", nextResults)
        setResults(nextResults)
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return
        }

        console.log("[SEARCH] Results being set:", [])
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
    setQuery: (value) => {
      console.log("[SEARCH] setQuery called with:", value)
      setQuery(value)
    },
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
