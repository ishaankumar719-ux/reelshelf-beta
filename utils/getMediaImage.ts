// Priority order:
// Film / TV  → TMDB poster via existing /api/search proxy (no key exposed to client)
//              returns poster_path + href for navigation
// Book       → Open Library search (public, no CORS issues)
//              https://openlibrary.org/search.json?title=...&author=...
//              cover: https://covers.openlibrary.org/b/id/{cover_i}-L.jpg
// Final fallback: null → branded ReelShelf placeholder in the component

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w300";

export type MediaImageResult = {
  posterUrl: string | null;
  href: string | null;
};

export type MediaImageRequest = {
  title: string;
  year: number;
  type: "film" | "tv" | "book";
  author?: string;
};

export async function getMediaImage({
  title,
  year,
  type,
  author,
}: MediaImageRequest): Promise<MediaImageResult> {
  try {
    if (type === "book") {
      const posterUrl = await fetchBookCover(title, author ?? "");
      return { posterUrl, href: null };
    }
    return await fetchTMDBResult(title, year, type);
  } catch {
    return { posterUrl: null, href: null };
  }
}

async function fetchTMDBResult(
  title: string,
  year: number,
  type: "film" | "tv"
): Promise<MediaImageResult> {
  const searchType = type === "film" ? "film" : "series";
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(title)}&type=${searchType}&limit=5`,
    { cache: "no-store" }
  );
  if (!res.ok) return { posterUrl: null, href: null };

  const data = (await res.json()) as {
    films?: Array<{
      title: string;
      year: string | null;
      poster_path: string | null;
      href?: string;
    }>;
    series?: Array<{
      title: string;
      year: string | null;
      poster_path: string | null;
      href?: string;
    }>;
  };

  const results = type === "film" ? (data.films ?? []) : (data.series ?? []);
  const lower = title.toLowerCase();
  const yearStr = String(year);

  const match =
    results.find(
      (r) => r.title.toLowerCase() === lower && r.year === yearStr
    ) ??
    results.find((r) => r.title.toLowerCase() === lower) ??
    results[0];

  if (!match) return { posterUrl: null, href: null };

  let posterUrl: string | null = null;
  if (match.poster_path) {
    const path = match.poster_path;
    posterUrl = path.startsWith("http")
      ? path
      : `${TMDB_IMG_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  return { posterUrl, href: match.href ?? null };
}

async function fetchBookCover(
  title: string,
  author: string
): Promise<string | null> {
  const params = new URLSearchParams({
    title,
    author,
    limit: "5",
    fields: "cover_i,title,author_name",
  });

  const res = await fetch(
    `https://openlibrary.org/search.json?${params.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    docs?: Array<{
      cover_i?: number;
      title?: string;
      author_name?: string[];
    }>;
  };

  const docs = data.docs ?? [];
  const lower = title.toLowerCase();
  const authorLower = author.toLowerCase();

  const match =
    docs.find(
      (d) =>
        d.cover_i &&
        d.title?.toLowerCase() === lower &&
        d.author_name?.some((n) => n.toLowerCase() === authorLower)
    ) ??
    docs.find((d) => d.cover_i && d.title?.toLowerCase().includes(lower)) ??
    docs.find((d) => d.cover_i);

  if (!match?.cover_i) return null;

  // Use -L.jpg (large) and ensure https
  return `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg`;
}
