"use client"

import { useEffect, useState } from "react"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { normalizeUsername } from "@/lib/profile"
import { DIARY_SELECT } from "@/lib/queries"
import type {
  ActivityItem,
  MediaShelfItem,
  MountRushmoreSlot,
  ProfileData,
} from "@/src/types/profile"

type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_public: boolean | null
  created_at: string
}

type MountRushmoreRow = {
  position: number
  media_id: number
  media_type: "film" | "series"
  title: string
  year: string | null
  poster_path: string | null
}

type DiaryRow = {
  id: string
  media_id: string
  media_type: "movie" | "tv" | "book"
  review_scope: "title" | "show" | "season" | "episode"
  title: string
  poster: string | null
  rating: number | null
  review: string
  favourite: boolean
  saved_at: string
}

function emptyRushmore(): MountRushmoreSlot[] {
  return [1, 2, 3, 4].map((position) => ({
    position: position as 1 | 2 | 3 | 4,
    media_id: null,
    media_type: null,
    title: null,
    year: null,
    poster_path: null,
  }))
}

function extractNumericMediaId(value: string) {
  const direct = Number(value)

  if (Number.isFinite(direct) && direct > 0) {
    return direct
  }

  const match = value.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function mapMediaType(value: DiaryRow["media_type"]): ActivityItem["media_type"] {
  if (value === "movie") return "film"
  if (value === "tv") return "series"
  return "book"
}

function getActivityAction(row: DiaryRow): ActivityItem["action"] {
  if ((row.review || "").trim()) {
    return "reviewed"
  }

  if (row.media_type === "book") {
    return "reading"
  }

  return "watched"
}

function toPosterPath(value: string | null) {
  if (!value) return null

  if (value.startsWith("http")) {
    const match = value.match(/\/t\/p\/(?:w\d+|original)(\/.+)$/)
    return match?.[1] ?? value
  }

  return value
}

export function useProfileData(username: string): {
  profile: ProfileData | null
  isLoading: boolean
  error: string | null
} {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const normalized = normalizeUsername(username || "")

      if (!normalized) {
        if (!cancelled) {
          setProfile(null)
          setError(null)
          setIsLoading(false)
        }
        return
      }

      const supabase = createSupabaseClient()

      if (!supabase) {
        if (!cancelled) {
          setProfile(null)
          setError("Supabase is not configured.")
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, is_public, created_at")
        .eq("username", normalized)
        .maybeSingle()

      if (profileError) {
        if (!cancelled) {
          setProfile(null)
          setError(profileError.message || "Could not load profile.")
          setIsLoading(false)
        }
        return
      }

      if (!profileRow) {
        if (!cancelled) {
          setProfile(null)
          setError("Profile not found.")
          setIsLoading(false)
        }
        return
      }

      const typedProfile = profileRow as ProfileRow
      const isOwner = user?.id === typedProfile.id

      let isFollower = false

      if (!typedProfile.is_public && !isOwner && user?.id) {
        const { data: followRow } = await supabase
          .from("followers")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", typedProfile.id)
          .maybeSingle()

        isFollower = Boolean(followRow)
      }

      if (!typedProfile.is_public && !isOwner && !isFollower) {
        if (!cancelled) {
          setProfile(null)
          setError("This profile is private.")
          setIsLoading(false)
        }
        return
      }

      const [
        { data: rushmoreRows, error: rushmoreError },
        { data: diaryRows, error: diaryError },
        { count: followersCount, error: followersError },
        { count: followingCount, error: followingError },
      ] = await Promise.all([
        supabase
          .from("mount_rushmore")
          .select("position, media_id, media_type, title, year, poster_path")
          .eq("user_id", typedProfile.id)
          .order("position", { ascending: true }),
        supabase
          .from("diary_entries")
          .select(DIARY_SELECT)
          .eq("user_id", typedProfile.id)
          .order("saved_at", { ascending: false })
          .limit(48),
        supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", typedProfile.id),
        supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", typedProfile.id),
      ])

      if (rushmoreError || diaryError || followersError || followingError) {
        if (!cancelled) {
          setProfile(null)
          setError(
            rushmoreError?.message ||
              diaryError?.message ||
              followersError?.message ||
              followingError?.message ||
              "Could not load profile details."
          )
          setIsLoading(false)
        }
        return
      }

      const rushmore = emptyRushmore()

      for (const row of (rushmoreRows || []) as MountRushmoreRow[]) {
        if (row.position >= 1 && row.position <= 4) {
          rushmore[row.position - 1] = {
            position: row.position as 1 | 2 | 3 | 4,
            media_id: row.media_id,
            media_type: row.media_type,
            title: row.title,
            year: row.year,
            poster_path: row.poster_path,
          }
        }
      }

      const activityRows = (((diaryRows || []) as unknown) as DiaryRow[])
      const recentActivity: ActivityItem[] = activityRows.slice(0, 8).map((row) => ({
        id: row.id,
        media_id: extractNumericMediaId(row.media_id),
        media_type: mapMediaType(row.media_type),
        title: row.title,
        poster_path: toPosterPath(row.poster),
        action: getActivityAction(row),
        rating: typeof row.rating === "number" ? row.rating : null,
        logged_at: row.saved_at,
      }))

      const favouriteShelf: MediaShelfItem[] = activityRows
        .filter((row) => row.favourite)
        .slice(0, 12)
        .map((row) => ({
          media_id: extractNumericMediaId(row.media_id),
          media_type: mapMediaType(row.media_type),
          title: row.title,
          poster_path: toPosterPath(row.poster),
        }))

      const filmsWatched = activityRows.filter((row) => row.media_type === "movie").length
      const seriesWatched = new Set(
        activityRows
          .filter((row) => row.media_type === "tv" && row.review_scope === "show")
          .map((row) => row.media_id)
      ).size
      const booksRead = activityRows.filter((row) => row.media_type === "book").length
      const reviewsWritten = activityRows.filter((row) => (row.review || "").trim().length > 0).length

      if (!cancelled) {
        setProfile({
          id: typedProfile.id,
          username: typedProfile.username || normalized,
          display_name: typedProfile.display_name,
          avatar_url: typedProfile.avatar_url,
          bio: typedProfile.bio,
          is_public: typedProfile.is_public ?? true,
          created_at: typedProfile.created_at,
          stats: {
            films_watched: filmsWatched,
            series_watched: seriesWatched,
            books_read: booksRead,
            reviews_written: reviewsWritten,
            following_count: followingCount || 0,
            followers_count: followersCount || 0,
          },
          mount_rushmore: rushmore,
          recent_activity: recentActivity,
          favourite_shelf: favouriteShelf,
        })
        setError(null)
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [username])

  return { profile, isLoading, error }
}
