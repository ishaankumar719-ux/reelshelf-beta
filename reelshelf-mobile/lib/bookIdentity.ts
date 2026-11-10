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
// edition is verified: Suzanne Collins as an author, and a title that is the
// book's own title plus nothing but edition wording ("(eBook)", "Movie Tie-In
// Edition"), not a guide, summary, box set or teaching unit. Anything else
// keeps its own volume id.
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
  // Built-in search entries that TestFlight build 23 opened as
  // "book-local-<slug>" (no rows were ever saved under them; checked
  // 2026-11-10), so any link from that build lands on the same diary.
  'local-the-hunger-games':                   'OL5735363W',
  'local-catching-fire':                      'OL5735360W',
  'local-mockingjay':                         'OL14908941W',
  'local-the-ballad-of-songbirds-and-snakes': 'OL20716197W',
};

const FRANCHISE_AUTHOR = 'suzanne collins';

/** Titles and subtitles that mark a book about the book, not the book. */
const NOT_THE_BOOK = /\b(study guide|summary|analysis|companion|workbook|sparknotes|cliffsnotes|quiz|trivia|unofficial|guide to|lesson plan|teaching|teacher|novel units|journal|activities|coloring|colouring|box(ed)? set|collection|trilogy|series set)\b/i;

/** Lowercase, accents and punctuation dropped, no leading "the":
 *  "The Ballad of Songbirds & Snakes" → "ballad of songbirds and snakes". */
const normalise = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');

/** Edition wording that can follow the book's title (in brackets, after a
 *  colon, or straight after it) without making it a different book:
 *  "(a Hunger Games Novel): Movie Tie-In Edition", "(eBook)",
 *  "(Hunger Games, Book Three)", "(Large Print)". Matched against the
 *  normalised remainder, so it must be made of these phrases and nothing else. */
const EDITION_WORDS = [
  'a hunger games novel', 'hunger games novel', 'the hunger games', 'hunger games prequel', 'hunger games',
  'book (?:one|two|three|four|five|[1-5])', 'prequel', 'novel',
  'e ?book', 'large print', 'hardcover', 'paperback', 'audiobook',
  'movie tie in edition', 'movie tie in', 'tie in edition', 'tie in',
  '(?:deluxe|special|collector s|collectors|anniversary|illustrated|international|uk|us|canadian|film|movie) edition',
  'edition', 'svensk utgava',
];
const ONLY_EDITION_WORDS = new RegExp(`^(?:\\s*(?:${EDITION_WORDS.join('|')})\\b)*\\s*$`);

const catalogueTitles = [...catalogue.values()]
  .map((t) => ({ id: t.id, title: normalise(t.title) }))
  .sort((a, b) => b.title.length - a.title.length); // longest first

export interface BookEditionHint {
  title:     string;
  subtitle?: string | null;
  authors?:  readonly string[] | null;
}

/** Open Library work id of the catalogue book this edition verifiably is, or
 *  null. Requires Suzanne Collins as an author, a title that is the catalogue
 *  title plus (optionally) edition wording only, and a subtitle that is
 *  edition wording only. */
export function matchFranchiseEdition(edition: BookEditionHint): string | null {
  const authors = (edition.authors ?? []).map(normalise);
  if (!authors.some((a) => a === FRANCHISE_AUTHOR)) return null;
  if (NOT_THE_BOOK.test(edition.title) || (edition.subtitle && NOT_THE_BOOK.test(edition.subtitle))) return null;
  if (edition.subtitle && !ONLY_EDITION_WORDS.test(normalise(edition.subtitle))) return null;

  const title = normalise(edition.title);
  for (const entry of catalogueTitles) {
    if (title !== entry.title && !title.startsWith(`${entry.title} `)) continue;
    return ONLY_EDITION_WORDS.test(title.slice(entry.title.length)) ? entry.id : null;
  }
  return null;
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
