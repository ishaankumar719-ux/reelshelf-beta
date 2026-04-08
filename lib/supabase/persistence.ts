"use client";

import { createClient as createSupabaseBrowserClient } from "./client";
import type { MediaType, SavedMediaItem } from "../media";

export type PersistedDiaryEntry = SavedMediaItem & {
  rating: number | null;
  review: string;
  watchedDate: string;
  favourite: boolean;
  savedAt: string;
};

export type PersistedSavedItem = SavedMediaItem & {
  addedAt: string;
};

type DiaryRow = {
  user_id: string;
  media_id: string;
  media_type: MediaType;
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
  saved_at: string;
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

function mergeByLatest<T extends { id: string; mediaType: MediaType }>(
  left: T[],
  right: T[],
  getTimestamp: (entry: T) => string
) {
  const merged = new Map<string, T>();

  for (const entry of [...left, ...right]) {
    const key = `${entry.mediaType}:${entry.id}`;
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
    saved_at: entry.savedAt,
  };
}

function mapRowToDiaryEntry(row: DiaryRow): PersistedDiaryEntry {
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
    rating: typeof row.rating === "number" ? row.rating : null,
    review: row.review || "",
    watchedDate: row.watched_date,
    favourite: row.favourite,
    savedAt: row.saved_at,
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
    .select("*")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const remoteEntries = ((data || []) as DiaryRow[]).map(mapRowToDiaryEntry);
  const merged = mergeByLatest(localEntries, remoteEntries, (entry) => entry.savedAt)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  if (merged.length > 0) {
    await client.from("diary_entries").upsert(
      merged.map((entry) => mapDiaryEntryToRow(user.id, entry)),
      { onConflict: "user_id,media_type,media_id" }
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

  await ensureProfile();

  await client.from("diary_entries").upsert(mapDiaryEntryToRow(user.id, entry), {
    onConflict: "user_id,media_type,media_id",
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
      onConflict: "user_id,media_type,media_id",
    }
  );
}

export async function deleteDiaryEntryFromBackend(id: string, mediaType: MediaType) {
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
    .eq("media_type", mediaType);
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
