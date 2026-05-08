import { getMediaHref } from "./mediaRoutes";
import type { MediaType } from "./media";
import type { UserProfile } from "./profile";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFollowCounts } from "./follows";
import { DIARY_SELECT, PROFILE_SELECT } from "./queries";
import type { ReviewLayers } from "../types/diary";

export type PublicDiaryEntry = {
  entryId: string;
  id: string;
  mediaType: MediaType;
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  rating: number | null;
  review: string;
  watchedDate: string;
  favourite: boolean;
  rewatch: boolean;
  containsSpoilers: boolean;
  savedAt: string;
  href: string;
  likeCount: number;
  commentCount: number;
  reelshelfScore: number | null;
  reviewLayers: ReviewLayers | null;
  attachmentUrl: string | null;
  attachmentType: "image" | "gif" | null;
};

export type PublicProfileData = {
  profile: UserProfile;
  recentEntries: PublicDiaryEntry[];
  mountRushmore: PublicDiaryEntry[];
  counts: {
    followers: number;
    following: number;
  };
};

export type DiscoverProfileCardData = {
  profile: UserProfile;
  mountRushmore: PublicDiaryEntry[];
  counts: {
    followers: number;
    following: number;
  };
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public?: boolean | null;
  favourite_film: string | null;
  favourite_series: string | null;
  favourite_book: string | null;
  website_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  email?: string | null;
};

type DiaryRow = {
  id: string;
  media_id: string;
  media_type: MediaType;
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  rating: number | null;
  review: string | null;
  watched_date: string;
  favourite: boolean;
  rewatch: boolean;
  contains_spoilers: boolean;
  saved_at: string;
  reelshelf_score: number | null;
  attachment_url: string | null;
  attachment_type: "image" | "gif" | null;
  score_rating: number | null;
  cinematography_rating: number | null;
  writing_rating: number | null;
  performances_rating: number | null;
  direction_rating: number | null;
  rewatchability_rating: number | null;
  emotional_impact_rating: number | null;
  entertainment_rating: number | null;
};

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: null,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    websiteUrl: row.website_url ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    favouriteFilm: row.favourite_film,
    favouriteSeries: row.favourite_series,
    favouriteBook: row.favourite_book,
    movieMountRushmore: [],
  };
}

function mapDiaryRow(row: DiaryRow): PublicDiaryEntry {
  return {
    entryId: row.id,
    id: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    poster: row.poster,
    year: Number(row.year) || 0,
    creator: row.creator,
    rating: typeof row.rating === "number" ? row.rating : null,
    review: row.review || "",
    watchedDate: row.watched_date,
    favourite: Boolean(row.favourite),
    rewatch: Boolean(row.rewatch),
    containsSpoilers: Boolean(row.contains_spoilers),
    savedAt: row.saved_at,
    href: getMediaHref({ id: row.media_id, mediaType: row.media_type }),
    likeCount: 0,
    commentCount: 0,
    reelshelfScore: typeof row.reelshelf_score === "number" ? row.reelshelf_score : null,
    attachmentUrl: row.attachment_url ?? null,
    attachmentType: row.attachment_type ?? null,
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
  };
}

