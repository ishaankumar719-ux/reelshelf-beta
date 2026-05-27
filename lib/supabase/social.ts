"use client";

import { createClient as createSupabaseBrowserClient } from "./client";
import { getMediaHref } from "../mediaRoutes";
import type { MediaType } from "../media";
import { getDiaryMovies, type DiaryMovie } from "../diary";
import { getPublicProfileHref } from "../profile";
import { DIARY_SELECT } from "../queries";

const FOLLOW_EVENT = "reelshelf:follows-updated";

// TMDB poster_path values are relative (e.g. "/abc.jpg"). Book/other covers are absolute.
function resolveTmdbPoster(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `https://image.tmdb.org/t/p/w342${raw}`;
}

export type FriendsActivityEntry = {
  profileId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  id: string;
  mediaType: MediaType;
  title: string;
  poster: string | null;
  year: number;
  creator: string | null;
  reviewScope?: "title" | "show" | "season" | "episode";
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  rating: number | null;
  review: string;
  watchedDate: string | null;
  watchedInCinema: boolean;
  savedAt: string;
  href: string;
};

export type SuggestedProfile = {
  profileId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followers: number;
  following: number;
  href: string;
  featuredFilm: string | null;
  reason: string;
  mountRushmore: Array<{
    id: string;
    title: string;
    poster: string | null;
    href: string;
  }>;
};

type SuggestionProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  favourite_film: string | null;
  updated_at: string;
};

type SuggestionDiaryRow = {
  user_id: string;
  media_id: string;
  media_type: MediaType;
  title: string;
  poster: string | null;
  creator: string | null;
  genres: string[] | null;
  rating: number | null;
  favourite: boolean;
  saved_at: string;
};

async function getCurrentUserId() {
  const client = createSupabaseBrowserClient();

  if (!client) {
    return null;
  }

  // Use getSession (local cache) — avoids a server round-trip that can fail
  // during initial hydration before the JWT refresh completes.
  const {
    data: { session },
  } = await client.auth.getSession();

  return session?.user.id || null;
}

function notifyFollowListeners() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(FOLLOW_EVENT));
}

export async function followProfile(targetUserId: string) {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId) {
    return { error: "You need to sign in to follow profiles." };
  }

  const { error } = await client.from("followers").insert({
    follower_id: currentUserId,
    following_id: targetUserId,
  });

  if (error && error.code !== "23505") {
    console.error("[ReelShelf follows] follow failed", error);
    return { error: error.message || "Could not follow this profile." };
  }

  notifyFollowListeners();
  return { error: null };
}

export async function unfollowProfile(targetUserId: string) {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId) {
    return { error: "You need to sign in to unfollow profiles." };
  }

  const { error } = await client
    .from("followers")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId);

  if (error) {
    console.error("[ReelShelf follows] unfollow failed", error);
    return { error: error.message || "Could not unfollow this profile." };
  }

  notifyFollowListeners();
  return { error: null };
}

export function subscribeToFollows(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(FOLLOW_EVENT, listener);
  return () => window.removeEventListener(FOLLOW_EVENT, listener);
}

function getTopTasteEntries(entries: DiaryMovie[]) {
  return [...entries]
    .filter(
      (entry) =>
        entry.favourite ||
        (typeof entry.rating === "number" && entry.rating >= 7.5)
    )
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
    });
}

function getReasonForSuggestion(input: {
  overlapFilmTitle: string | null;
  overlapCreator: string | null;
  overlapGenre: string | null;
  recentTitle: string | null;
  hasMountRushmore: boolean;
}) {
  if (input.overlapFilmTitle) {
    return `Because you both love ${input.overlapFilmTitle}`;
  }

  if (input.overlapCreator) {
    return `Shares your taste for ${input.overlapCreator}`;
  }

  if (input.overlapGenre) {
    return `Often logs ${input.overlapGenre.toLowerCase()} picks you tend to rate highly`;
  }

  if (input.recentTitle) {
    return `Active shelf recently logging ${input.recentTitle}`;
  }

  if (input.hasMountRushmore) {
    return "A strong public shelf with a defined Mount Rushmore";
  }

  return "An active public ReelShelf worth following";
}

