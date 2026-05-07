import type { DiaryReviewScope, MediaType, SavedMediaItem } from "./media";
import type { ReviewLayers } from "../types/diary";
import {
  deleteDiaryEntryFromBackend,
  syncDiaryEntriesWithBackend,
  upsertDiaryEntryToBackend,
  upsertDiaryEntriesToBackend,
} from "./supabase/persistence";

export type DiaryMovie = SavedMediaItem & {
  rating: number | null;
  review: string;
  watchedDate: string;
  favourite: boolean;
  rewatch: boolean;
  containsSpoilers: boolean;
  savedAt: string;
  reviewLayers?: ReviewLayers | null;
};

export type DiaryDraftMovie = SavedMediaItem;

export type DiaryImportSummary = {
  imported: number;
  updated: number;
  total: number;
  duplicatesConsolidated: number;
};

type LegacyDiaryMovie = {
  id: string;
  mediaType?: MediaType;
  reviewScope?: DiaryReviewScope;
  showId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  title: string;
  year: number;
  poster?: string;
  director?: string;
  genres?: string[];
  runtime?: number;
  voteAverage?: number;
  watchedAt?: string;
};

const STORAGE_KEY = "reelshelf-diary";
const DRAFT_STORAGE_KEY = "reelshelf-diary-draft";
const DIARY_EVENT = "reelshelf:diary-updated";

export function getDiaryEntryKey(entry: {
  id: string;
  mediaType: MediaType;
  reviewScope?: DiaryReviewScope;
  seasonNumber?: number;
  episodeNumber?: number;
}) {
  return [
    entry.mediaType,
    entry.id,
    entry.reviewScope || (entry.mediaType === "tv" ? "show" : "title"),
    entry.seasonNumber || 0,
    entry.episodeNumber || 0,
  ].join(":");
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRatingValue(value: unknown) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Number(value.toFixed(1));
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return Number(parsed.toFixed(1));
    }
  }

  return null;
}

function normalizeDiaryMovie(
  movie: DiaryMovie | LegacyDiaryMovie
): DiaryMovie | null {
  if (!movie || typeof movie !== "object" || typeof movie.id !== "string") {
    return null;
  }

  const watchedDate =
    "watchedDate" in movie && typeof movie.watchedDate === "string"
      ? movie.watchedDate
      : "watchedAt" in movie && typeof movie.watchedAt === "string"
        ? movie.watchedAt.slice(0, 10)
        : todayIsoDate();

  return {
    id: movie.id,
    mediaType:
      "mediaType" in movie && movie.mediaType ? movie.mediaType : "movie",
    reviewScope:
      "reviewScope" in movie && movie.reviewScope
        ? movie.reviewScope
        : ("mediaType" in movie && movie.mediaType === "tv")
          ? "show"
          : "title",
    showId:
      "showId" in movie && typeof movie.showId === "string"
        ? movie.showId
        : ("mediaType" in movie && movie.mediaType === "tv")
          ? movie.id
          : undefined,
    seasonNumber:
      "seasonNumber" in movie && typeof movie.seasonNumber === "number"
        ? movie.seasonNumber
        : undefined,
    episodeNumber:
      "episodeNumber" in movie && typeof movie.episodeNumber === "number"
        ? movie.episodeNumber
        : undefined,
    title: movie.title,
    poster: movie.poster,
    year: Number(movie.year) || 0,
    director: movie.director,
    genres: movie.genres,
    runtime: movie.runtime,
    voteAverage: movie.voteAverage,
    rating: "rating" in movie ? normalizeRatingValue(movie.rating) : null,
    review:
      "review" in movie && typeof movie.review === "string" ? movie.review : "",
    watchedDate,
    favourite:
      "favourite" in movie && typeof movie.favourite === "boolean"
        ? movie.favourite
        : false,
    rewatch:
      "rewatch" in movie && typeof movie.rewatch === "boolean"
        ? movie.rewatch
        : false,
    containsSpoilers:
      "containsSpoilers" in movie && typeof movie.containsSpoilers === "boolean"
        ? movie.containsSpoilers
        : false,
    savedAt:
      "savedAt" in movie && typeof movie.savedAt === "string"
        ? movie.savedAt
        : new Date().toISOString(),
    reviewLayers:
      "reviewLayers" in movie && movie.reviewLayers != null
        ? (movie.reviewLayers as ReviewLayers)
        : null,
  };
}

function writeDiaryMovies(entries: DiaryMovie[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(DIARY_EVENT));
}

export function getDiaryMovies(): DiaryMovie[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as Array<DiaryMovie | LegacyDiaryMovie>) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .map(normalizeDiaryMovie)
      .filter((movie): movie is DiaryMovie => movie !== null);

    const deduped = normalized.filter(
      (movie, index, array) =>
        array.findIndex(
          (candidate) => getDiaryEntryKey(candidate) === getDiaryEntryKey(movie)
        ) === index
    );

    if (JSON.stringify(deduped) !== JSON.stringify(parsed)) {
      writeDiaryMovies(deduped);
    }

    return deduped.sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  } catch {
    return [];
  }
}

export function getDiaryMovie(
  id: string,
  mediaType: MediaType = "movie",
  options?: {
    reviewScope?: DiaryReviewScope;
    seasonNumber?: number;
    episodeNumber?: number;
  }
) {
  return getDiaryMovies().find(
    (movie) =>
      getDiaryEntryKey(movie) ===
      getDiaryEntryKey({
        id,
        mediaType,
        reviewScope: options?.reviewScope,
        seasonNumber: options?.seasonNumber,
        episodeNumber: options?.episodeNumber,
      })
  );
}

