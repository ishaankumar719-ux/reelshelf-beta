export interface LayerDef {
  key: keyof ReviewLayers
  label: string
}

export const FILM_LAYER_DEFS: LayerDef[] = [
  { key: "score_rating", label: "Score / Soundtrack" },
  { key: "cinematography_rating", label: "Cinematography" },
  { key: "writing_rating", label: "Writing" },
  { key: "performances_rating", label: "Performances" },
  { key: "direction_rating", label: "Direction" },
  { key: "rewatchability_rating", label: "Rewatchability" },
  { key: "emotional_impact_rating", label: "Emotional Impact" },
  { key: "entertainment_rating", label: "Entertainment" },
]

export const TV_LAYER_DEFS: LayerDef[] = [
  { key: "writing_rating", label: "Writing" },
  { key: "direction_rating", label: "Characters" },
  { key: "performances_rating", label: "Performances" },
  { key: "score_rating", label: "Season Quality" },
  { key: "cinematography_rating", label: "Finale" },
  { key: "rewatchability_rating", label: "Rewatchability" },
  { key: "emotional_impact_rating", label: "Emotional Impact" },
  { key: "entertainment_rating", label: "Entertainment" },
]

export const BOOK_LAYER_DEFS: LayerDef[] = [
  { key: "score_rating", label: "Writing Style" },
  { key: "cinematography_rating", label: "Characters" },
  { key: "writing_rating", label: "Worldbuilding" },
  { key: "performances_rating", label: "Pacing" },
  { key: "direction_rating", label: "Themes" },
  { key: "emotional_impact_rating", label: "Emotional Impact" },
  { key: "rewatchability_rating", label: "Readability" },
  { key: "entertainment_rating", label: "Ending" },
]

export function getLayerDefs(mediaType: "movie" | "tv" | "book"): LayerDef[] {
  if (mediaType === "tv") return TV_LAYER_DEFS
  if (mediaType === "book") return BOOK_LAYER_DEFS
  return FILM_LAYER_DEFS
}

// Aspect-level ratings, all nullable so they never break existing logs.
// Keys mirror DB column names (snake_case) for easy mapping.
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
  // Calculated from overallRating + review layers — see lib/scoring.ts
  reelshelf_score: number | null
}

export interface InitialEntryData {
  rating: number | null
  review: string
  watchedDate: string
  favourite: boolean
  rewatch: boolean
  containsSpoilers: boolean
  reviewLayers: ReviewLayers
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
