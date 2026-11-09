import { searchBooks } from '@/lib/search';
import type { FranchiseTitle } from '@/data/franchiseCommunities';

// The franchise catalogue stores Open Library work ids (shared with the
// website), but the app's diary/shelf rows for books are keyed by the Google
// Books volume id that Search returns (toDbMediaId strips "book-"). Opening a
// hub book by its Open Library id would therefore log it under a different
// key than the same book opened from Search. This resolves each hub book to
// the volume Search shows for that title, so both routes share one row.

const AUTHOR = 'collins';

/** route id ("book-<volumeId>") → catalogue title, for every volume resolved
 *  this session. Lets the "Explore … community" link recognise them. */
const resolved = new Map<string, FranchiseTitle>();
const pending = new Map<string, Promise<string | null>>();

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Google Books route id for a catalogue book, using the same query Search
 *  sends for the title. Only an exact title match by Suzanne Collins counts.
 *  null if the lookup fails or nothing matches — the caller keeps the Open
 *  Library route then. */
export function resolveFranchiseBookRouteId(book: FranchiseTitle): Promise<string | null> {
  const cached = pending.get(book.id);
  if (cached) return cached;

  const lookup = searchBooks(book.title)
    .then((results) => {
      const match = results.find(
        (r) => normalise(r.title) === normalise(book.title) && (r.author ?? '').toLowerCase().includes(AUTHOR),
      );
      if (!match) return null;
      resolved.set(match.id, book);
      return match.id;
    })
    .catch(() => null);

  // Don't cache failures (e.g. a 429), so a later visit can try again.
  lookup.then((id) => {
    if (!id) pending.delete(book.id);
  });
  pending.set(book.id, lookup);
  return lookup;
}

export function getResolvedFranchiseBook(routeId: string): FranchiseTitle | undefined {
  return resolved.get(routeId);
}
