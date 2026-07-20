// Exact port of the website's lib/discoverCollections.ts (COLLECTION_DEFS) and
// the per-title membership heuristics getFilmCollections()/getTVCollections()
// from app/films/[id]/page.tsx and app/series/[id]/page.tsx — same slugs,
// same names/descriptions, same TMDB discover query strings, same thresholds.
//
// Two defs (classic-literature, books-to-screen) use the website's local book
// catalog (localBooks/localMovies), which has no mobile equivalent (documented,
// accepted divergence — mobile has no local finite catalog, same reasoning as
// Daily Pick's candidate-pool adaptation). Neither is ever matched by the
// per-title heuristics below on the website either (their switch-cases only
// handle the tmdbPath-based slugs) — they only apply to a genre/keyword-based
// Discover browsing row, out of this task's scope, so this is not a gap.

export interface CollectionDef {
  slug:           string;
  name:           string;
  description:    string;
  tmdbPath?:      string;
  tmdbMediaType?: 'movie' | 'tv';
  localFilter?:   'classic-literature' | 'books-to-screen';
}

export const COLLECTION_DEFS: CollectionDef[] = [
  {
    slug: 'best-of-a24',
    name: 'Best of A24',
    description: 'Indie cinema at its most daring — from Hereditary to Everything Everywhere.',
    tmdbPath: '/discover/movie?with_companies=41077&vote_average.gte=7.0&vote_count.gte=100&sort_by=vote_average.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'under-90-min',
    name: 'Under 90 Minutes',
    description: "Great films that don't overstay their welcome.",
    tmdbPath: '/discover/movie?with_runtime.lte=90&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'mind-benders',
    name: 'Mind-Bending Stories',
    description: 'Films that warp reality and linger long after the credits.',
    tmdbPath: '/discover/movie?with_genres=878%2C53&vote_average.gte=7.5&vote_count.gte=200&sort_by=vote_average.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'true-crime',
    name: 'True Crime Essentials',
    description: "The best crime dramas — investigations that won't let you go.",
    tmdbPath: '/discover/movie?with_genres=80&vote_average.gte=7.5&vote_count.gte=300&sort_by=popularity.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'space-adventures',
    name: 'Space Adventures',
    description: 'Odysseys beyond the known — wormholes, alien worlds, and the deep unknown.',
    tmdbPath: '/discover/movie?with_genres=878%2C12&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'one-season-wonders',
    name: 'One Season Masterpieces',
    description: 'Television that perfected itself and never needed more.',
    tmdbPath: '/discover/tv?vote_average.gte=8.0&vote_count.gte=300&sort_by=vote_average.desc&include_adult=false',
    tmdbMediaType: 'tv',
  },
  {
    slug: 'coming-of-age',
    name: 'Coming of Age',
    description: 'Tender, formative stories about growing up and finding yourself.',
    tmdbPath: '/discover/movie?with_keywords=10683&vote_average.gte=7.0&vote_count.gte=100&sort_by=vote_average.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'classic-literature',
    name: 'Classic Literature',
    description: 'Timeless stories that define the literary canon.',
    localFilter: 'classic-literature',
  },
  {
    slug: 'books-to-screen',
    name: 'Books on Screen',
    description: 'Stories that leapt from page to cinema.',
    localFilter: 'books-to-screen',
  },
  {
    slug: 'one-night-thrillers',
    name: 'One Night Thrillers',
    description: 'Tight, tense, and over before midnight — thrillers under two hours.',
    tmdbPath: '/discover/movie?with_genres=53&with_runtime.lte=120&vote_average.gte=7.0&vote_count.gte=200&sort_by=popularity.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'perfect-sunday-stories',
    name: 'Perfect Sunday Stories',
    description: 'Quietly devastating, beautifully told — dramas made for a slow afternoon.',
    tmdbPath: '/discover/movie?with_genres=18&vote_average.gte=7.5&vote_count.gte=500&sort_by=popularity.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'neo-noir',
    name: 'Neo-Noir Essentials',
    description: 'Rain-slicked streets, moral ambiguity, and atmosphere you can taste.',
    tmdbPath: '/discover/movie?with_genres=80&with_keywords=6564&vote_average.gte=7.0&vote_count.gte=100&sort_by=vote_average.desc&include_adult=false',
    tmdbMediaType: 'movie',
  },
  {
    slug: 'mind-bending-tv',
    name: 'Mind-Bending Television',
    description: 'Shows that warp reality, bend perception, and refuse to let you go.',
    tmdbPath: '/discover/tv?with_genres=10765%7C9648&vote_average.gte=7.5&vote_count.gte=200&sort_by=vote_average.desc&include_adult=false',
    tmdbMediaType: 'tv',
  },
  {
    slug: 'crime-drama-tv',
    name: 'Crime Drama Essentials',
    description: 'Morally complex, brilliantly written crime television at its finest.',
    tmdbPath: '/discover/tv?with_genres=80%7C18&vote_average.gte=7.5&vote_count.gte=300&sort_by=vote_average.desc&include_adult=false',
    tmdbMediaType: 'tv',
  },
];

/** Exact port of the website's getFilmCollections() (app/films/[id]/page.tsx)
 *  — only the 7 movie slugs it actually handles; keyword-dependent ones
 *  (coming-of-age, neo-noir) are skipped there too ("need an extra TMDB
 *  keywords fetch", per the website's own comment), so skipped identically here. */
export function getFilmCollections(
  genreIds: number[],
  companyIds: number[],
  voteAverage: number,
  runtimeMinutes: number | null,
): CollectionDef[] {
  const hasGenre = (id: number) => genreIds.includes(id);
  const hasCompany = (id: number) => companyIds.includes(id);
  const va = voteAverage ?? 0;
  const rt = runtimeMinutes ?? 9999;

  return COLLECTION_DEFS.filter((def) => {
    if (def.tmdbMediaType !== 'movie') return false;
    switch (def.slug) {
      case 'best-of-a24':
        return hasCompany(41077) && va >= 7.0;
      case 'under-90-min':
        return rt <= 90 && va >= 7.0;
      case 'mind-benders':
        return (hasGenre(878) || hasGenre(53)) && va >= 7.5;
      case 'true-crime':
        return hasGenre(80) && va >= 7.5;
      case 'space-adventures':
        return hasGenre(878) && hasGenre(12) && va >= 7.0;
      case 'one-night-thrillers':
        return hasGenre(53) && rt <= 120 && va >= 7.0;
      case 'perfect-sunday-stories':
        return hasGenre(18) && va >= 7.5;
      default:
        return false;
    }
  });
}

/** Exact port of the website's getTVCollections() (app/series/[id]/page.tsx). */
export function getTVCollections(genreIds: number[], voteAverage: number): CollectionDef[] {
  const hasGenre = (id: number) => genreIds.includes(id);
  const va = voteAverage ?? 0;

  return COLLECTION_DEFS.filter((def) => {
    if (def.tmdbMediaType !== 'tv') return false;
    switch (def.slug) {
      case 'one-season-wonders':
        return va >= 8.0;
      case 'mind-bending-tv':
        return (hasGenre(10765) || hasGenre(9648)) && va >= 7.5;
      case 'crime-drama-tv':
        return (hasGenre(80) || hasGenre(18)) && va >= 7.5;
      default:
        return false;
    }
  });
}
