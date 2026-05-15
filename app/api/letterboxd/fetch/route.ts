import { NextResponse } from "next/server"
import type { RssWizardEntry, LetterboxdFetchResponse } from "@/lib/import/types"

export type { RssWizardEntry } from "@/lib/import/types"

// ─── XML helpers ──────────────────────────────────────────────────────────────

function xmlText(fragment: string, tag: string): string {
  const cdataRe = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`,
    "i"
  )
  const plainRe = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i")
  return (fragment.match(cdataRe)?.[1] ?? fragment.match(plainRe)?.[1] ?? "").trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
}

function extractReview(descHtml: string): string {
  let t = descHtml
  t = t.replace(/<p>\s*<img[^>]+>\s*<\/p>/gi, "")
  t = t.replace(/<p>\s*Watched on[^<]+\.?\s*<\/p>/gi, "")
  t = t.replace(/<p>\s*<em>This review may contain spoilers\.?<\/em>\s*<\/p>/gi, "")
  t = t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return decodeEntities(t)
}

function extractPoster(descHtml: string): string | null {
  return descHtml.match(/src="(https:\/\/a\.ltrbxd\.com\/[^"]+)"/)?.[1] ?? null
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/, "") || "film"
}

// ─── Item parser ──────────────────────────────────────────────────────────────

function parseItem(item: string, index: number): RssWizardEntry | null {
  const title = decodeEntities(xmlText(item, "letterboxd:filmTitle"))
  if (!title) return null

  const year = parseInt(xmlText(item, "letterboxd:filmYear"), 10)
  if (!year) return null

  const ratingRaw = parseFloat(xmlText(item, "letterboxd:memberRating"))
  const rating = Number.isNaN(ratingRaw) ? null : Math.round(ratingRaw * 2 * 10) / 10

  const watchedDate =
    xmlText(item, "letterboxd:watchedDate") || new Date().toISOString().slice(0, 10)

  const rewatch          = xmlText(item, "letterboxd:rewatch").toLowerCase() === "yes"
  const favourite        = xmlText(item, "letterboxd:memberLike").toLowerCase() === "yes"
  const containsSpoilers = xmlText(item, "letterboxd:spoilers").toLowerCase() === "yes"

  const movieId = xmlText(item, "tmdb:movieId")
  const tvId    = xmlText(item, "tmdb:tvId")

  const mediaType: "movie" | "tv" = tvId && !movieId ? "tv" : "movie"
  const tmdbId = movieId || tvId
  const mediaId = tmdbId
    ? `tmdb-${tmdbId}`
    : `lbxd-${slugify(title)}-${year}`

  // Description CDATA (may contain review + poster img)
  const descHtml =
    item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1] ?? ""

  return {
    sourceRow:  index + 1,
    title,
    year,
    rating,
    watchedDate,
    review:   extractReview(descHtml),
    rewatch,
    containsSpoilers,
    favourite,
    mediaType,
    mediaId,
    posterUrl: extractPoster(descHtml),
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse<LetterboxdFetchResponse>> {
  const username = new URL(request.url).searchParams.get("username")?.trim()

  if (!username) {
    return NextResponse.json({ entries: [], displayName: "", total: 0, limited: false, error: "username required" }, { status: 400 })
  }

  // Block SSRF — allow only typical Letterboxd username chars
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(username)) {
    return NextResponse.json({ entries: [], displayName: "", total: 0, limited: false, error: "Invalid username." }, { status: 400 })
  }

  const rssUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`

  let xml: string
  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "ReelShelf/1.0" },
      signal: AbortSignal.timeout(12_000),
    })

    if (res.status === 404) {
      return NextResponse.json({ entries: [], displayName: "", total: 0, limited: false, error: "Profile not found. Check the username and try again." }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ entries: [], displayName: "", total: 0, limited: false, error: "Letterboxd is unreachable right now. Try again in a moment." }, { status: 502 })
    }

    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("rss") && !ct.includes("xml") && !ct.includes("text")) {
      return NextResponse.json({ entries: [], displayName: "", total: 0, limited: false, error: "Profile may be private or does not exist." }, { status: 422 })
    }

    xml = await res.text()
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError"
    return NextResponse.json(
      { entries: [], displayName: "", total: 0, limited: false, error: timedOut ? "Request timed out. Try again." : "Could not reach Letterboxd." },
      { status: 502 }
    )
  }

  const rawItems = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []

  if (rawItems.length === 0) {
    const profileExists = xml.includes("<channel>")
    return NextResponse.json(
      { entries: [], displayName: "", total: 0, limited: false, error: profileExists ? "No public diary entries found. This profile may be private or empty." : "Could not parse Letterboxd response." },
      { status: 422 }
    )
  }

  const entries: RssWizardEntry[] = []
  for (let i = 0; i < rawItems.length; i++) {
    const entry = parseItem(rawItems[i]!, i)
    if (entry) entries.push(entry)
  }

  if (entries.length === 0) {
    return NextResponse.json({ entries: [], displayName: "", total: 0, limited: false, error: "No film diary entries found." }, { status: 422 })
  }

  const channelTitle = xml.match(/<channel>[^<]*<title>([^<]+)<\/title>/)?.[1]
  const displayName  = channelTitle?.replace("Letterboxd - ", "").trim() ?? username

  return NextResponse.json({
    entries,
    displayName,
    total:   entries.length,
    limited: entries.length >= 50,
  })
}
