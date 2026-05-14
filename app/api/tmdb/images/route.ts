import { NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY
const TMDB_BASE = "https://api.themoviedb.org/3"
const IMG_BASE = "https://image.tmdb.org/t/p"

export type TMDBImageOption = {
  url: string
  width: number
  height: number
  type: "poster" | "backdrop"
}

export type TMDBImagesResponse = {
  images: TMDBImageOption[]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tmdbId = searchParams.get("tmdbId")
  const mediaType = searchParams.get("mediaType") // "movie" | "tv"

  if (!tmdbId || !mediaType || !["movie", "tv"].includes(mediaType)) {
    return NextResponse.json({ images: [] })
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ images: [] })
  }

  const endpoint = `${TMDB_BASE}/${mediaType}/${tmdbId}/images`

  try {
    const res = await fetch(`${endpoint}?api_key=${TMDB_API_KEY}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return NextResponse.json({ images: [] })

    const data = (await res.json()) as {
      posters?: Array<{ file_path: string; width: number; height: number }>
      backdrops?: Array<{ file_path: string; width: number; height: number }>
    }

    const posters: TMDBImageOption[] = (data.posters ?? [])
      .slice(0, 8)
      .map((p) => ({
        url: `${IMG_BASE}/w500${p.file_path}`,
        width: p.width,
        height: p.height,
        type: "poster" as const,
      }))

    const backdrops: TMDBImageOption[] = (data.backdrops ?? [])
      .slice(0, 6)
      .map((b) => ({
        url: `${IMG_BASE}/w780${b.file_path}`,
        width: b.width,
        height: b.height,
        type: "backdrop" as const,
      }))

    return NextResponse.json({ images: [...posters, ...backdrops] })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
