// Direct port of the website's genre configuration — the SAME 12 genres,
// SAME TMDB genre-id mappings, SAME book-keyword lists as
// app/discover/genre/[genre]/page.tsx's GENRE_CONFIG (and the identical
// slug/label/emoji trio duplicated in components/discover/DiscoverClient.tsx's
// GENRE_CHIPS for the Discover entry-point row). Not reinterpreted — this
// must stay byte-for-byte equivalent to the website's config if it changes.
export interface GenreConfigEntry {
  slug:         string;
  label:        string;
  emoji:        string;
  movieId:      number;
  tvId:         number;
  bookKeywords: string[];
}

export const GENRE_CONFIG: GenreConfigEntry[] = [
  { slug: 'sci-fi',      label: 'Sci-Fi',      emoji: '🚀', movieId: 878,   tvId: 10765, bookKeywords: ['Science Fiction', 'Speculative Fiction'] },
  { slug: 'thriller',    label: 'Thriller',    emoji: '🔪', movieId: 53,    tvId: 53,    bookKeywords: ['Thriller', 'Psychological Thriller'] },
  { slug: 'comedy',      label: 'Comedy',      emoji: '😂', movieId: 35,    tvId: 35,    bookKeywords: ['Comedy', 'Humor'] },
  { slug: 'fantasy',     label: 'Fantasy',     emoji: '🔮', movieId: 14,    tvId: 10765, bookKeywords: ['Fantasy', 'Mythic Fiction'] },
  { slug: 'mystery',     label: 'Mystery',     emoji: '🕵️', movieId: 9648,  tvId: 9648,  bookKeywords: ['Mystery', 'Dark Academia', 'Psychological Thriller'] },
  { slug: 'drama',       label: 'Drama',       emoji: '🎭', movieId: 18,    tvId: 18,    bookKeywords: ['Literary Fiction', 'Contemporary Fiction'] },
  { slug: 'animation',   label: 'Animation',   emoji: '✏️', movieId: 16,    tvId: 16,    bookKeywords: [] },
  { slug: 'romance',     label: 'Romance',     emoji: '💕', movieId: 10749, tvId: 10749, bookKeywords: ['Romance', 'Contemporary Fiction'] },
  { slug: 'horror',      label: 'Horror',      emoji: '👻', movieId: 27,    tvId: 27,    bookKeywords: ['Horror'] },
  { slug: 'crime',       label: 'Crime',       emoji: '🚔', movieId: 80,    tvId: 80,    bookKeywords: ['Crime'] },
  { slug: 'documentary', label: 'Documentary', emoji: '🎥', movieId: 99,    tvId: 99,    bookKeywords: [] },
  { slug: 'adventure',   label: 'Adventure',   emoji: '🗺️', movieId: 12,    tvId: 10759, bookKeywords: ['Adventure'] },
];

const BY_SLUG = new Map(GENRE_CONFIG.map((g) => [g.slug, g]));

export function getGenreConfig(slug: string): GenreConfigEntry | undefined {
  return BY_SLUG.get(slug.toLowerCase());
}
