export const dynamic = "force-dynamic"

import { localBooks } from "@/lib/localBooks"
import { resolveBooksWithCovers, resolveBookCover } from "@/lib/bookCovers"
import { createAdminClient } from "@/lib/supabase/admin"
import type { DiscoverItem } from "@/lib/discoverTypes"
import BooksClient, { type HeroBook } from "./BooksClient"

export const metadata = {
  title: "Books – ReelShelf",
  description: "Trending reads, modern classics, and hidden literary gems — all in one place.",
}

// ─── Adult content exclusion (same logic as Movies, TV, Discover) ─────────────

const ADULT_TITLE_TOKENS = new Set([
  "nude", "naked", "porn", "porno", "pornographic",
  "xxx", "erotic", "erotica", "hentai", "softcore", "nsfw",
])

function isAdultContent(r: { title?: string; name?: string; adult?: boolean }): boolean {
  if (r.adult === true) return true
  const title = (r.title ?? r.name ?? "").toLowerCase()
  const tokens = title.split(/[\s\-–—_:,!?.()[\]\/]+/).filter(Boolean)
  return tokens.some((t) => ADULT_TITLE_TOKENS.has(t))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BooksPage() {
  // Resolve all book covers in parallel with the Supabase trending query
  const adminClient = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [booksWithCovers, trendingRaw] = await Promise.all([
    resolveBooksWithCovers(localBooks),
    adminClient
      ? adminClient
          .from("diary_entries")
          .select("media_id, title, poster, year")
          .eq("media_type", "book")
          .gte("created_at", sevenDaysAgo)
          .then(({ data }) => data ?? [])
      : Promise.resolve([] as Array<{ media_id: string; title: string; poster: string | null; year: string }>),
  ])

  // Build cover map from resolved local books for diary poster fallback
  const coverMap = new Map<string, string | null>(
    booksWithCovers.map((b) => [b.id, b.coverUrl])
  )

  // ── Hero book ──────────────────────────────────────────────────────────────
  // Use the first resolved book that has a cover, else first book
  const heroSource =
    booksWithCovers.find((b) => !!b.coverUrl) ?? booksWithCovers[0] ?? null
  const heroBook: HeroBook | null = heroSource
    ? {
        title: heroSource.title,
        author: heroSource.author,
        year: heroSource.year,
        cover: heroSource.coverUrl,
        href: `/books/${heroSource.id}`,
      }
    : null

  // ── Trending Books (from diary_entries, last 30 days, admin client) ─────────
  // Aggregate by media_id, sort by log count, resolve covers for any missing poster
  const trendingCountMap = new Map<
    string,
    { title: string; poster: string | null; year: string; count: number }
  >()
  for (const row of trendingRaw) {
    if (!row.media_id) continue
    const existing = trendingCountMap.get(row.media_id)
    if (existing) {
      existing.count++
    } else {
      trendingCountMap.set(row.media_id, {
        title: row.title ?? "",
        poster: row.poster ?? null,
        year: row.year ?? "",
        count: 1,
      })
    }
  }

  const trendingBooks: DiscoverItem[] = (
    await Promise.all(
      Array.from(trendingCountMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 12)
        .filter(([, v]) => !isAdultContent({ title: v.title }))
        .map(async ([media_id, { title, poster, year }]) => {
          // Use diary poster if set, otherwise fall back to localBook cover
          let coverUrl = poster || coverMap.get(media_id) || null
          if (!coverUrl) {
            // Attempt OpenLibrary lookup for diary books not in local map
            const localBook = localBooks.find((b) => b.id === media_id)
            if (localBook) {
              coverUrl = await resolveBookCover(localBook)
            }
          }
          return {
            id: media_id,
            mediaType: "book" as const,
            title,
            year,
            poster: coverUrl,
            href: `/books/${media_id}`,
            subtitle: undefined,
          } satisfies DiscoverItem
        })
    )
  )

  // ── Modern Classics (published before 2000) ────────────────────────────────
  const modernClassics: DiscoverItem[] = booksWithCovers
    .filter((b) => {
      const yr = parseInt(b.year)
      return !isNaN(yr) && yr < 2000 && !isAdultContent({ title: b.title })
    })
    .slice(0, 12)
    .map((b) => ({
      id: b.id,
      mediaType: "book" as const,
      title: b.title,
      year: b.year,
      poster: b.coverUrl,
      href: `/books/${b.id}`,
      subtitle: b.author,
      badge: "Classic 📖",
    }))

  // ── Hidden Gems (all curated local books, adult filter applied) ────────────
  const hiddenGems: DiscoverItem[] = booksWithCovers
    .filter((b) => !isAdultContent({ title: b.title }))
    .slice(0, 12)
    .map((b) => ({
      id: b.id,
      mediaType: "book" as const,
      title: b.title,
      year: b.year,
      poster: b.coverUrl,
      href: `/books/${b.id}`,
      subtitle: b.author,
      badge: "Hidden Gem 💎",
    }))

  return (
    <BooksClient
      heroBook={heroBook}
      trendingBooks={trendingBooks}
      modernClassics={modernClassics}
      hiddenGems={hiddenGems}
    />
  )
}
