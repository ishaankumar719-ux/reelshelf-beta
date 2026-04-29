import { NextResponse } from "next/server"

type TMDBRecommendation = {
  id: number
  title?: string
  release_date?: string
  poster_path?: string | null
  overview?: string
}

type TMDBRecommendationsResponse = {
  results?: TMDBRecommendation[]
}

type TMDBDetailResponse = {
  title?: string
  release_date?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const key = process.env.TMDB_API_KEY ?? process.env.NEXT_PUBLIC_TMDB_API_KEY

  if (!id || !key) {
    return NextResponse.json({ results: [] })
  }

  try {
    const [recsRes, detailRes] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/movie/${id}/recommendations` +
          `?api_key=${key}&language=en-US&page=1`,
        { next: { revalidate: 86400 } }
      ),
      fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${key}`, {
        next: { revalidate: 86400 },
      }),
    ])

    const [recs, detail] = (await Promise.all([
      recsRes.json(),
      detailRes.json(),
    ])) as [TMDBRecommendationsResponse, TMDBDetailResponse]

    const results = (recs.results ?? [])
      .filter((result) => result.poster_path)
      .slice(0, 8)

    return NextResponse.json({
      sourceTitle: detail.title ?? "",
      sourceYear: detail.release_date?.slice(0, 4) ?? "",
      results,
    })
  } catch (error) {
    console.error("[API/RECOMMENDATIONS]", error)
    return NextResponse.json({ results: [] })
  }
}