export function saveDiaryDraft(movie: DiaryDraftMovie) {
  if (typeof window === "undefined") return;

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(movie));
}

export function getDiaryDraft(): DiaryDraftMovie | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as DiaryDraftMovie;

    if (!parsed || typeof parsed !== "object" || typeof parsed.id !== "string") {
      return null;
    }

    return {
      ...parsed,
      mediaType: parsed.mediaType || "movie",
    };
  } catch {
    return null;
  }
}

export function clearDiaryDraft() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function saveDiaryEntry(
  movie: DiaryDraftMovie & {
    rating: number | null;
    review: string;
    watchedDate: string;
    favourite: boolean;
    rewatch?: boolean;
    containsSpoilers?: boolean;
  }
) {
  if (typeof window === "undefined") return;

  const current = getDiaryMovies();
  const entryKey = getDiaryEntryKey(movie);
  const existingEntry = current.find(
    (entry) => getDiaryEntryKey(entry) === entryKey
  );
  const nextEntry: DiaryMovie = {
    ...movie,
    rating: normalizeRatingValue(movie.rating),
    review: movie.review.trim(),
    watchedDate: movie.watchedDate,
    favourite: movie.favourite,
    rewatch: movie.rewatch ?? false,
    containsSpoilers: movie.containsSpoilers ?? false,
    savedAt: existingEntry?.savedAt || new Date().toISOString(),
  };

  const updated = [
    nextEntry,
    ...current.filter(
      (entry) => getDiaryEntryKey(entry) !== entryKey
    ),
  ];

  writeDiaryMovies(updated);
  void upsertDiaryEntryToBackend(nextEntry);
}

export function saveDiaryEntryLocally(movie: DiaryMovie) {
  if (typeof window === "undefined") return;

  const normalized = normalizeDiaryMovie(movie);

  if (!normalized) {
    return;
  }

  const current = getDiaryMovies();
  const entryKey = getDiaryEntryKey(normalized);
  const updated = [
    normalized,
    ...current.filter((entry) => getDiaryEntryKey(entry) !== entryKey),
  ];

  writeDiaryMovies(updated);
}

export async function importDiaryEntries(entries: DiaryMovie[]) {
  if (typeof window === "undefined") {
    return {
      imported: 0,
      updated: 0,
      total: 0,
      duplicatesConsolidated: 0,
    } satisfies DiaryImportSummary;
  }

  const current = getDiaryMovies();
  const merged = new Map<string, DiaryMovie>();
  let imported = 0;
  let updated = 0;
  let duplicatesConsolidated = 0;

  for (const entry of current) {
    const key = getDiaryEntryKey(entry);
    merged.set(key, entry);
  }

  const nextEntriesToPersist = new Map<string, DiaryMovie>();

  for (const rawEntry of entries) {
    const normalized = normalizeDiaryMovie(rawEntry);

    if (!normalized) {
      continue;
    }

    const key = getDiaryEntryKey(normalized);
    const existing = merged.get(key);

    if (!existing && !nextEntriesToPersist.has(key)) {
      imported += 1;
    } else if (!existing || nextEntriesToPersist.has(key)) {
      duplicatesConsolidated += 1;
    } else {
      updated += 1;
    }

    if (existing) {
      const existingSavedAt = new Date(existing.savedAt).getTime();
      const nextSavedAt = new Date(normalized.savedAt).getTime();
      const shouldReplace =
        Number.isNaN(existingSavedAt) ||
        (!Number.isNaN(nextSavedAt) && nextSavedAt >= existingSavedAt);

      if (!shouldReplace) {
        continue;
      }
    }

    const nextEntry = {
      ...normalized,
      savedAt:
        normalized.savedAt ||
        existing?.savedAt ||
        new Date().toISOString(),
    };

    merged.set(key, nextEntry);
    nextEntriesToPersist.set(key, nextEntry);
  }

  const nextDiary = Array.from(merged.values()).sort(
    (left, right) =>
      new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime()
  );

  writeDiaryMovies(nextDiary);
  await upsertDiaryEntriesToBackend(Array.from(nextEntriesToPersist.values()));

  return {
    imported,
    updated,
    total: nextDiary.length,
    duplicatesConsolidated,
  } satisfies DiaryImportSummary;
}

export function removeDiaryEntry(
  id: string,
  mediaType: MediaType = "movie",
  options?: {
    reviewScope?: DiaryReviewScope;
    seasonNumber?: number;
    episodeNumber?: number;
  }
) {
  if (typeof window === "undefined") return;

  const current = getDiaryMovies();
  const targetKey = getDiaryEntryKey({
    id,
    mediaType,
    reviewScope: options?.reviewScope,
    seasonNumber: options?.seasonNumber,
    episodeNumber: options?.episodeNumber,
  });
  const updated = current.filter(
    (entry) => getDiaryEntryKey(entry) !== targetKey
  );

  writeDiaryMovies(updated);
  void deleteDiaryEntryFromBackend(id, mediaType, options);
}

export async function syncDiaryWithBackend() {
  if (typeof window === "undefined") return getDiaryMovies();

  const synced = await syncDiaryEntriesWithBackend(getDiaryMovies());

  if (synced) {
    writeDiaryMovies(synced);
    return synced;
  }

  return getDiaryMovies();
}

export function subscribeToDiary(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(DIARY_EVENT, listener);
  return () => window.removeEventListener(DIARY_EVENT, listener);
}

export function clearDiaryDataForSignOut() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(DIARY_EVENT));
}