function getDaysAgo(date: string) {
  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

export async function getPeopleToFollow(limit = 6) {
  const client = createSupabaseBrowserClient();
  const currentUserId = await getCurrentUserId();

  if (!client || !currentUserId) {
    return [] as SuggestedProfile[];
  }

  const [currentDiaryEntries, followingResponse, profilesResponse] = await Promise.all([
    Promise.resolve(getDiaryMovies()),
    client
      .from("followers")
      .select("following_id")
      .eq("follower_id", currentUserId),
    client
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, favourite_film, updated_at"
      )
      .not("username", "is", null)
      .order("updated_at", { ascending: false })
      .limit(48),
  ]);

  if (followingResponse.error) {
    console.error(
      "[ReelShelf follows] load following for suggestions failed",
      followingResponse.error
    );
    return [];
  }

  if (profilesResponse.error) {
    console.error(
      "[ReelShelf follows] load suggestion profiles failed",
      profilesResponse.error
    );
    return [];
  }

  const followingIds = new Set(
    (followingResponse.data || []).map((row) => row.following_id).filter(Boolean)
  );
  followingIds.add(currentUserId);

  const candidateProfiles = ((profilesResponse.data || []) as SuggestionProfileRow[]).filter(
    (profile) => profile.username && !followingIds.has(profile.id)
  );

  if (candidateProfiles.length === 0) {
    return [];
  }

  const candidateIds = candidateProfiles.map((profile) => profile.id);

  const [candidateDiaryResponse, followerCountsResponse, followingCountsResponse, mountRushmoreResponse] =
    await Promise.all([
      client
        .from("diary_entries")
        .select(DIARY_SELECT)
        .in("user_id", candidateIds)
        .order("saved_at", { ascending: false })
        .limit(360),
      client.from("followers").select("following_id").in("following_id", candidateIds),
      client.from("followers").select("follower_id").in("follower_id", candidateIds),
      client
        .from("mount_rushmore")
        .select("user_id,position,media_id,title,poster_path")
        .in("user_id", candidateIds)
        .eq("media_type", "movie")
        .order("position", { ascending: true }),
    ]);

  if (candidateDiaryResponse.error) {
    console.error(
      "[ReelShelf follows] load suggestion diary failed",
      candidateDiaryResponse.error
    );
  }

  const diaryRows = ((candidateDiaryResponse.data || []) as unknown) as SuggestionDiaryRow[];
  const diaryByUser = new Map<string, SuggestionDiaryRow[]>();

  for (const row of diaryRows) {
    const current = diaryByUser.get(row.user_id) || [];
    current.push(row);
    diaryByUser.set(row.user_id, current);
  }

  // Build mount rushmore map from the real table (movie only, ordered by position)
  type SuggestionMrRow = { user_id: string; position: number; media_id: string; title: string; poster_path: string | null };
  const mrRows = ((mountRushmoreResponse.data || []) as unknown) as SuggestionMrRow[];
  const mrByUser = new Map<string, SuggestionMrRow[]>();
  for (const row of mrRows) {
    const current = mrByUser.get(row.user_id) || [];
    current.push(row);
    mrByUser.set(row.user_id, current);
  }

  const followerCounts = new Map<string, number>();
  for (const row of followerCountsResponse.data || []) {
    followerCounts.set(
      row.following_id,
      (followerCounts.get(row.following_id) || 0) + 1
    );
  }

  const followingCounts = new Map<string, number>();
  for (const row of followingCountsResponse.data || []) {
    followingCounts.set(
      row.follower_id,
      (followingCounts.get(row.follower_id) || 0) + 1
    );
  }

  const topTaste = getTopTasteEntries(currentDiaryEntries);
  const topMovieIds = new Set(
    topTaste.filter((entry) => entry.mediaType === "movie").map((entry) => entry.id)
  );
  const creatorSet = new Set(
    topTaste.map((entry) => entry.director?.trim()).filter(Boolean) as string[]
  );
  const genreSet = new Set(
    topTaste.flatMap((entry) => entry.genres || []).map((genre) => genre.trim()).filter(Boolean)
  );

  const suggestions = candidateProfiles.map((profile) => {
    const entries = diaryByUser.get(profile.id) || [];
    // Use real mount rushmore data (already filtered to movie, ordered by position)
    const mrEntries = mrByUser.get(profile.id) || [];

    const overlapFilm = mrEntries.find((entry) => topMovieIds.has(entry.media_id));

    const overlapCreator = entries.find((entry) => {
      const creator = entry.creator?.trim();
      return creator ? creatorSet.has(creator) : false;
    });

    const overlapGenre = entries.find((entry) =>
      (entry.genres || []).some((genre) => genreSet.has(genre.trim()))
    );

    const recentEntry = entries[0];
    const followers = followerCounts.get(profile.id) || 0;
    const following = followingCounts.get(profile.id) || 0;
    const daysAgo = getDaysAgo(recentEntry?.saved_at || profile.updated_at);
    const recencyScore =
      daysAgo <= 1 ? 10 : daysAgo <= 7 ? 7 : daysAgo <= 30 ? 4 : 1;
    const overlapFilmScore = overlapFilm ? 48 : 0;
    const creatorScore = overlapCreator ? 16 : 0;
    const genreScore = overlapGenre ? 10 : 0;
    const mountRushmoreScore = mrEntries.length * 2;
    const followerScore = Math.min(followers, 18);
    const score =
      overlapFilmScore +
      creatorScore +
      genreScore +
      mountRushmoreScore +
      recencyScore +
      followerScore;

    return {
      profileId: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      followers,
      following,
      href: profile.username ? getPublicProfileHref(profile.username) : "/discover",
      featuredFilm: profile.favourite_film || mrEntries[0]?.title || null,
      reason: getReasonForSuggestion({
        overlapFilmTitle: overlapFilm?.title || null,
        overlapCreator: overlapCreator?.creator || null,
        overlapGenre: overlapGenre?.genres?.find((genre) =>
          genreSet.has(genre.trim())
        ) || null,
        recentTitle: recentEntry?.title || null,
        hasMountRushmore: mrEntries.length > 0,
      }),
      mountRushmore: mrEntries.map((entry) => ({
        id: entry.media_id,
        title: entry.title,
        poster: resolveTmdbPoster(entry.poster_path),
        href: getMediaHref({ id: entry.media_id, mediaType: "movie" }),
      })),
      score,
    };
  });

  return suggestions
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.followers !== left.followers) {
        return right.followers - left.followers;
      }

      return (right.mountRushmore.length || 0) - (left.mountRushmore.length || 0);
    })
    .slice(0, limit)
    .map(({ score, ...suggestion }) => suggestion);
}

