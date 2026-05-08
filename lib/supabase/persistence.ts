"use client";

import { createClient as createSupabaseBrowserClient } from "./client";
import type { DiaryReviewScope, MediaType, SavedMediaItem } from "../media";
import type { ReviewLayers } from "../../types/diary";
import { DIARY_SELECT } from "../queries";

export type PersistedDiaryEntry = SavedMediaItem & {
  rating: number | null;
  review: string;
  watchedDate: string;
  favourite: boolean;
  rewatch: boolean;
  containsSpoilers: boolean;
  savedAt: string;
  reviewLayers?: ReviewLayers | null;
  reelshelfScore?: number | null;
  attachmentUrl?: string | null;
  attachmentType?: "image" | "gif" | null;
};

export type PersistedSavedItem = SavedMediaItem & {
  addedAt: string;
};

type DiaryRow = {
  user_id: string;
  media_id: string;
  media_type: MediaType;
  review_scope: DiaryReviewScope;
  show_id: string;
  season_number: number | null;
  episode_number: number | null;
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  genres: string[];
  runtime: number | null;
  vote_average: number | null;
  rating: number | null;
  review: string;
  watched_date: string;
  favourite: boolean;
  rewatch: boolean;
  contains_spoilers: boolean;
  saved_at: string;
  // Review layers — nullable columns added in migration 20260509_review_layers.sql
  score_rating?: number | null;
  cinematography_rating?: number | null;
  writing_rating?: number | null;
  performances_rating?: number | null;
  direction_rating?: number | null;
  rewatchability_rating?: number | null;
  emotional_impact_rating?: number | null;
  entertainment_rating?: number | null;
  // Calculated score — migration 20260510_reelshelf_score.sql
  reelshelf_score?: number | null;
  // Entry attachment — migration 20260508_diary_entry_attachments.sql
  attachment_url?: string | null;
  attachment_type?: "image" | "gif" | null;
};

type SavedItemRow = {
  user_id: string;
  list_type: "watchlist" | "reading_shelf";
  media_id: string;
  media_type: MediaType;
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  genres: string[];
  runtime: number | null;
  vote_average: number | null;
  added_at: string;
};

