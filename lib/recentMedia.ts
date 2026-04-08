import type { SavedMediaItem } from "./media";

export type RecentMediaItem = SavedMediaItem & {
  viewedAt: string;
};

const STORAGE_KEY = "reelshelf-recent-media";

function normalizeRecentMediaItem(item: unknown): RecentMediaItem | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as Partial<RecentMediaItem>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.mediaType !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    mediaType:
      candidate.mediaType === "movie" ||
      candidate.mediaType === "tv" ||
      candidate.mediaType === "book"
        ? candidate.mediaType
        : "movie",
    title: candidate.title,
    poster: candidate.poster,
    year: Number(candidate.year) || 0,
    director: candidate.director,
    genres: Array.isArray(candidate.genres) ? candidate.genres : undefined,
    runtime:
      typeof candidate.runtime === "number" ? candidate.runtime : undefined,
    voteAverage:
      typeof candidate.voteAverage === "number" ? candidate.voteAverage : undefined,
    viewedAt:
      typeof candidate.viewedAt === "string"
        ? candidate.viewedAt
        : new Date().toISOString(),
  };
}

function writeRecentMedia(items: RecentMediaItem[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getRecentMedia(): RecentMediaItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown[]) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .map(normalizeRecentMediaItem)
      .filter((item): item is RecentMediaItem => item !== null)
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      writeRecentMedia(normalized);
    }

    return normalized;
  } catch {
    return [];
  }
}

export function trackRecentMedia(item: SavedMediaItem) {
  if (typeof window === "undefined") return;

  const current = getRecentMedia();
  const nextItem: RecentMediaItem = {
    ...item,
    viewedAt: new Date().toISOString(),
  };

  const updated = [
    nextItem,
    ...current.filter(
      (entry) => !(entry.id === item.id && entry.mediaType === item.mediaType)
    ),
  ].slice(0, 12);

  writeRecentMedia(updated);
}
