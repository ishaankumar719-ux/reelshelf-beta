import { NextResponse, type NextRequest } from "next/server"

// "Find on ReelShelf" for a book shared from the iPhone app by a Google Books
// id, which the website has no page for. Looks the title up on Open Library
// (where the website's book pages and Diary ids come from) and opens that
// book's page. Only an exact title match counts, preferring the work with the
// most editions; with no confident match it falls back to Search.
//   GET /books/find?title=<title>

interface OpenLibraryDoc {
  key?: string
  title?: string
  edition_count?: number
  first_publish_year?: number
}

const normalise = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\(.*?\)/g, " ") // "(Movie Tie-In)", "(Deluxe Edition)"
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "")

export async function GET(request: NextRequest) {
  const title = (request.nextUrl.searchParams.get("title") ?? "").trim().slice(0, 300)
  const fallback = new URL(`/search?q=${encodeURIComponent(title)}`, request.url)
  if (!title) return NextResponse.redirect(new URL("/search", request.url))

  try {
    const res = await fetch(
      // Searched without edition wording in brackets, which Open Library
      // titles don't carry: "Project Hail Mary (Movie Tie-In)".
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title.replace(/\(.*?\)/g, " ").trim() || title)}` +
        `&fields=key,title,edition_count,first_publish_year&limit=10`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) },
    )
    if (!res.ok) return NextResponse.redirect(fallback)
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] }
    const wanted = normalise(title)
    const match = (data.docs ?? [])
      .filter((doc) => doc.key?.startsWith("/works/") && doc.title && normalise(doc.title) === wanted)
      .sort((a, b) => (b.edition_count ?? 0) - (a.edition_count ?? 0))[0]
    if (!match?.key) return NextResponse.redirect(fallback)
    return NextResponse.redirect(new URL(`/books/${match.key.slice("/works/".length)}`, request.url))
  } catch {
    return NextResponse.redirect(fallback)
  }
}
