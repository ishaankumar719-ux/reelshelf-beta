import type { MediaType, SavedMediaItem } from "./media";
import {
  deleteDiaryEntryFromBackend,
  syncDiaryEntriesWithBackend,
  upsertDiaryEntryToBackend,
} from "./supabase/persistence";

export type DiaryMovie = SavedMediaItem & {
  rating: number | null;
  review: string;
  watchedDate: string;
  favourite: boolean;
  savedAt: string;
};

export type DiaryDraftMovie = SavedMediaItem;

type LegacyDiaryMovie = {
  id: string;
  mediaType?: MediaType;
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
    savedAt:
      "savedAt" in movie && typeof movie.savedAt === "string"
        ? movie.savedAt
        : new Date().toISOString(),
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
          (candidate) =>
            candidate.id === movie.id && candidate.mediaType === movie.mediaType
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

export function getDiaryMovie(id: string, mediaType: MediaType = "movie") {
  return getDiaryMovies().find(
    (movie) => movie.id === id && movie.mediaType === mediaType
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
    rating: number;
    review: string;
    watchedDate: string;
    favourite: boolean;
  }
) {
  if (typeof window === "undefined") return;

  const current = getDiaryMovies();
  const existingEntry = current.find(
    (entry) => entry.id === movie.id && entry.mediaType === movie.mediaType
  );
  const nextEntry: DiaryMovie = {
    ...movie,
    rating: normalizeRatingValue(movie.rating),
    review: movie.review.trim(),
    watchedDate: movie.watchedDate,
    favourite: movie.favourite,
    savedAt: existingEntry?.savedAt || new Date().toISOString(),
  };

  const updated = [
    nextEntry,
    ...current.filter(
      (entry) =>
        !(entry.id === movie.id && entry.mediaType === movie.mediaType)
    ),
  ];

  writeDiaryMovies(updated);
  void upsertDiaryEntryToBackend(nextEntry);
}

export function removeDiaryEntry(
  id: string,
  mediaType: MediaType = "movie"
) {
  if (typeof window === "undefined") return;

  const current = getDiaryMovies();
  const updated = current.filter(
    (entry) => !(entry.id === id && entry.mediaType === mediaType)
  );

  writeDiaryMovies(updated);
  void deleteDiaryEntryFromBackend(id, mediaType);
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