export async function getPublicProfileByUsername(
  supabase: SupabaseClient,
  username: string,
  _viewerUserId?: string | null
): Promise<PublicProfileData | null> {
  const normalizedUsername = username.trim().toLowerCase();

  console.log("[PROFILE QUERY] select string:", PROFILE_SELECT);
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (profileError) {
    console.error("[PROFILE QUERY] error:", profileError.message, "| hint:", profileError.hint);
  } else {
    console.log("[PROFILE QUERY] returned fields:", Object.keys(profileRow ?? {}));
  }

  if (profileError) {
    console.error("[ReelShelf public profile] load profile failed", profileError);
    return null;
  }

  if (!profileRow) {
    return null;
  }

  const typedProfileRow = profileRow as unknown as ProfileRow;

  const { data: diaryRows, error: diaryError } = await supabase
    .from("diary_entries")
    .select(DIARY_SELECT)
    .eq("user_id", typedProfileRow.id)
    .order("saved_at", { ascending: false })
    .limit(12);

  if (diaryError) {
    console.error("[ReelShelf public profile] load diary failed", diaryError);
    const counts = await getFollowCounts(supabase, typedProfileRow.id);
    return {
      profile: mapProfileRow(typedProfileRow),
      recentEntries: [],
      mountRushmore: [],
      counts,
    };
  }

  console.log("[DIARY QUERY] returned rows:", diaryRows?.length ?? 0)

  const recentEntries = (((diaryRows || []) as unknown) as DiaryRow[]).map(mapDiaryRow);

  const entryIds = recentEntries.map((entry) => entry.entryId);
  const likeCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();

  if (entryIds.length > 0) {
    const [{ data: likeRows, error: likeError }] =
      await Promise.all([
        supabase
          .from("diary_entry_likes")
          .select("diary_entry_id")
          .in("diary_entry_id", entryIds),
      ]);

    if (likeError) {
      console.error("[ReelShelf public profile] load entry likes failed", likeError);
    }

    for (const row of likeRows || []) {
      likeCounts.set(
        row.diary_entry_id,
        (likeCounts.get(row.diary_entry_id) || 0) + 1
      );
    }
  }

  const hydratedRecentEntries = recentEntries.map((entry) => ({
    ...entry,
    likeCount: likeCounts.get(entry.entryId) || 0,
    commentCount: commentCounts.get(entry.entryId) || 0,
  }));

  const mountRushmore = [...hydratedRecentEntries]
    .filter((entry) => entry.mediaType === "movie")
    .sort((left, right) => {
      if (left.favourite !== right.favourite) {
        return Number(right.favourite) - Number(left.favourite);
      }

      const leftRating = left.rating ?? -1;
      const rightRating = right.rating ?? -1;

      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }

      return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
    })
    .slice(0, 4);

  const counts = await getFollowCounts(supabase, typedProfileRow.id);

  return {
    profile: mapProfileRow(typedProfileRow),
    recentEntries: hydratedRecentEntries,
    mountRushmore,
    counts,
  };
}

export async function getDiscoverProfiles(
  supabase: SupabaseClient
): Promise<DiscoverProfileCardData[]> {
  console.log("[PROFILE QUERY] select string:", PROFILE_SELECT);
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .not("username", "is", null)
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(36);

  if (profileError) {
    console.error("[PROFILE QUERY] error:", profileError.message, "| hint:", profileError.hint);
  } else {
    console.log("[PROFILE QUERY] returned fields:", Object.keys(profileRows?.[0] ?? {}));
  }

  if (profileError) {
    console.error("[ReelShelf discover] load profiles failed", profileError);
    return [];
  }

  const typedProfiles = ((profileRows || []) as unknown) as ProfileRow[];

  if (typedProfiles.length === 0) {
    return [];
  }

  const userIds = typedProfiles.map((profile) => profile.id);

  const [{ data: diaryRows, error: diaryError }, { data: followerRows }, { data: followingRows }] =
    await Promise.all([
      supabase
        .from("diary_entries")
        .select(DIARY_SELECT)
        .in("user_id", userIds)
        .order("saved_at", { ascending: false }),
      supabase.from("followers").select("following_id").in("following_id", userIds),
      supabase.from("followers").select("follower_id").in("follower_id", userIds),
    ]);

  if (diaryError) {
    console.error("[ReelShelf discover] load diary previews failed", diaryError);
  }

  console.log("[DIARY QUERY] returned rows:", diaryRows?.length ?? 0)

  const diaryByUser = new Map<string, PublicDiaryEntry[]>();

  for (const row of (((diaryRows || []) as unknown) as (DiaryRow & { user_id: string })[])) {
    const current = diaryByUser.get(row.user_id) || [];
    current.push(mapDiaryRow(row));
    diaryByUser.set(row.user_id, current);
  }

  const followerCounts = new Map<string, number>();
  for (const row of followerRows || []) {
    followerCounts.set(
      row.following_id,
      (followerCounts.get(row.following_id) || 0) + 1
    );
  }

  const followingCounts = new Map<string, number>();
  for (const row of followingRows || []) {
    followingCounts.set(
      row.follower_id,
      (followingCounts.get(row.follower_id) || 0) + 1
    );
  }

  return typedProfiles.map((row) => {
    const entries = diaryByUser.get(row.id) || [];
    const mountRushmore = [...entries]
      .filter((entry) => entry.mediaType === "movie")
      .sort((left, right) => {
        if (left.favourite !== right.favourite) {
          return Number(right.favourite) - Number(left.favourite);
        }

        const leftRating = left.rating ?? -1;
        const rightRating = right.rating ?? -1;

        if (rightRating !== leftRating) {
          return rightRating - leftRating;
        }

        return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
      })
      .slice(0, 4);

    return {
      profile: mapProfileRow(row),
      mountRushmore,
      counts: {
        followers: followerCounts.get(row.id) || 0,
        following: followingCounts.get(row.id) || 0,
      },
    } satisfies DiscoverProfileCardData;
  });
}
