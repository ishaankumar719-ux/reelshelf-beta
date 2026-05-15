// Shared types used by both the Letterboxd fetch API route and the import wizard client

export type RssWizardEntry = {
  sourceRow: number
  title: string
  year: number
  rating: number | null       // converted to 1–10 scale
  watchedDate: string         // YYYY-MM-DD
  review: string
  rewatch: boolean
  containsSpoilers: boolean
  favourite: boolean
  mediaType: "movie" | "tv"
  mediaId: string             // "tmdb-{id}" when TMDB ID present, else lbxd slug
  posterUrl: string | null    // letterboxd CDN poster extracted from RSS description
}

export type LetterboxdFetchResponse = {
  entries: RssWizardEntry[]
  displayName: string
  total: number
  limited: boolean            // true when RSS was capped (~50–100 entries)
  error?: string
}
