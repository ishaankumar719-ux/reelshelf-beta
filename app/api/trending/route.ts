import { NextResponse } from "next/server";

const TMDB_API_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY;

export async function GET() {
  if (!TMDB_API_KEY) {
    return NextResponse.json({ results: [] });
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const payload = (await response.json()) as { results?: unknown[] };
    return NextResponse.json({ results: payload.results ?? [] });
  } catch (error) {
    console.error("[PICK CARD] trending fetch error:", error);
    return NextResponse.json({ results: [] });
  }
}
