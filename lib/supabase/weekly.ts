"use client";

import { createClient as createSupabaseBrowserClient } from "./client";
import { DIARY_SELECT } from "../queries";

export type WeeklyChallengeId =
  | "log_three_entries"
  | "write_one_review"
  | "like_three_reviews"
  | "comment_one_public_review";

export type WeeklyChallengeProgress = {
  id: WeeklyChallengeId;
  label: string;
  detail: string;
  current: number;
  target: number;
  complete: boolean;
};

export type WeeklyLeaderboardCategory =
  | "entries_logged"
  | "reviews_written"
  | "liked_reviewer";

export type WeeklyLeaderboardEntry = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  value: number;
};

export type WeeklyChallengeSnapshot = {
  weekStart: string;
  weekEnd: string;
  progress: WeeklyChallengeProgress[];
  completedCount: number;
  leaderboard: {
    entriesLogged: WeeklyLeaderboardEntry[];
    reviewsWritten: WeeklyLeaderboardEntry[];
    likedReviewer: WeeklyLeaderboardEntry[];
  };
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type DiaryWeekRow = {
  id: string;
  user_id: string;
  review: string;
  saved_at: string;
};

type LikeWeekRow = {
  diary_entry_id: string;
  user_id: string;
  created_at: string;
};

type EntryReviewRow = {
  id: string;
  review: string;
};

function getWeekBounds(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diffToMonday = (day + 6) % 7;
  current.setHours(0, 0, 0, 0);

  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return {
    weekStart,
    weekEnd,
    weekStartIso: weekStart.toISOString().slice(0, 10),
    weekEndIso: weekEnd.toISOString().slice(0, 10),
  };
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

function buildChallengeProgress(input: {
  entriesLogged: number;
  reviewsWritten: number;
  likesGiven: number;
  commentsWritten: number;
}) {
  const progress: WeeklyChallengeProgress[] = [
    {
      id: "log_three_entries",
      label: "Log 3 entries this week",
      detail: "Keep the diary moving with three new logs.",
      current: input.entriesLogged,
      target: 3,
      complete: input.entriesLogged >= 3,
    },
    {
      id: "write_one_review",
      label: "Write 1 review this week",
      detail: "Put at least one written thought on the shelf.",
      current: input.reviewsWritten,
      target: 1,
      complete: input.reviewsWritten >= 1,
    },
    {
      id: "like_three_reviews",
      label: "Like 3 reviews this week",
      detail: "Respond to public taste around ReelShelf.",
      current: input.likesGiven,
      target: 3,
      complete: input.likesGiven >= 3,
    },
    {
      id: "comment_one_public_review",
      label: "Comment on 1 public review this week",
      detail: "Join the conversation on someone else’s shelf.",
      current: input.commentsWritten,
      target: 1,
      complete: input.commentsWritten >= 1,
    },
  ];

  return progress;
}

function buildLeaderboardEntries(
  counts: Map<string, number>,
  profileMap: Map<string, ProfileRow>,
  limit = 5
) {
  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      const leftName = profileMap.get(left[0])?.username || "";
      const rightName = profileMap.get(right[0])?.username || "";
      return leftName.localeCompare(rightName);
    })
    .slice(0, limit)
    .map(([userId, value]) => {
      const profile = profileMap.get(userId);

      return {
        userId,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        value,
      } satisfies WeeklyLeaderboardEntry;
    });
}

