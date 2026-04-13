export interface Profile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  favourite_film: string | null
  favourite_series: string | null
  favourite_book: string | null
  website_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ProfileData {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_public: boolean
  created_at: string
  stats: {
    films_watched: number
    series_watched: number
    books_read: number
    reviews_written: number
    following_count: number
    followers_count: number
  }
  mount_rushmore: MountRushmoreSlot[]
  recent_activity: ActivityItem[]
  favourite_shelf: MediaShelfItem[]
}

export interface MountRushmoreSlot {
  position: 1 | 2 | 3 | 4
  media_id: number | null
  media_type: "film" | "series" | null
  title: string | null
  year: string | null
  poster_path: string | null
}

export interface ActivityItem {
  id: string
  media_id: number
  media_type: "film" | "series" | "book"
  title: string
  poster_path: string | null
  action: "watched" | "reviewed" | "shelved" | "reading"
  rating: number | null
  logged_at: string
}

export interface MediaShelfItem {
  media_id: number
  media_type: "film" | "series" | "book"
  title: string
  poster_path: string | null
}

export interface PublicProfileStats {
  films: number
  series: number
  reviews: number
  avg_rating: number | null
  followers: number
  following: number
}

export interface PublicProfileActivityItem {
  id: string
  title: string
  media_type: "movie" | "tv"
  year: number | null
  poster: string | null
  rating: number | null
  watched_date: string | null
  review_scope: "show" | "season" | "episode" | null
}

export interface PublicProfileTopRatedItem {
  title: string
  poster: string | null
  rating: number | null
}

export interface PublicProfileShowcaseData {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  website_url: string | null
  created_at: string
  favourite_film: string | null
  favourite_series: string | null
  favourite_book: string | null
  mount_rushmore: MountRushmoreSlot[]
  recent_activity: PublicProfileActivityItem[]
  stats: PublicProfileStats
  highest_rated: PublicProfileTopRatedItem[]
}
