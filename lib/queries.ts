export const DIARY_SELECT = [
  "id",
  "user_id",
  "media_id",
  "media_type",
  "title",
  "poster",
  "year",
  "creator",
  "genres",
  "runtime",
  "vote_average",
  "rating",
  "review",
  "watched_date",
  "favourite",
  "rewatch",
  "contains_spoilers",
  "review_scope",
  "show_id",
  "season_number",
  "episode_number",
  "saved_at",
  "created_at",
  "updated_at",
  // Review layers — nullable, movie-only in the UI (migration: 20260509_review_layers.sql)
  "score_rating",
  "cinematography_rating",
  "writing_rating",
  "performances_rating",
  "direction_rating",
  "rewatchability_rating",
  "emotional_impact_rating",
  "entertainment_rating",
].join(", ")

export const PROFILE_SELECT =
  "id, email, username, display_name, avatar_url, bio, " +
  "favourite_film, favourite_series, favourite_book, " +
  "website_url, is_public, created_at, updated_at"
