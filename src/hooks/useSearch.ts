"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { searchMedia } from "@/src/lib/searchMedia"
import { createClient } from "@/lib/supabase/client"

// ─── Client-side Open Library book search ─────────────────────────────────
// Same source / same endpoint as Mount Rushmore book search.
// Done client-side so it is never blocked by server-side network restrictions.
type OLDoc = {
  key?: string
  title?: string
  first_publish_year?: number
  cover_i?: number
  author_name?: string[]
}

async function searchOpenLibraryBooks(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query.trim())}&limit=5`,
      { signal }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { docs?: OLDoc[] }
    return (data.docs ?? [])
      .filter((doc) => doc.key && doc.title)
      .slice(0, 5)
      .map((doc): SearchResult => {
        const routeId = (doc.key ?? "").replace(/^\/works\//, "")
        return {
          id:          `ol-${routeId}`,
          media_type:  "book",
          title:       doc.title ?? "",
          year:        doc.first_publish_year ? String(doc.first_publish_year) : null,
          poster_path: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          author:      doc.author_name?.[0] ?? null,
          href:        `/books/${routeId}`,
        }
      })
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      console.error("[search] Open Library fetch error:", err)
    }
    return []
  }
}

export interface SearchResult {
  id: number | string
  media_type: "film" | "series" | "book" | "user" | "short_film"
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
  short_films: SearchResult[]
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

      try {
        const [payload, profileResults, olBooks] = await Promise.all([
          searchMedia(query, {
            types: "film,series",   // books come from client-side OL fetch below
            limit: 7,
            signal: controller.signal,
          }),
          searchProfiles(query),
          searchOpenLibraryBooks(query, controller.signal),
        ])

        setResults([
          ...(payload.films || []).slice(0, 3),
          ...(payload.series || []).slice(0, 2),
          ...olBooks.slice(0, 3),
          ...(payload.short_films || []).slice(0, 2),
          ...profileResults,
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
