export interface CollectionDef {
  slug: string
  name: string
  description: string
  tmdbPath?: string
  tmdbMediaType?: "movie" | "tv"
  localFilter?: "classic-literature" | "books-to-screen"
}

export const COLLECTION_DEFS: CollectionDef[] = [
  {
    slug: "best-of-a24",
    name: "Best of A24",
    description: "Indie cinema at its most daring — from Hereditary to Everything Everywhere.",
    tmdbPath: "/discover/movie?with_companies=41077&vote_average.gte=7.0&vote_count.gte=100&sort_by=vote_average.desc&include_adult=false",
    tmdbMediaType: "movie",
  },
  {
    slug: "under-90-min",
    name: "Under 90 Minutes",
    description: "Great films that don't overstay their welcome.",
    tmdbPath: "/discover/movie?with_runtime.lte=90&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false",
    tmdbMediaType: "movie",
  },
  {
    slug: "mind-benders",
    name: "Mind-Bending Stories",
    description: "Films that warp reality and linger long after the credits.",
    tmdbPath: "/discover/movie?with_genres=878%2C53&vote_average.gte=7.5&vote_count.gte=200&sort_by=vote_average.desc&include_adult=false",
    tmdbMediaType: "movie",
  },
  {
    slug: "true-crime",
    name: "True Crime Essentials",
    description: "The best crime dramas — investigations that won't let you go.",
    tmdbPath: "/discover/movie?with_genres=80&vote_average.gte=7.5&vote_count.gte=300&sort_by=popularity.desc&include_adult=false",
    tmdbMediaType: "movie",
  },
  {
    slug: "space-adventures",
    name: "Space Adventures",
    description: "Odysseys beyond the known — wormholes, alien worlds, and the deep unknown.",
    tmdbPath: "/discover/movie?with_genres=878%2C12&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false",
    tmdbMediaType: "movie",
  },
  {
    slug: "one-season-wonders",
    name: "One Season Masterpieces",
    description: "Television that perfected itself and never needed more.",
    tmdbPath: "/discover/tv?vote_average.gte=8.0&vote_count.gte=300&sort_by=vote_average.desc&include_adult=false",
    tmdbMediaType: "tv",
  },
  {
    slug: "coming-of-age",
    name: "Coming of Age",
    description: "Tender, formative stories about growing up and finding yourself.",
    tmdbPath: "/discover/movie?with_keywords=10683&vote_average.gte=7.0&vote_count.gte=100&sort_by=vote_average.desc&include_adult=false",
    tmdbMediaType: "movie",
  },
  {
    slug: "classic-literature",
    name: "Classic Literature",
    description: "Timeless stories that define the literary canon.",
    localFilter: "classic-literature",
  },
  {
    slug: "books-to-screen",
    name: "Books on Screen",
    description: "Stories that leapt from page to cinema.",
    localFilter: "books-to-screen",
  },
]
