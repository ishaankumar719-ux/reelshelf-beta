// One stable diary id per franchise book.
//
// Diary, shelf and review rows for a book are keyed by the bare id after the
// "book-" route prefix (see toDbMediaId). Search returns Google Books volume
// ids, and every edition, printing and box listing of a book has its own
// volume id, in an order that changes from query to query. Keying franchise
// books by volume id would scatter one book's ratings across editions.
//
// So a catalogued franchise book always uses its Open Library work id from
// data/franchiseCommunities.ts (the same id the website stores). The hub uses
// it directly with no lookup. A Search result is mapped onto it only when the
// edition is verified: the same title and Suzanne Collins as an author, and
// not a study guide or summary. Anything else keeps its own volume id.
//
// No network access and no React Native imports, so the id never depends on
// a lookup succeeding, and scripts/test-book-identity.mjs can run it in Node.
import { hungerGamesCommunity, type FranchiseTitle } from '../data/franchiseCommunities';

const ROUTE_PREFIX = 'book-';

/** Catalogue books, keyed by Open Library work id. */
const catalogue = new Map<string, FranchiseTitle>(
  hungerGamesCommunity.titles.filter((t) => t.type === 'book').map((t) => [t.id, t]),
);

/** Retired Open Library work ids that Open Library now redirects to a
 *  catalogue work. Rows saved under one of these (a website list item and a
 *  Mount Rushmore pick use OL42360848W) open on the canonical book, so they
 *  share its diary. Checked against openlibrary.org/works/<id>.json. */
const WORK_ALIASES: Record<string, string> = {
  OL42360848W: 'OL43426400W', // Sunrise on the Reaping (merged duplicate)
};

const FRANCHISE_AUTHOR = 'suzanne collins';

/** Titles and subtitles that mark a book about the book, not the book. */
const NOT_THE_BOOK = /\b(study guide|summary|analysis|companion|workbook|sparknotes|cliffsnotes|quiz|trivia|unofficial|guide to|lesson plan|activities|coloring|colouring|box(ed)? set|collection|trilogy|series set)\b/i;

const normalise = (s: string) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

/** "Catching Fire (Hunger Games, Book Two)" → "Catching Fire". Only drops a
 *  trailing bracket that names the series and a book number, nothing else. */
function stripSeriesMarker(title: string) {
  return title.replace(/\s*[([]\s*(the )?hunger games[^)\]]*\b(book|#|vol)[^)\]]*[)\]]\s*$/i, '');
}

const catalogueByTitle = new Map<string, string>(
  [...catalogue.values()].map((t) => [normalise(t.title), t.id]),
);

export interface BookEditionHint {
  title:     string;
  subtitle?: string | null;
  authors?:  readonly string[] | null;
}

/** Open Library work id of the catalogue book this edition verifiably is, or
 *  null. Requires an exact title match and Suzanne Collins as an author. */
export function matchFranchiseEdition(edition: BookEditionHint): string | null {
  const authors = (edition.authors ?? []).map(normalise);
  if (!authors.some((a) => a === FRANCHISE_AUTHOR)) return null;
  if (NOT_THE_BOOK.test(edition.title) || (edition.subtitle && NOT_THE_BOOK.test(edition.subtitle))) return null;
  return catalogueByTitle.get(normalise(stripSeriesMarker(edition.title))) ?? null;
}

/** The route id a book should be opened and logged under.
 *  - book-<catalogue work id>   → unchanged
 *  - book-<retired work id>     → book-<catalogue work id>
 *  - any other id + a verified edition hint → book-<catalogue work id>
 *  - everything else (films, TV, unverified editions) → unchanged */
export function canonicalBookRouteId(routeId: string, edition?: BookEditionHint): string {
  if (!routeId.startsWith(ROUTE_PREFIX)) return routeId;
  const bare = routeId.slice(ROUTE_PREFIX.length);
  if (catalogue.has(bare)) return routeId;
  const alias = WORK_ALIASES[bare];
  if (alias) return ROUTE_PREFIX + alias;
  const matched = edition ? matchFranchiseEdition(edition) : null;
  return matched ? ROUTE_PREFIX + matched : routeId;
}

/** Catalogue title for a canonical or alias route id. */
export function getFranchiseBookForRouteId(routeId: string): FranchiseTitle | undefined {
  const canonical = canonicalBookRouteId(routeId);
  return canonical.startsWith(ROUTE_PREFIX) ? catalogue.get(canonical.slice(ROUTE_PREFIX.length)) : undefined;
}
