"use client"

import { useRouter } from "next/navigation"
import { useDiaryLog } from "@/hooks/useDiaryLog"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { useEffect, useMemo, useState, useTransition } from "react"
import SearchResultCard from "./SearchResultCard"
import TrendingGrid from "./TrendingGrid"

export interface TMDBSearchResult {
  id: number
  media_type: "movie" | "tv" | "person"
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
}

interface SearchPageClientProps {
  initialQuery: string
  results: TMDBSearchResult[]
  trending: TMDBSearchResult[]
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function buildSearchHref(query: string) {
  const trimmed = query.trim()
  return trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search"
}

export default function SearchPageClient({
  initialQuery,
  results,
  trending,
}: SearchPageClientProps) {
  const router = useRouter()
  const { openLog } = useDiaryLog()
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set())
  const [inputValue, setInputValue] = useState(initialQuery)
  const [isFocused, setIsFocused] = useState(false)
  const [visible, setVisible] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setInputValue(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const supabase = createSupabaseClient()
    if (!supabase) return
    const client = supabase

    async function loadLogged() {
      const {
        data: { session },
      } = await client.auth.getSession()

      if (!session) return

      const { data } = await client
        .from("diary_entries")
        .select("media_id")
        .eq("user_id", session.user.id)
        .eq("review_scope", "show")

      if (data) {
        setLoggedIds(new Set(data.map((entry) => entry.media_id)))
      }
    }

    void loadLogged()
  }, [])

  useEffect(() => {
    const nextQuery = inputValue.trim()
    const currentQuery = initialQuery.trim()

    if (nextQuery === currentQuery) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        router.replace(buildSearchHref(nextQuery), { scroll: false })
      })
    }, 280)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [initialQuery, inputValue, router])

  useEffect(() => {
    setVisible(false)
    const timeoutId = window.setTimeout(() => {
      setVisible(true)
    }, 80)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [initialQuery, results.length, trending.length])

  const filteredResults = useMemo(
    () => results.filter((result) => result.media_type !== "person"),
    [results]
  )

  const isLogged = (result: TMDBSearchResult): boolean => {
    const tmdbId = `tmdb-${result.id}`
    const title = result.title ?? result.name ?? ""
    const slug = slugify(title)
    const year = (result.release_date ?? result.first_air_date ?? "").slice(0, 4)

    return (
      loggedIds.has(tmdbId) ||
      loggedIds.has(slug) ||
      loggedIds.has(`${slug}-${year}`) ||
      loggedIds.has(`letterboxd-${slug}-${year}`)
    )
  }

  const handleLog = (result: TMDBSearchResult) => {
    const title = result.title ?? result.name ?? ""
    const year = parseInt((result.release_date ?? result.first_air_date ?? "0").slice(0, 4), 10)

    openLog({
      title,
      media_type: result.media_type === "tv" ? "tv" : "movie",
      year: Number.isFinite(year) ? year : 0,
      poster: result.poster_path
        ? `https://image.tmdb.org/t/p/w342${result.poster_path}`
        : null,
      tmdb_id: result.id,
    })
  }

  const handleNavigate = (result: TMDBSearchResult) => {
    const route = result.media_type === "tv" ? `/series/${result.id}` : `/films/${result.id}`
    router.push(route)
  }

  const showTrending = initialQuery.length === 0
  const showLoadingBar = isPending && inputValue.trim().length >= 2
  const searchHasNoResults =
    initialQuery.length >= 2 && !isPending && filteredResults.length === 0

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 20px 56px" }}>
      <style>{`
        @keyframes searchSlide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ marginBottom: "24px" }}>
        <input
          type="search"
          value={inputValue}
          placeholder="Search films and series..."
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            width: "100%",
            borderRadius: "14px",
            border: isFocused
              ? "1px solid rgba(255,255,255,0.35)"
              : "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.92)",
            fontSize: "15px",
            padding: "14px 16px",
            outline: "none",
            boxShadow: isFocused ? "0 0 0 3px rgba(255,255,255,0.06)" : "none",
            transition: "all 0.15s ease",
          }}
        />
      </div>

      {showLoadingBar ? (
        <div
          style={{
            height: "2px",
            borderRadius: "1px",
            background: "linear-gradient(90deg, transparent, #1D9E75, transparent)",
            backgroundSize: "200% 100%",
            animation: "searchSlide 1.2s ease-in-out infinite",
            marginBottom: "16px",
          }}
        />
      ) : null}

      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        {showTrending ? (
          <TrendingGrid
            items={trending}
            isLogged={isLogged}
            onLog={handleLog}
            onNavigate={handleNavigate}
          />
        ) : null}

        {!showTrending && filteredResults.length > 0 ? (
          <div>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.3)",
                marginBottom: "12px",
                letterSpacing: "0.05em",
              }}
            >
              Results for "{initialQuery}"
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {filteredResults.map((result) => (
                <SearchResultCard
                  key={`${result.media_type}-${result.id}`}
                  result={result}
                  variant="list"
                  isLogged={isLogged(result)}
                  onLog={() => handleLog(result)}
                  onNavigate={() => handleNavigate(result)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {searchHasNoResults ? (
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.3)",
              textAlign: "center",
              padding: "48px 0",
              fontStyle: "italic",
            }}
          >
            No results for "{initialQuery}"
          </p>
        ) : null}
      </div>
    </div>
  )
}