export type FriendsActivityResult = {
  entries: FriendsActivityEntry[];
  hasFollows: boolean;
};

// userId param bypasses the async auth lookup — pass it directly from the component
// where the user object is already resolved, avoiding SSR/hydration timing races.
export async function getFriendsActivity(userId?: string | null): Promise<FriendsActivityResult> {
  const client = createSupabaseBrowserClient();

  // Fall back to session lookup only if caller didn't supply the id
  const currentUserId = userId || (await getCurrentUserId());

  if (!client || !currentUserId) {
    return { entries: [], hasFollows: false };
  }

  const { data: followRows, error: followError } = await client
    .from("followers")
    .select("following_id")
    .eq("follower_id", currentUserId);

  if (followError) {
    console.error("[FRIENDS_ACTIVITY] follow query error:", followError.message, followError);
    return { entries: [], hasFollows: false };
  }

  const followedIds = (followRows || []).map((row) => row.following_id).filter(Boolean);


  if (followedIds.length === 0) {
    return { entries: [], hasFollows: false };
  }

  const [{ data: diaryRows, error: diaryError }, { data: profileRows, error: profileError }] =
    await Promise.all([
      client
        .from("diary_entries")
        .select(DIARY_SELECT)
        .in("user_id", followedIds)
        .order("saved_at", { ascending: false })
        .limit(24),
      client
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", followedIds),
    ]);

  if (diaryError) {
    console.error("[FRIENDS_ACTIVITY] diary query error:", diaryError.message, diaryError);
    return { entries: [], hasFollows: true };
  }

  if (profileError) {
    console.error("[FRIENDS_ACTIVITY] profile query error:", profileError.message, profileError);
    return { entries: [], hasFollows: true };
  }

  const profileMap = new Map(
    (profileRows || []).map((row) => [
      row.id,
      {
        username: row.username ?? null,
        displayName: row.display_name ?? null,
        avatarUrl: row.avatar_url ?? null,
      },
    ])
  );

  const entries = (((diaryRows || []) as unknown) as Array<{
    user_id: string;
    media_id: string;
    media_type: MediaType;
    review_scope?: "title" | "show" | "season" | "episode";
    season_number?: number | null;
    episode_number?: number | null;
    title: string;
    poster: string | null;
    year: number;
    creator: string | null;
    rating: number | string | null;
    review: string | null;
    watched_date: string | null;
    watched_in_cinema: boolean | null;
    saved_at: string;
  }>).map((row) => {
    const owner = profileMap.get(row.user_id);

    return {
      profileId: row.user_id,
      username: owner?.username ?? null,
      displayName: owner?.displayName ?? null,
      avatarUrl: owner?.avatarUrl ?? null,
      id: row.media_id,
      mediaType: row.media_type as MediaType,
      title: row.title,
      poster: resolveTmdbPoster(row.poster ?? null),
      year: Number(row.year) || 0,
      creator: row.creator ?? null,
      reviewScope: row.review_scope ?? "title",
      seasonNumber: row.season_number ?? null,
      episodeNumber: row.episode_number ?? null,
      // rating is stored as a numeric string in Postgres ("9.5") — coerce to number
      rating: row.rating != null ? Number(row.rating) : null,
      review: row.review || "",
      watchedDate: row.watched_date ?? null,
      watchedInCinema: Boolean(row.watched_in_cinema),
      savedAt: row.saved_at,
      href: getMediaHref({
        id: row.media_id,
        mediaType: row.media_type as MediaType,
      }),
    } satisfies FriendsActivityEntry;
  });

  return { entries, hasFollows: true };
}
