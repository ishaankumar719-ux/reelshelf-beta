import { getMediaHref } from "./mediaRoutes";
import type { MediaType } from "./media";
import { normalizeMountRushmore, type UserProfile } from "./profile";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFollowCounts } from "./follows";

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
  savedAt: string;
  href: string;
  likeCount: number;
  commentCount: number;
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
  favourite_film: string | null;
  favourite_series: string | null;
  favourite_book: string | null;
  movie_mount_rushmore: unknown;
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
  saved_at: string;
};

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: null,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    favouriteFilm: row.favourite_film,
    favouriteSeries: row.favourite_series,
    favouriteBook: row.favourite_book,
    movieMountRushmore: normalizeMountRushmore(row.movie_mount_rushmore),
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
    savedAt: row.saved_at,
    href: getMediaHref({ id: row.media_id, mediaType: row.media_type }),
    likeCount: 0,
    commentCount: 0,
  };
}

export async function getPublicProfileByUsername(
  supabase: SupabaseClient,
  username: string,
  _viewerUserId?: string | null
): Promise<PublicProfileData | null> {
  const normalizedUsername = username.trim().toLowerCase();

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, favourite_film, favourite_series, favourite_book, movie_mount_rushmore"
    )
    .eq("username", normalizedUsername)
    .maybeSingle();

  if (profileError) {
    console.error("[ReelShelf public profile] load profile failed", profileError);
    return null;
  }

  if (!profileRow) {
    return null;
  }

  const { data: diaryRows, error: diaryError } = await supabase
    .from("diary_entries")
    .select(
      "id, media_id, media_type, title, poster, year, creator, rating, review, watched_date, favourite, saved_at"
    )
    .eq("user_id", profileRow.id)
    .order("saved_at", { ascending: false })
    .limit(12);

  if (diaryError) {
    console.error("[ReelShelf public profile] load diary failed", diaryError);
    const counts = await getFollowCounts(supabase, profileRow.id);
    return {
      profile: mapProfileRow(profileRow as ProfileRow),
      recentEntries: [],
      mountRushmore: [],
      counts,
    };
  }

  const recentEntries = ((diaryRows || []) as DiaryRow[]).map(mapDiaryRow);

  const entryIds = recentEntries.map((entry) => entry.entryId);
  const likeCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();

  if (entryIds.length > 0) {
    const [{ data: likeRows, error: likeError }, { data: commentRows, error: commentError }] =
      await Promise.all([
        supabase
          .from("diary_entry_likes")
          .select("diary_entry_id")
          .in("diary_entry_id", entryIds),
        supabase
          .from("diary_entry_comments")
          .select("diary_entry_id")
          .in("diary_entry_id", entryIds),
      ]);

    if (likeError) {
      console.error("[ReelShelf public profile] load entry likes failed", likeError);
    }

    if (commentError) {
      console.error(
        "[ReelShelf public profile] load entry comments failed",
        commentError
      );
    }

    for (const row of likeRows || []) {
      likeCounts.set(
        row.diary_entry_id,
        (likeCounts.get(row.diary_entry_id) || 0) + 1
      );
    }

    for (const row of commentRows || []) {
      commentCounts.set(
        row.diary_entry_id,
        (commentCounts.get(row.diary_entry_id) || 0) + 1
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

  const counts = await getFollowCounts(supabase, profileRow.id);

  return {
    profile: mapProfileRow(profileRow as ProfileRow),
    recentEntries: hydratedRecentEntries,
    mountRushmore,
    counts,
  };
}

export async function getDiscoverProfiles(
  supabase: SupabaseClient
): Promise<DiscoverProfileCardData[]> {
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, favourite_film, favourite_series, favourite_book, movie_mount_rushmore"
    )
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    .limit(36);

  if (profileError) {
    console.error("[ReelShelf discover] load profiles failed", profileError);
    return [];
  }

  const typedProfiles = (profileRows || []) as ProfileRow[];

  if (typedProfiles.length === 0) {
    return [];
  }

  const userIds = typedProfiles.map((profile) => profile.id);

  const [{ data: diaryRows, error: diaryError }, { data: followerRows }, { data: followingRows }] =
    await Promise.all([
      supabase
        .from("diary_entries")
        .select(
          "id, user_id, media_id, media_type, title, poster, year, creator, rating, review, watched_date, favourite, saved_at"
        )
        .in("user_id", userIds)
        .order("saved_at", { ascending: false }),
      supabase.from("followers").select("following_id").in("following_id", userIds),
      supabase.from("followers").select("follower_id").in("follower_id", userIds),
    ]);

  if (diaryError) {
    console.error("[ReelShelf discover] load diary previews failed", diaryError);
  }

  const diaryByUser = new Map<string, PublicDiaryEntry[]>();

  for (const row of ((diaryRows || []) as (DiaryRow & { user_id: string })[])) {
    const current = diaryByUser.get(row.user_id) || [];
    current.push(
      mapDiaryRow({
        id: row.id,
        media_id: row.media_id,
        media_type: row.media_type,
        title: row.title,
        poster: row.poster,
        year: row.year,
        creator: row.creator,
        rating: row.rating,
        review: row.review,
        watched_date: row.watched_date,
        favourite: row.favourite,
        saved_at: row.saved_at,
      })
    );
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
