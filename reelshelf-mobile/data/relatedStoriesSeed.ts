// Cross-media "Related Stories" — deliberately EMPTY.
//
// There is no credible algorithmic way to match "books with similar themes"
// or "TV with similar tone" across media types using current data sources
// (TMDB only knows about films/TV, and only within its own medium). This
// must be editorially curated by a human — see PRODUCT_BIBLE.md's CURATE
// pillar ("Algorithms assist. Humans curate.") — not fabricated by code.
//
// The container (components/MediaCrossMediaRow.tsx) is fully built and reads
// from this map; it renders nothing until real entries are added here. This
// is flagged in RETURN as needing the user's editorial input, not more code.
import type { PosterRowItem } from '@/components/MediaPosterRow';

export interface CrossMediaRelatedEntry {
  /** Section title, e.g. "If You Loved This, Also Try…" — editor's call, not fixed copy. */
  label: string;
  items: PosterRowItem[];
}

/** Keyed by route id (e.g. "film-872585"). Empty until curated by hand. */
export const crossMediaRelated: Record<string, CrossMediaRelatedEntry> = {};
