// MOCK DATA — temporary for Phase 2 visual design only. NOT real content. Replace in Phase 3 backend integration.

export type MediaType = 'film' | 'tv' | 'book';

/** Shape matches the card data Phase 3 will fetch from TMDB / Google Books / Supabase. */
export interface MockCardItem {
  id:        string;
  title:     string;
  year:      number;
  mediaType: MediaType;
  /** Integer 1–99 — used to derive a deterministic placeholder background tint. No network request. */
  colorSeed: number;
}

export interface MockContinueItem extends MockCardItem {
  /** Viewing/reading progress, 0–1. */
  progress: number;
  subtitle: string;
}

// ── Featured (3 items — one per media type) ───────────────────────────────────
export const featuredCards: MockCardItem[] = [
  { id: 'f1', title: 'Untitled Drama',       year: 2024, mediaType: 'film', colorSeed: 11 },
  { id: 'f2', title: 'Sample Series One',    year: 2023, mediaType: 'tv',   colorSeed: 22 },
  { id: 'f3', title: 'Working Title: Novel', year: 2022, mediaType: 'book', colorSeed: 33 },
];

// ── Trending Today (7 items) ──────────────────────────────────────────────────
export const trendingToday: MockCardItem[] = [
  { id: 't1', title: 'Draft Feature One',    year: 2024, mediaType: 'film', colorSeed: 41 },
  { id: 't2', title: 'Placeholder Series A', year: 2024, mediaType: 'tv',   colorSeed: 42 },
  { id: 't3', title: 'Untitled Thriller',    year: 2023, mediaType: 'film', colorSeed: 43 },
  { id: 't4', title: 'Working Title: Drama', year: 2024, mediaType: 'tv',   colorSeed: 44 },
  { id: 't5', title: 'Sample Story Two',     year: 2023, mediaType: 'book', colorSeed: 45 },
  { id: 't6', title: 'Draft Novel Two',      year: 2022, mediaType: 'book', colorSeed: 46 },
  { id: 't7', title: 'Untitled Comedy',      year: 2024, mediaType: 'film', colorSeed: 47 },
];

// ── Continue Watching (1 item) ────────────────────────────────────────────────
export const continueWatching: MockContinueItem = {
  id:        'cw1',
  title:     'Working Title: Thriller',
  subtitle:  'Episode 4 · Season 2',
  year:      2024,
  mediaType: 'tv',
  colorSeed: 77,
  progress:  0.62,
};

// ── Because You Loved (7 items) ───────────────────────────────────────────────
export const becauseYouLoved: MockCardItem[] = [
  { id: 'b1', title: 'Untitled Sci-Fi',       year: 2024, mediaType: 'film', colorSeed: 51 },
  { id: 'b2', title: 'Placeholder Drama B',   year: 2023, mediaType: 'tv',   colorSeed: 52 },
  { id: 'b3', title: 'Sample Story Three',    year: 2022, mediaType: 'book', colorSeed: 53 },
  { id: 'b4', title: 'Draft Feature Two',     year: 2024, mediaType: 'film', colorSeed: 54 },
  { id: 'b5', title: 'Working Title: Comedy', year: 2023, mediaType: 'tv',   colorSeed: 55 },
  { id: 'b6', title: 'Draft Novel Three',     year: 2022, mediaType: 'book', colorSeed: 56 },
  { id: 'b7', title: 'Placeholder Action C',  year: 2024, mediaType: 'film', colorSeed: 57 },
];
