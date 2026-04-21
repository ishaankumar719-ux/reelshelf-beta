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
