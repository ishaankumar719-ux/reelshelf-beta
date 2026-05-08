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
  // Review layers — nullable for all media types (migration: 20260509_review_layers.sql)
  "score_rating",
  "cinematography_rating",
  "writing_rating",
  "performances_rating",
  "direction_rating",
  "rewatchability_rating",
  "emotional_impact_rating",
  "entertainment_rating",
  // Calculated score — see lib/scoring.ts (migration: 20260510_reelshelf_score.sql)
  "reelshelf_score",
  // Entry-level attachment (migration: 20260508_diary_entry_attachments.sql)
  "attachment_url",
  "attachment_type",
  // Cinema logging (migration: 20260508_watched_in_cinema.sql)
  "watched_in_cinema",
].join(", ")

export const PROFILE_SELECT =
  "id, email, username, display_name, avatar_url, bio, " +
  "favourite_film, favourite_series, favourite_book, " +
  "website_url, is_public, created_at, updated_at"
