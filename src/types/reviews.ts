export type ReviewScope = "show" | "season" | "episode"

export interface Review {
  id: string
  user_id: string
  media_id: number
  media_type: "film" | "series"
  review_scope: ReviewScope
  season_number: number | null
  episode_number: number | null
  rating: number | null
  body: string | null
  contains_spoilers: boolean
  watched_on: string | null
  created_at: string
  updated_at: string
}

export interface UpsertReviewInput {
  media_id: number
  media_type: "film" | "series"
  review_scope: ReviewScope
  title?: string | null
  year?: number | null
  poster_path?: string | null
  creator?: string | null
  season_number?: number | null
  episode_number?: number | null
  rating?: number | null
  body?: string | null
  contains_spoilers?: boolean
  watched_on?: string | null
}
