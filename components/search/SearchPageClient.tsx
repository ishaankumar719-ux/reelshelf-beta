"use client"

import { useRouter } from "next/navigation"
import { useDiaryLog } from "@/hooks/useDiaryLog"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
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

type PersonResult = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
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
  const [people, setPeople] = useState<PersonResult[]>([])

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
    const q = initialQuery.trim()
    if (q.length < 2) { setPeople([]); return }

    const supabase = createSupabaseClient()
    if (!supabase) return

    let cancelled = false
    void supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .not("username", "is", null)
      .limit(6)
      .then(({ data }) => {
        if (!cancelled) setPeople((data ?? []) as PersonResult[])
      })

    return () => { cancelled = true }
  }, [initialQuery])

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
    initialQuery.length >= 2 && !isPending && filteredResults.length === 0 && people.length === 0

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

        {!showTrending && people.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
              People
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {people.map((person) => {
                const displayName = person.display_name || person.username || "Unknown"
                const href = person.username ? `/u/${encodeURIComponent(person.username)}` : null
                const initial = displayName.charAt(0).toUpperCase()
                return (
                  <Link
                    key={person.id}
                    href={href ?? "#"}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, textDecoration: "none", background: "transparent", transition: "background 0.12s ease" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg, #534AB7, #1D9E75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.92)", border: "0.5px solid rgba(255,255,255,0.1)" }}>
                      {person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={person.avatar_url} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayName}
                      </p>
                      {person.username ? (
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                          @{person.username}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
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
