"use client";

import { createClient as createSupabaseBrowserClient } from "./client";
import { DIARY_SELECT } from "../queries";

export type ReelShelfBadgeId =
  | "first_entry"
  | "ten_entries"
  | "fifty_entries"
  | "first_review"
  | "first_like_received"
  | "first_comment_received";

export type ReelShelfGamificationStats = {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  reviewCount: number;
  likesReceived: number;
  commentsReceived: number;
  badges: ReelShelfBadgeId[];
  updatedAt: string | null;
};

type DiaryEntryRow = {
  id: string;
  saved_at: string;
  review: string;
};

const EMPTY_STATS: ReelShelfGamificationStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalEntries: 0,
  reviewCount: 0,
  likesReceived: 0,
  commentsReceived: 0,
  badges: [],
  updatedAt: null,
};

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

function toIsoDate(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

function diffDays(left: string, right: string) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Math.round((leftTime - rightTime) / (24 * 60 * 60 * 1000));
}

function computeStreaks(savedDates: string[]) {
  const uniqueDates = Array.from(new Set(savedDates.map(toIsoDate))).sort((a, b) =>
    b.localeCompare(a)
  );

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const today = new Date().toISOString().slice(0, 10);
  const latest = uniqueDates[0];
  const distanceFromToday = diffDays(today, latest);
  let currentStreak = 0;

  if (distanceFromToday === 0 || distanceFromToday === 1) {
    currentStreak = 1;

    for (let index = 1; index < uniqueDates.length; index += 1) {
      if (diffDays(uniqueDates[index - 1], uniqueDates[index]) === 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  let longestStreak = 1;
  let running = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    if (diffDays(uniqueDates[index - 1], uniqueDates[index]) === 1) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 1;
    }
  }

  return { currentStreak, longestStreak };
}

function computeBadges(input: {
  totalEntries: number;
  reviewCount: number;
  likesReceived: number;
  commentsReceived: number;
}) {
  const badges: ReelShelfBadgeId[] = [];

  if (input.totalEntries >= 1) badges.push("first_entry");
  if (input.totalEntries >= 10) badges.push("ten_entries");
  if (input.totalEntries >= 50) badges.push("fifty_entries");
  if (input.reviewCount >= 1) badges.push("first_review");
  if (input.likesReceived >= 1) badges.push("first_like_received");
  if (input.commentsReceived >= 1) badges.push("first_comment_received");

  return badges;
}

export async function syncAndLoadGamificationStats() {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    return EMPTY_STATS;
  }

  const { data: diaryRows, error: diaryError } = await client
    .from("diary_entries")
    .select(DIARY_SELECT)
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (diaryError) {
    console.error("[ReelShelf gamification] load diary failed", diaryError);
    return EMPTY_STATS;
  }

  console.log("[DIARY QUERY] returned rows:", diaryRows?.length ?? 0)

  const typedDiaryRows = (((diaryRows || []) as unknown) as DiaryEntryRow[]).filter(Boolean);
  const diaryEntryIds = typedDiaryRows.map((row) => row.id);

  let likesReceived = 0;
  let commentsReceived = 0;

  if (diaryEntryIds.length > 0) {
    const { data: likeRows, error: likeError } = await client
      .from("diary_entry_likes")
      .select("user_id")
      .in("diary_entry_id", diaryEntryIds);

    if (likeError) {
      console.error("[ReelShelf gamification] load likes received failed", likeError);
    } else {
      likesReceived = (likeRows || []).filter((row) => row.user_id !== user.id).length;
    }
  }

  const totalEntries = typedDiaryRows.length;
  const reviewCount = typedDiaryRows.filter((row) => row.review.trim()).length;
  const { currentStreak, longestStreak } = computeStreaks(
    typedDiaryRows.map((row) => row.saved_at)
  );
  const badges = computeBadges({
    totalEntries,
    reviewCount,
    likesReceived,
    commentsReceived,
  });
  const updatedAt = new Date().toISOString();

  return {
    currentStreak,
    longestStreak,
    totalEntries,
    reviewCount,
    likesReceived,
    commentsReceived,
    badges,
    updatedAt,
  } satisfies ReelShelfGamificationStats;
}
