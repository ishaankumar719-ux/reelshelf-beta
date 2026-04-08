import type { MediaType, SavedMediaItem } from "./media";
import {
  getMovieHrefFromTmdbId,
  normalizeMovieRouteId,
} from "./movieRoutes";
import { getMediaHref } from "./mediaRoutes";
import {
  deleteSavedItemFromBackend,
  syncSavedItemsWithBackend,
  upsertSavedItemToBackend,
} from "./supabase/persistence";

export type WatchlistEntry = SavedMediaItem & {
  addedAt: string;
};

type LegacyWatchlistEntry = {
  id: number;
  mediaType?: MediaType;
  title: string;
  poster?: string;
  year: string;
  addedAt?: string;
};

const STORAGE_KEY = "reelshelf-watchlist";
const WATCHLIST_EVENT = "reelshelf:watchlist-updated";

function normalizeStoredWatchlistEntry(
  entry: WatchlistEntry | LegacyWatchlistEntry
): WatchlistEntry | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  if (typeof entry.id === "string") {
    const mediaType = (entry as WatchlistEntry).mediaType || "movie";
    const normalizedId =
      mediaType === "movie" ? normalizeMovieRouteId(entry.id) : entry.id;

    if (!normalizedId) {
      return null;
    }

    return {
      ...(entry as WatchlistEntry),
      id: normalizedId,
      mediaType,
      year: Number((entry as WatchlistEntry).year) || 0,
      addedAt:
        (entry as WatchlistEntry).addedAt || new Date(0).toISOString(),
    };
  }

  if (typeof entry.id === "number") {
    const href = getMovieHrefFromTmdbId(entry.id);
    const normalizedId = normalizeMovieRouteId(href.replace("/movies/", ""));

    if (!normalizedId) {
      return null;
    }

    return {
      id: normalizedId,
      mediaType: entry.mediaType || "movie",
      title: entry.title,
      poster: entry.poster,
      year: Number(entry.year) || 0,
      addedAt: entry.addedAt || new Date(0).toISOString(),
    };
  }

  return null;
}

function writeWatchlist(entries: WatchlistEntry[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT));
}

export function getWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as Array<WatchlistEntry | LegacyWatchlistEntry>;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .map(normalizeStoredWatchlistEntry)
      .filter((entry): entry is WatchlistEntry => entry !== null);

    const deduped = normalized.filter(
      (entry, index, array) =>
        array.findIndex(
          (candidate) =>
            candidate.id === entry.id && candidate.mediaType === entry.mediaType
        ) === index
    );

    if (JSON.stringify(deduped) !== JSON.stringify(parsed)) {
      writeWatchlist(deduped);
    }

    return deduped;
  } catch {
    return [];
  }
}

export function isInWatchlist(id: string, mediaType: MediaType = "movie") {
  return getWatchlist().some(
    (entry) => entry.id === id && entry.mediaType === mediaType
  );
}

export function addToWatchlist(movie: Omit<WatchlistEntry, "addedAt">) {
  if (typeof window === "undefined") return;

  const mediaType = movie.mediaType || "movie";
  const normalizedId =
    mediaType === "movie" ? normalizeMovieRouteId(movie.id) : movie.id;

  if (!normalizedId) {
    return;
  }

  const current = getWatchlist();
  const exists = current.some(
    (entry) =>
      entry.id === normalizedId && entry.mediaType === mediaType
  );

  if (exists) {
    return;
  }

  const nextEntry: WatchlistEntry = {
    ...movie,
    id: normalizedId,
    mediaType,
    addedAt: new Date().toISOString(),
  };

  writeWatchlist([
    nextEntry,
    ...current,
  ]);

  void upsertSavedItemToBackend(nextEntry);
}

export function removeFromWatchlist(id: string) {
  if (typeof window === "undefined") return;

  const normalizedId = normalizeMovieRouteId(id);

  if (!normalizedId) {
    return;
  }

  writeWatchlist(
    getWatchlist().filter(
      (entry) => !(entry.id === normalizedId && entry.mediaType === "movie")
    )
  );
  void deleteSavedItemFromBackend(normalizedId, "movie");
}

export function removeFromWatchlistByMedia(
  id: string,
  mediaType: MediaType = "movie"
) {
  if (typeof window === "undefined") return;

  const normalizedId =
    mediaType === "movie" ? normalizeMovieRouteId(id) : id;

  if (!normalizedId) {
    return;
  }

  writeWatchlist(
    getWatchlist().filter(
      (entry) => !(entry.id === normalizedId && entry.mediaType === mediaType)
    )
  );
  void deleteSavedItemFromBackend(normalizedId, mediaType);
}

export function getWatchlistHref(id: string, mediaType: MediaType = "movie") {
  return getMediaHref({ id, mediaType });
}

export async function syncWatchlistWithBackend() {
  if (typeof window === "undefined") return getWatchlist();

  const synced = await syncSavedItemsWithBackend(getWatchlist());

  if (synced) {
    writeWatchlist(synced);
    return synced;
  }

  return getWatchlist();
}

export function subscribeToWatchlist(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(WATCHLIST_EVENT, listener);
  return () => window.removeEventListener(WATCHLIST_EVENT, listener);
}

export function clearWatchlistDataForSignOut() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(WATCHLIST_EVENT));
}