export async function syncAndLoadWeeklyChallenges() {
  const client = createSupabaseBrowserClient();
  const user = await getCurrentUser();

  const { weekStart, weekEnd, weekStartIso, weekEndIso } = getWeekBounds();

  if (!client || !user) {
    return {
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      progress: buildChallengeProgress({
        entriesLogged: 0,
        reviewsWritten: 0,
        likesGiven: 0,
        commentsWritten: 0,
      }),
      completedCount: 0,
      leaderboard: {
        entriesLogged: [],
        reviewsWritten: [],
        likedReviewer: [],
      },
    } satisfies WeeklyChallengeSnapshot;
  }

  const weekStartTimestamp = weekStart.toISOString();
  const weekEndTimestamp = weekEnd.toISOString();

  const [
    diaryResponse,
    likesGivenResponse,
    likesThisWeekResponse,
    publicProfilesResponse,
  ] = await Promise.all([
    client
      .from("diary_entries")
      .select(DIARY_SELECT)
      .gte("saved_at", weekStartTimestamp)
      .lt("saved_at", weekEndTimestamp)
      .order("saved_at", { ascending: false }),
    client
      .from("diary_entry_likes")
      .select("diary_entry_id, user_id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", weekStartTimestamp)
      .lt("created_at", weekEndTimestamp),
    client
      .from("diary_entry_likes")
      .select("diary_entry_id, user_id, created_at")
      .gte("created_at", weekStartTimestamp)
      .lt("created_at", weekEndTimestamp),
    client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .not("username", "is", null),
  ]);

  if (diaryResponse.error) {
    console.error("[ReelShelf weekly] load diary failed", diaryResponse.error);
  }
  if (likesGivenResponse.error) {
    console.error("[ReelShelf weekly] load likes given failed", likesGivenResponse.error);
  }
  if (likesThisWeekResponse.error) {
    console.error("[ReelShelf weekly] load weekly likes failed", likesThisWeekResponse.error);
  }
  if (publicProfilesResponse.error) {
    console.error("[ReelShelf weekly] load profiles failed", publicProfilesResponse.error);
  }

  console.log("[DIARY QUERY] returned rows:", diaryResponse.data?.length ?? 0)

  const diaryRows = (((diaryResponse.data || []) as unknown) as DiaryWeekRow[]).filter(Boolean);
  const likesGivenRows = ((likesGivenResponse.data || []) as LikeWeekRow[]).filter(Boolean);
  const likesThisWeekRows = ((likesThisWeekResponse.data || []) as LikeWeekRow[]).filter(Boolean);
  const commentsWrittenRows: Array<{ diary_entry_id: string }> = [];
  const profileRows = ((publicProfilesResponse.data || []) as ProfileRow[]).filter(Boolean);
  const profileMap = new Map<string, ProfileRow>(
    profileRows.map((row) => [row.id, row] as const)
  );

  const interactedEntryIds = Array.from(
    new Set([
      ...likesGivenRows.map((row) => row.diary_entry_id),
      ...commentsWrittenRows.map((row) => row.diary_entry_id),
    ])
  );
  const interactionReviewMap = new Map<string, EntryReviewRow>();

  if (interactedEntryIds.length > 0) {
    const { data: interactionRows, error: interactionError } = await client
      .from("diary_entries")
      .select(DIARY_SELECT)
      .in("id", interactedEntryIds);

    if (interactionError) {
      console.error(
        "[ReelShelf weekly] load interaction entry reviews failed",
        interactionError
      );
    } else {
      for (const row of (((interactionRows || []) as unknown) as EntryReviewRow[])) {
        interactionReviewMap.set(row.id, row);
      }
    }
  }

  const entriesLogged = diaryRows.filter((row) => row.user_id === user.id).length;
  const reviewsWritten = diaryRows.filter(
    (row) => row.user_id === user.id && row.review.trim()
  ).length;
  const likesGiven = likesGivenRows.filter((row) =>
    interactionReviewMap.get(row.diary_entry_id)?.review?.trim()
  ).length;
  const commentsWritten = commentsWrittenRows.filter((row) =>
    interactionReviewMap.get(row.diary_entry_id)?.review?.trim()
  ).length;

  const progress = buildChallengeProgress({
    entriesLogged,
    reviewsWritten,
    likesGiven,
    commentsWritten,
  });

  const completedCount = progress.filter((item) => item.complete).length;
  const completedChallengeIds = progress
    .filter((item) => item.complete)
    .map((item) => item.id);

  const entryCounts = new Map<string, number>();
  const reviewCounts = new Map<string, number>();

  for (const row of diaryRows) {
    if (!profileMap.has(row.user_id)) {
      continue;
    }

    entryCounts.set(row.user_id, (entryCounts.get(row.user_id) || 0) + 1);

    if (row.review.trim()) {
      reviewCounts.set(row.user_id, (reviewCounts.get(row.user_id) || 0) + 1);
    }
  }

  const reviewedEntryMap = new Map<string, DiaryWeekRow>();
  for (const row of diaryRows) {
    if (row.review.trim() && profileMap.has(row.user_id)) {
      reviewedEntryMap.set(row.id, row);
    }
  }

  const likedReviewerCounts = new Map<string, number>();
  for (const row of likesThisWeekRows) {
    const likedEntry = reviewedEntryMap.get(row.diary_entry_id);
    if (!likedEntry) {
      continue;
    }

    likedReviewerCounts.set(
      likedEntry.user_id,
      (likedReviewerCounts.get(likedEntry.user_id) || 0) + 1
    );
  }

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    progress,
    completedCount,
    leaderboard: {
      entriesLogged: buildLeaderboardEntries(entryCounts, profileMap),
      reviewsWritten: buildLeaderboardEntries(reviewCounts, profileMap),
      likedReviewer: buildLeaderboardEntries(likedReviewerCounts, profileMap),
    },
  } satisfies WeeklyChallengeSnapshot;
}
