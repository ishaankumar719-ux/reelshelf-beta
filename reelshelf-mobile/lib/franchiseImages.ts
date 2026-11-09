import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { fetchTmdbDetails, fetchTmdbItemById } from '@/lib/tmdb';
import type { FranchiseTitle } from '@/data/franchiseCommunities';

const openLibraryCover = (coverId: number) => `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;

/** Same lookup as the website hub: the work record's cover first, then the
 *  search index (some works, e.g. Sunrise on the Reaping, only have edition
 *  covers). null means the PosterCard placeholder is shown. */
export async function fetchOpenLibraryCover(workId: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`https://openlibrary.org/works/${workId}.json`);
    if (res.ok) {
      const work = (await res.json()) as { covers?: number[] };
      const coverId = work.covers?.find((id) => id > 0);
      if (coverId) return openLibraryCover(coverId);
    }

    const search = await fetchWithTimeout(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(`key:"/works/${workId}"`)}&fields=cover_i&limit=1`,
    );
    if (!search.ok) return null;
    const data = (await search.json()) as { docs?: { cover_i?: number }[] };
    const coverId = data.docs?.[0]?.cover_i;
    return coverId && coverId > 0 ? openLibraryCover(coverId) : null;
  } catch {
    return null;
  }
}

export async function fetchFranchiseTitleImage(title: FranchiseTitle): Promise<string | null> {
  if (title.type === 'book') return fetchOpenLibraryCover(title.id);
  const item = await fetchTmdbItemById(title.type === 'film' ? 'movie' : 'tv', title.id);
  return item?.posterUrl ?? null;
}

export async function fetchFilmBackdrop(tmdbId: string): Promise<string | null> {
  try {
    return (await fetchTmdbDetails('movie', tmdbId)).backdropUrl;
  } catch {
    return null;
  }
}
