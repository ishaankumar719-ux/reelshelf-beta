// Real website has a genuine "Related books" section on Book Detail
// (app/books/[id]/page.tsx's RelatedBooksSection, "More reads with a
// similar mood, author, or shelf energy.") — but its real algorithm
// (getRelatedBooks) filters the website's own STATIC local book catalog:
// same-author first, then same-genre-different-author, then everything
// else, sliced to 8. Mobile has no local book catalog (an established,
// accepted divergence elsewhere in this app — Daily Reel's candidate pool,
// Because You Loved's book rotation). ADAPTED here, not invented: same
// real priority order (author first, genre second), against live Google
// Books search instead of a fixed local list — reuses the existing
// searchBooks() function exactly, no new Google Books integration.
import { searchBooks } from './search';
import type { PosterRowItem } from '@/components/MediaPosterRow';

export async function fetchRelatedBooks(
  currentBookId: string,
  author: string | null,
  genre: string | null,
): Promise<PosterRowItem[]> {
  const seen = new Set<string>([currentBookId]);
  const results: PosterRowItem[] = [];

  const addFrom = async (query: string) => {
    if (!query.trim()) return;
    try {
      const found = await searchBooks(query);
      for (const b of found) {
        if (results.length >= 8) break;
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        results.push({ id: b.id, title: b.title, year: b.year, posterUrl: b.posterUrl, mediaType: 'book' });
      }
    } catch {
      // best-effort — a failed supplementary query shouldn't break the section
    }
  };

  if (author) await addFrom(`inauthor:${author}`);
  if (results.length < 8 && genre) await addFrom(`subject:${genre}`);

  return results.slice(0, 8);
}
