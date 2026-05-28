"use client";

import { createClient as createSupabaseBrowserClient } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReactionEmoji = "🔥" | "🎬" | "😭" | "🤯" | "❤️";

export const REACTION_EMOJIS: ReactionEmoji[] = ["🔥", "🎬", "😭", "🤯", "❤️"];

export type ReactionCounts = Record<ReactionEmoji, number>;

const REACTION_EVENT = "reelshelf:reactions-updated";

function emptyReactionCounts(): ReactionCounts {
  return { "🔥": 0, "🎬": 0, "😭": 0, "🤯": 0, "❤️": 0 };
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const client = createSupabaseBrowserClient();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
}

// ─── Event bus ───────────────────────────────────────────────────────────────

function notifyReactionListeners() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REACTION_EVENT));
}

export function subscribeToReactions(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REACTION_EVENT, listener);
  return () => window.removeEventListener(REACTION_EVENT, listener);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

type ReactionRow = {
  emoji: ReactionEmoji;
  user_id: string;
};

export async function getReactionsForEntry(
  entryId: string,
  currentUserId?: string | null
): Promise<{ counts: ReactionCounts; userReactions: Set<ReactionEmoji> }> {
  const client = createSupabaseBrowserClient();
  if (!client) {
    return { counts: emptyReactionCounts(), userReactions: new Set() };
  }

  const { data, error } = await client
    .from("diary_entry_reactions")
    .select("emoji, user_id")
    .eq("diary_entry_id", entryId);

  if (error) {
    console.error("[reactions] getReactionsForEntry failed", error);
    return { counts: emptyReactionCounts(), userReactions: new Set() };
  }

  const rows = (data ?? []) as ReactionRow[];
  const counts = emptyReactionCounts();
  const userReactions = new Set<ReactionEmoji>();

  for (const row of rows) {
    if (REACTION_EMOJIS.includes(row.emoji)) {
      counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
    }
    if (currentUserId && row.user_id === currentUserId) {
      userReactions.add(row.emoji);
    }
  }

  return { counts, userReactions };
}

export async function getReactionCountsForEntries(
  entryIds: string[]
): Promise<Record<string, ReactionCounts>> {
  if (entryIds.length === 0) return {};

  const client = createSupabaseBrowserClient();
  if (!client) return {};

  const { data } = await client
    .from("diary_entry_reactions")
    .select("diary_entry_id, emoji")
    .in("diary_entry_id", entryIds);

  const result: Record<string, ReactionCounts> = {};

  for (const row of (data ?? []) as Array<{ diary_entry_id: string; emoji: ReactionEmoji }>) {
    if (!result[row.diary_entry_id]) {
      result[row.diary_entry_id] = emptyReactionCounts();
    }
    if (REACTION_EMOJIS.includes(row.emoji)) {
      result[row.diary_entry_id][row.emoji] =
        (result[row.diary_entry_id][row.emoji] ?? 0) + 1;
    }
  }

  return result;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function toggleReaction(
  entryId: string,
  emoji: ReactionEmoji,
  currentlyActive: boolean
): Promise<{ error: string | null; added: boolean }> {
  const client = createSupabaseBrowserClient();
  const userId = await getCurrentUserId();

  if (!client || !userId) {
    return { error: "Sign in to react.", added: false };
  }

  if (currentlyActive) {
    const { error } = await client
      .from("diary_entry_reactions")
      .delete()
      .eq("diary_entry_id", entryId)
      .eq("user_id", userId)
      .eq("emoji", emoji);

    if (error) {
      console.error("[reactions] remove failed", error);
      return { error: error.message, added: true };
    }
    notifyReactionListeners();
    return { error: null, added: false };
  }

  const { error } = await client
    .from("diary_entry_reactions")
    .insert({ diary_entry_id: entryId, user_id: userId, emoji });

  if (error && error.code !== "23505") {
    console.error("[reactions] add failed", error);
    return { error: error.message, added: false };
  }
  notifyReactionListeners();
  return { error: null, added: true };
}

// ─── Engagement metrics (for stats/profile pages) ─────────────────────────────

export type EntryEngagement = {
  entryId: string
  title: string
  poster: string | null
  totalReactions: number
  totalLikes: number
};

export async function getTopEngagedEntries(
  userId: string,
  limit = 5
): Promise<EntryEngagement[]> {
  const client = createSupabaseBrowserClient();
  if (!client) return [];

  // Fetch reaction counts on user's entries
  const { data: entries } = await client
    .from("diary_entries")
    .select("id, title, poster")
    .eq("user_id", userId)
    .in("review_scope", ["show", "title"])
    .limit(200);

  if (!entries || entries.length === 0) return [];

  const entryIds = entries.map((e) => e.id as string);

  const [{ data: reactionRows }, { data: likeRows }] = await Promise.all([
    client
      .from("diary_entry_reactions")
      .select("diary_entry_id")
      .in("diary_entry_id", entryIds),
    client
      .from("diary_entry_likes")
      .select("diary_entry_id")
      .in("diary_entry_id", entryIds),
  ]);

  const reactionCounts = new Map<string, number>();
  for (const r of reactionRows ?? []) {
    const id = r.diary_entry_id as string;
    reactionCounts.set(id, (reactionCounts.get(id) ?? 0) + 1);
  }

  const likeCounts = new Map<string, number>();
  for (const r of likeRows ?? []) {
    const id = r.diary_entry_id as string;
    likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1);
  }

  return entries
    .map((e) => ({
      entryId: e.id as string,
      title: e.title as string,
      poster: (e.poster as string | null) ?? null,
      totalReactions: reactionCounts.get(e.id as string) ?? 0,
      totalLikes: likeCounts.get(e.id as string) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.totalReactions + b.totalLikes - (a.totalReactions + a.totalLikes)
    )
    .filter((e) => e.totalReactions + e.totalLikes > 0)
    .slice(0, limit);
}
