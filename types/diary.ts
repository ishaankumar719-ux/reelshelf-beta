// Aspect-level ratings for film entries, all nullable so they never break
// existing logs.  Keys mirror the DB column names (snake_case) for easy mapping.
export interface ReviewLayers {
  score_rating: number | null
  cinematography_rating: number | null
  writing_rating: number | null
  performances_rating: number | null
  direction_rating: number | null
  rewatchability_rating: number | null
  emotional_impact_rating: number | null
  entertainment_rating: number | null
}

export function hasReviewLayers(layers: ReviewLayers | null | undefined): boolean {
  if (!layers) return false
  return (
    layers.score_rating !== null ||
    layers.cinematography_rating !== null ||
    layers.writing_rating !== null ||
    layers.performances_rating !== null ||
    layers.direction_rating !== null ||
    layers.rewatchability_rating !== null ||
    layers.emotional_impact_rating !== null ||
    layers.entertainment_rating !== null
  )
}

export const EMPTY_REVIEW_LAYERS: ReviewLayers = {
  score_rating: null,
  cinematography_rating: null,
  writing_rating: null,
  performances_rating: null,
  direction_rating: null,
  rewatchability_rating: null,
  emotional_impact_rating: null,
  entertainment_rating: null,
}

export interface DiaryEntry {
  id: string
  user_id: string
  media_id: string
  media_type: "movie" | "tv" | "book"
  title: string
  poster: string | null
  year: number
  creator: string | null
  genres: string[]
  runtime: number | null
  vote_average: number | null
  rating: number | null
  review: string
  watched_date: string
  favourite: boolean
  rewatch: boolean
  contains_spoilers: boolean
  review_scope: string
  show_id: string
  season_number: number | null
  episode_number: number | null
  saved_at: string
  created_at: string
  updated_at: string
  // Review layers — nullable, movie-only in UI
  score_rating: number | null
  cinematography_rating: number | null
  writing_rating: number | null
  performances_rating: number | null
  direction_rating: number | null
  rewatchability_rating: number | null
  emotional_impact_rating: number | null
  entertainment_rating: number | null
}

export interface LogMediaInput {
  title: string
  media_type: "movie" | "tv" | "book"
  year: number
  poster: string | null
  creator?: string | null
  genres?: string[]
  runtime?: number | null
  vote_average?: number | null
  tmdb_id?: number | null
  media_id?: string
}
