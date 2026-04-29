export interface SourceFilm {
  tmdbId: number
  title: string
  rating: number
}

export function pickSourceFilm(
  entries: Array<{
    media_id: string
    title: string
    rating: unknown
    watched_date: string
  }>
): SourceFilm | null {
  const tmdbEntries = entries
    .filter((entry) => entry.media_id?.startsWith("tmdb-"))
    .map((entry) => {
      const numericId = parseInt(entry.media_id.replace("tmdb-", ""), 10)
      const rating = parseFloat(String(entry.rating))

      return {
        ...entry,
        tmdbId: numericId,
        ratingNum: Number.isNaN(rating) ? 0 : rating,
      }
    })
    .filter((entry) => !Number.isNaN(entry.tmdbId) && entry.tmdbId > 0)

  if (tmdbEntries.length === 0) return null

  tmdbEntries.sort((left, right) => {
    if (right.ratingNum !== left.ratingNum) return right.ratingNum - left.ratingNum
    return new Date(right.watched_date).getTime() - new Date(left.watched_date).getTime()
  })

  const top = tmdbEntries[0]
  return { tmdbId: top.tmdbId, title: top.title, rating: top.ratingNum }
}