function getDiaryEntryKey(entry: {
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

function mergeByLatest<T extends { id: string; mediaType: MediaType }>(
  left: T[],
  right: T[],
  getTimestamp: (entry: T) => string,
  getKey?: (entry: T) => string
) {
  const merged = new Map<string, T>();

  for (const entry of [...left, ...right]) {
    const key = getKey ? getKey(entry) : `${entry.mediaType}:${entry.id}`;
    const current = merged.get(key);

    if (!current) {
      merged.set(key, entry);
      continue;
    }

    const currentTime = new Date(getTimestamp(current)).getTime();
    const nextTime = new Date(getTimestamp(entry)).getTime();

    if (nextTime >= currentTime) {
      merged.set(key, entry);
    }
  }

  return Array.from(merged.values());
}

async function getCurrentUser() {
  const client = createSupabaseBrowserClient();

  if (!client) {
    return null;
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  return user;
}

async function ensureProfile() {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return false;
  }

  await client.from("profiles").upsert(
    {
      id: user.id,
      email: user.email || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return true;
}

function mapDiaryEntryToRow(userId: string, entry: PersistedDiaryEntry): DiaryRow {
  return {
    user_id: userId,
    media_id: entry.id,
    media_type: entry.mediaType,
    review_scope: entry.reviewScope || (entry.mediaType === "tv" ? "show" : "title"),
    show_id: entry.showId || (entry.mediaType === "tv" ? entry.id : ""),
    season_number: entry.seasonNumber ?? 0,
    episode_number: entry.episodeNumber ?? 0,
    title: entry.title,
    poster: entry.poster || null,
    year: Number(entry.year) || 0,
    creator: entry.director || null,
    genres: entry.genres || [],
    runtime: typeof entry.runtime === "number" ? entry.runtime : null,
    vote_average:
      typeof entry.voteAverage === "number" ? entry.voteAverage : null,
    rating: typeof entry.rating === "number" ? entry.rating : null,
    review: entry.review,
    watched_date: entry.watchedDate,
    favourite: entry.favourite,
    rewatch: entry.rewatch ?? false,
    contains_spoilers: entry.containsSpoilers ?? false,
    saved_at: entry.savedAt,
    score_rating: entry.reviewLayers?.score_rating ?? null,
    cinematography_rating: entry.reviewLayers?.cinematography_rating ?? null,
    writing_rating: entry.reviewLayers?.writing_rating ?? null,
    performances_rating: entry.reviewLayers?.performances_rating ?? null,
    direction_rating: entry.reviewLayers?.direction_rating ?? null,
    rewatchability_rating: entry.reviewLayers?.rewatchability_rating ?? null,
    emotional_impact_rating: entry.reviewLayers?.emotional_impact_rating ?? null,
    entertainment_rating: entry.reviewLayers?.entertainment_rating ?? null,
    reelshelf_score: entry.reelshelfScore ?? null,
    attachment_url: entry.attachmentUrl ?? null,
    attachment_type: entry.attachmentType ?? null,
  };
}

function mapRowToDiaryEntry(row: DiaryRow): PersistedDiaryEntry {
  return {
    id: row.media_id,
    mediaType: row.media_type,
    reviewScope: row.review_scope,
    showId: row.show_id || undefined,
    seasonNumber: row.season_number ?? undefined,
    episodeNumber: row.episode_number ?? undefined,
    title: row.title,
    poster: row.poster || undefined,
    year: Number(row.year) || 0,
    director: row.creator || undefined,
    genres: row.genres || [],
    runtime: typeof row.runtime === "number" ? row.runtime : undefined,
    voteAverage:
      typeof row.vote_average === "number" ? row.vote_average : undefined,
    rating: typeof row.rating === "number" ? row.rating : null,
    review: row.review || "",
    watchedDate: row.watched_date,
    favourite: row.favourite,
    rewatch: row.rewatch ?? false,
    containsSpoilers: row.contains_spoilers ?? false,
    savedAt: row.saved_at,
    reviewLayers: {
      score_rating: row.score_rating ?? null,
      cinematography_rating: row.cinematography_rating ?? null,
      writing_rating: row.writing_rating ?? null,
      performances_rating: row.performances_rating ?? null,
      direction_rating: row.direction_rating ?? null,
      rewatchability_rating: row.rewatchability_rating ?? null,
      emotional_impact_rating: row.emotional_impact_rating ?? null,
      entertainment_rating: row.entertainment_rating ?? null,
    },
    reelshelfScore: typeof row.reelshelf_score === "number" ? row.reelshelf_score : null,
    attachmentUrl: row.attachment_url ?? null,
    attachmentType: row.attachment_type ?? null,
  };
}

function getListType(mediaType: MediaType) {
  return mediaType === "book" ? "reading_shelf" : "watchlist";
}

function mapSavedItemToRow(userId: string, entry: PersistedSavedItem): SavedItemRow {
  return {
    user_id: userId,
    list_type: getListType(entry.mediaType),
    media_id: entry.id,
    media_type: entry.mediaType,
    title: entry.title,
    poster: entry.poster || null,
    year: Number(entry.year) || 0,
    creator: entry.director || null,
    genres: entry.genres || [],
    runtime: typeof entry.runtime === "number" ? entry.runtime : null,
    vote_average:
      typeof entry.voteAverage === "number" ? entry.voteAverage : null,
    added_at: entry.addedAt,
  };
}

function mapRowToSavedItem(row: SavedItemRow): PersistedSavedItem {
  return {
    id: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    poster: row.poster || undefined,
    year: Number(row.year) || 0,
    director: row.creator || undefined,
    genres: row.genres || [],
    runtime: typeof row.runtime === "number" ? row.runtime : undefined,
    voteAverage:
      typeof row.vote_average === "number" ? row.vote_average : undefined,
    addedAt: row.added_at,
  };
}

export async function syncDiaryEntriesWithBackend(localEntries: PersistedDiaryEntry[]) {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return null;
  }

  await ensureProfile();

  const { data } = await client
    .from("diary_entries")
    .select(DIARY_SELECT)
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const remoteEntries = (((data || []) as unknown) as DiaryRow[]).map(mapRowToDiaryEntry);
  const merged = mergeByLatest(
    localEntries,
    remoteEntries,
    (entry) => entry.savedAt,
    getDiaryEntryKey
  )
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  if (merged.length > 0) {
    await client.from("diary_entries").upsert(
      merged.map((entry) => mapDiaryEntryToRow(user.id, entry)),
      {
        onConflict:
          "user_id,media_type,media_id,review_scope,season_number,episode_number",
      }
    );
  }

  return merged;
}

export async function upsertDiaryEntryToBackend(entry: PersistedDiaryEntry) {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return;
  }

  console.log("[ReelShelf] Diary insert — auth.uid():", user.id);
  console.log("[ReelShelf] Diary insert — email:", user.email);

  await ensureProfile();

  await client.from("diary_entries").upsert(mapDiaryEntryToRow(user.id, entry), {
    onConflict:
      "user_id,media_type,media_id,review_scope,season_number,episode_number",
  });
}

export async function upsertDiaryEntriesToBackend(entries: PersistedDiaryEntry[]) {
  if (entries.length === 0) {
    return;
  }

  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return;
  }

  await ensureProfile();

  await client.from("diary_entries").upsert(
    entries.map((entry) => mapDiaryEntryToRow(user.id, entry)),
    {
      onConflict:
        "user_id,media_type,media_id,review_scope,season_number,episode_number",
    }
  );
}

export async function deleteDiaryEntryFromBackend(
  id: string,
  mediaType: MediaType,
  options?: {
    reviewScope?: DiaryReviewScope;
    seasonNumber?: number;
    episodeNumber?: number;
  }
) {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return;
  }

  await client
    .from("diary_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("media_id", id)
    .eq("media_type", mediaType)
    .eq("review_scope", options?.reviewScope || (mediaType === "tv" ? "show" : "title"))
    .eq("season_number", options?.seasonNumber || 0)
    .eq("episode_number", options?.episodeNumber || 0);
}

export async function syncSavedItemsWithBackend(localEntries: PersistedSavedItem[]) {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return null;
  }

  await ensureProfile();

  const { data } = await client
    .from("saved_items")
    .select("*")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const remoteEntries = ((data || []) as SavedItemRow[]).map(mapRowToSavedItem);
  const merged = mergeByLatest(localEntries, remoteEntries, (entry) => entry.addedAt)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

  if (merged.length > 0) {
    await client.from("saved_items").upsert(
      merged.map((entry) => mapSavedItemToRow(user.id, entry)),
      { onConflict: "user_id,list_type,media_type,media_id" }
    );
  }

  return merged;
}

export async function upsertSavedItemToBackend(entry: PersistedSavedItem) {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return;
  }

  await ensureProfile();

  await client.from("saved_items").upsert(mapSavedItemToRow(user.id, entry), {
    onConflict: "user_id,list_type,media_type,media_id",
  });
}

export async function deleteSavedItemFromBackend(id: string, mediaType: MediaType) {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return;
  }

  await client
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("media_id", id)
    .eq("media_type", mediaType)
    .eq("list_type", getListType(mediaType));
}
