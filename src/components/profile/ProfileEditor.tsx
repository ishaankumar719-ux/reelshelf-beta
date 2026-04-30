"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ChangeEvent } from "react"
import { useAuth } from "@/components/AuthProvider"
import { PROFILE_SELECT } from "@/lib/queries"
import { normalizeDisplayName, normalizeUsername } from "@/lib/profile"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import MountRushmoreEditor from "@/src/components/profile/MountRushmoreEditor"
import type { MountRushmoreSlot } from "@/src/types/profile"

interface ProfileEditorProps {
  userId: string
}

type OwnerProfileSettings = {
  id: string
  email: string | null
  created_at: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string
  favourite_film: string
  favourite_series: string
  favourite_book: string
  website_url: string
  is_public: boolean
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return "R"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
}

function validateWebsite(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Use a full http or https URL."
    }
    return null
  } catch {
    return "Enter a valid URL."
  }
}

function getAvatarExtension(file: File) {
  const parts = file.name.split(".")
  const extension = parts[parts.length - 1]?.toLowerCase()
  return extension && extension.length <= 5 ? extension : "jpg"
}

async function uploadAvatar(userId: string, file: File) {
  const supabase = createSupabaseClient()

  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }

  const path = `${userId}/avatar.${getAvatarExtension(file)}`
  console.log("[AVATAR] Uploading avatar to path:", path)
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)

  if (profileError) {
    throw profileError
  }

  console.log("[AVATAR] Public URL:", avatarUrl)
  return avatarUrl
}

export default function ProfileEditor({ userId }: ProfileEditorProps) {
  const router = useRouter()
  const { profile: authProfile } = useAuth()

  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [favouriteFilm, setFavouriteFilm] = useState("")
  const [favouriteSeries, setFavouriteSeries] = useState("")
  const [favouriteBook, setFavouriteBook] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [rushmore, setRushmore] = useState<MountRushmoreSlot[]>([])
  const [originalRushmore, setOriginalRushmore] = useState<MountRushmoreSlot[]>([])
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const [originalUsername, setOriginalUsername] = useState("")
  const [loadedProfile, setLoadedProfile] = useState<OwnerProfileSettings | null>(null)
  const [debugAuthUser, setDebugAuthUser] = useState<{ id: string | null; email: string | null } | null>(null)
  const [debugDiaryCount, setDebugDiaryCount] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createSupabaseClient()

    if (!supabase) {
      setIsBootstrapping(false)
      return
    }

    const client = supabase

    let cancelled = false

    async function load() {
      const [
        { data: authData },
        { data, error },
        { data: rushmoreRows, error: rushmoreError },
        { count: diaryCount, error: diaryCountError },
      ] = await Promise.all([
        client.auth.getUser(),
        (() => {
          console.log("[PROFILE QUERY] select string:", PROFILE_SELECT)
          return client
            .from("profiles")
            .select(PROFILE_SELECT)
            .eq("id", userId)
            .maybeSingle()
        })(),
        client
          .from("mount_rushmore")
          .select("position, media_id, media_type, title, year, poster_path")
          .eq("user_id", userId)
          .order("media_type", { ascending: true })
          .order("position", { ascending: true }),
        client
          .from("diary_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ])

      if (cancelled) return

      if (error || rushmoreError || diaryCountError) {
        setSaveState("error")
        setSaveMessage(error?.message || rushmoreError?.message || diaryCountError?.message || "Could not load your profile settings.")
        setIsBootstrapping(false)
        return
      }

      const settings = (data || {}) as Partial<OwnerProfileSettings>
      const authUser = authData.user
      const loadedUsername = settings.username || authProfile?.username || ""
      console.log("[PROFILE LOAD] row:", data || null)
      console.log("[PROFILE LOAD] error:", "none")
      console.log("[RUSHMORE LOAD] Existing slots:", rushmoreRows || [])
      const normalizedRushmore = ((rushmoreRows || []) as Array<{
        position: 1 | 2 | 3 | 4
        media_id: string | null
        media_type: "movie" | "tv" | "book" | null
        title: string | null
        year: string | null
        poster_path: string | null
      }>).filter(
        (slot): slot is MountRushmoreSlot =>
          slot.position >= 1 &&
          slot.position <= 4 &&
          (slot.media_type === "movie" || slot.media_type === "tv" || slot.media_type === "book") &&
          typeof slot.media_id === "string"
      )

      setLoadedProfile({
        id: settings.id || userId,
        email: settings.email || null,
        created_at: settings.created_at || null,
        username: settings.username || null,
        display_name: settings.display_name || null,
        avatar_url: settings.avatar_url || null,
        bio: settings.bio || "",
        favourite_film: settings.favourite_film || "",
        favourite_series: settings.favourite_series || "",
        favourite_book: settings.favourite_book || "",
        website_url: settings.website_url || "",
        is_public: settings.is_public ?? true,
      })
      setDebugAuthUser({ id: authUser?.id || null, email: authUser?.email || null })
      setDebugDiaryCount(typeof diaryCount === "number" ? diaryCount : 0)
      setUsername(loadedUsername)
      setOriginalUsername(loadedUsername)
      setDisplayName(settings.display_name || authProfile?.displayName || "")
      setAvatarUrl(settings.avatar_url || authProfile?.avatarUrl || null)
      setBio(settings.bio || "")
      setFavouriteFilm(settings.favourite_film || authProfile?.favouriteFilm || "")
      setFavouriteSeries(settings.favourite_series || authProfile?.favouriteSeries || "")
      setFavouriteBook(settings.favourite_book || authProfile?.favouriteBook || "")
      setWebsiteUrl(settings.website_url || "")
      setIsPublic(settings.is_public ?? true)
      setRushmore(normalizedRushmore)
      setOriginalRushmore(normalizedRushmore)
      setIsBootstrapping(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId, authProfile])

  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus("idle")
      return
    }

    const normalized = normalizeUsername(username)

    if (normalized === normalizeUsername(originalUsername)) {
      setUsernameStatus("available")
      return
    }

    const supabase = createSupabaseClient()

    if (!supabase) {
      setUsernameStatus("idle")
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setUsernameStatus("checking")
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalized)
        .neq("id", userId)
        .maybeSingle()

      if (error) {
        setUsernameStatus("idle")
        return
      }

      setUsernameStatus(data ? "taken" : "available")
    }, 500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [username, originalUsername, userId])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  const avatarLabel = displayName.trim() || username.trim() || "ReelShelf"
  const websiteError = validateWebsite(websiteUrl)
  const normalizedUsernameValue = normalizeUsername(username)
  const normalizedDisplayNameValue = normalizeDisplayName(displayName)
  const publicProfileHref = normalizedUsernameValue ? `/u/${encodeURIComponent(normalizedUsernameValue)}` : "/"
  const isEmptyShellProfile = loadedProfile?.username === null && loadedProfile?.display_name === null
  const canSave =
    normalizedUsernameValue.length >= 3 &&
    normalizedDisplayNameValue.length >= 2 &&
    usernameStatus !== "taken" &&
    usernameStatus !== "checking" &&
    !websiteError

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null

    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setSaveState("error")
      setSaveMessage("Avatar uploads must be 5MB or smaller.")
      return
    }

    setSaveState("saving")
    setSaveMessage(null)

    try {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }

      const previewUrl = URL.createObjectURL(file)
      setAvatarPreviewUrl(previewUrl)
      const nextAvatarUrl = await uploadAvatar(userId, file)
      setAvatarUrl(nextAvatarUrl)
      URL.revokeObjectURL(previewUrl)
      setAvatarPreviewUrl(null)
      setLoadedProfile((current) => (current ? { ...current, avatar_url: nextAvatarUrl } : current))
      setSaveState("success")
      setSaveMessage("Avatar updated.")
    } catch (error) {
      console.error("[AVATAR] Error:", error)
      const message = error instanceof Error ? error.message : "Could not upload your avatar."
      setSaveState("error")
      setSaveMessage(message)
    } finally {
      event.target.value = ""
    }
  }

  async function handleSave() {
    if (!canSave) {
      setSaveState("error")
      setSaveMessage("Fix the highlighted profile fields before saving.")
      return
    }

    const supabase = createSupabaseClient()

    if (!supabase) {
      setSaveState("error")
      setSaveMessage("Supabase is not configured.")
      return
    }

    setSaveState("saving")
    setSaveMessage(null)

    try {
      const profilePayload: Record<string, unknown> = {}

      profilePayload.display_name = normalizedDisplayNameValue || null
      profilePayload.username = normalizedUsernameValue || null
      profilePayload.bio = bio.trim() || null
      profilePayload.website_url = websiteUrl.trim() || null
      profilePayload.is_public = isPublic

      console.log(
        "[PROFILE SAVE] payload being sent:",
        JSON.stringify(profilePayload, null, 2)
      )

      const { data: savedProfileRow, error: profileError } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("id", userId)
        .select("id, username, display_name, bio, website_url, is_public, avatar_url")
        .single()

      if (profileError) {
        console.error(
          "[PROFILE SAVE] error:",
          profileError.message,
          "| code:",
          profileError.code,
          "| details:",
          profileError.details,
          "| hint:",
          profileError.hint
        )
        throw profileError
      }
      console.log("[PROFILE SAVE] success, returned row:", savedProfileRow)

      const filledSlots = rushmore.filter((slot) => slot.media_id !== null)
      const removedSlots = originalRushmore.filter(
        (originalSlot) =>
          !filledSlots.find(
            (slot) =>
              slot.position === originalSlot.position &&
              slot.media_type === originalSlot.media_type
          )
      )

      for (const slot of removedSlots) {
        const { error: deleteRushmoreError } = await supabase
          .from("mount_rushmore")
          .delete()
          .eq("user_id", userId)
          .eq("position", slot.position)
          .eq("media_type", slot.media_type)

        if (deleteRushmoreError) {
          console.error("[RUSHMORE SAVE] Error:", deleteRushmoreError)
          throw deleteRushmoreError
        }
      }

      if (filledSlots.length > 0) {
        const { error: upsertRushmoreError } = await supabase.from("mount_rushmore").upsert(
          filledSlots.map((slot) => ({
            user_id: userId,
            position: slot.position,
            media_id: slot.media_id,
            media_type: slot.media_type,
            title: slot.title,
            year: slot.year,
            poster_path: slot.poster_path,
          })),
          { onConflict: "user_id,position,media_type" }
        )

        if (upsertRushmoreError) {
          console.error("[RUSHMORE SAVE] Error:", upsertRushmoreError)
          throw upsertRushmoreError
        }

        console.log("[RUSHMORE SAVE] Saved", filledSlots.length, "slots")
      } else {
        console.log("[RUSHMORE SAVE] Saved", 0, "slots")
      }

      setSaveState("success")
      setSaveMessage("Profile updated.")
      setOriginalUsername(normalizedUsernameValue)
      setOriginalRushmore(rushmore)
      setLoadedProfile((current) =>
        current
          ? {
              ...current,
              username: savedProfileRow.username ?? null,
              display_name: savedProfileRow.display_name ?? null,
              avatar_url: savedProfileRow.avatar_url ?? current.avatar_url,
              bio: savedProfileRow.bio ?? "",
              website_url: savedProfileRow.website_url ?? "",
              is_public: savedProfileRow.is_public,
            }
          : current
      )
      router.push(publicProfileHref)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save your profile."
      setSaveState("error")
      setSaveMessage(message)
    }
  }

  return (
    <section className="mx-auto max-w-[1120px] pb-16">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#0a0b12_0%,#07070c_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/38">Profile settings</p>
            <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em] text-white/92 sm:text-[34px]">Edit profile</h1>
            <p className="mt-3 max-w-[720px] text-sm leading-6 text-white/55">
              Your changes appear on your public profile at {normalizedUsernameValue ? publicProfileHref : "/u/[username]"}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={publicProfileHref}
              className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-[11px] uppercase tracking-[0.16em] text-white/70"
            >
              View profile
            </Link>
            <Link
              href="/import/letterboxd"
              className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-[11px] uppercase tracking-[0.16em] text-white/82"
            >
              Import from Letterboxd
            </Link>
          </div>
        </div>

        {saveMessage ? (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
              saveState === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
                : saveState === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.04] text-white/70"
            }`}
          >
            {saveMessage}
          </div>
        ) : null}

        {isEmptyShellProfile ? (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-100">
            You appear to be signed in with a new account that has no data. If you have an existing account, sign out and sign back in with your original email address.
          </div>
        ) : null}

        {process.env.NODE_ENV === "development" ? (
          <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-4 text-sm leading-6 text-sky-100">
            <p>Auth UID: {debugAuthUser?.id || "(none)"}</p>
            <p>Auth email: {debugAuthUser?.email || "(none)"}</p>
            <p>Profile row id: {loadedProfile?.id || "(none)"}</p>
            <p>Profile username: {loadedProfile?.username ?? "(none)"}</p>
            <p>Profile email: {loadedProfile?.email ?? "(none)"}</p>
            <p>Profile created_at: {loadedProfile?.created_at ?? "(none)"}</p>
            <p>Diary entries owned by this session: {debugDiaryCount ?? 0}</p>
          </div>
        ) : null}

        {isBootstrapping ? (
          <div className="mt-6 rounded-3xl border border-white/8 bg-white/[0.03] px-5 py-10 text-sm text-white/55">
            Loading your profile settings…
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Avatar</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(180deg,#1a2438_0%,#261336_100%)]">
                    {avatarPreviewUrl || avatarUrl ? (
                      <img
                        src={avatarPreviewUrl || avatarUrl || ""}
                        alt={avatarLabel}
                        onError={(event) => {
                          event.currentTarget.style.display = "none"
                          event.currentTarget.nextElementSibling?.removeAttribute("style")
                        }}
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "9999px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : null}
                    <div
                      className="h-full w-full items-center justify-center text-lg font-semibold text-white/90"
                      style={{ display: avatarPreviewUrl || avatarUrl ? "none" : "flex" }}
                    >
                      {getInitials(avatarLabel)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/82">
                      Change photo
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-white/42">JPG, PNG, or WebP up to 5MB.</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Profile actions</p>
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saveState === "saving"}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-[11px] font-medium uppercase tracking-[0.18em] text-black disabled:opacity-60"
                  >
                    {saveState === "saving" ? "Saving…" : "Save changes"}
                  </button>
                  <Link
                    href={publicProfileHref}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-[11px] uppercase tracking-[0.18em] text-white/78"
                  >
                    Cancel
                  </Link>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Identity</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">Display name</span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value.slice(0, 50))}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0c0d14] px-4 text-sm text-white outline-none placeholder:text-white/25"
                      placeholder="Your display name"
                    />
                    <span className="mt-2 block text-right text-[11px] text-white/32">{displayName.length}/50</span>
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">Username</span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(normalizeUsername(event.target.value).slice(0, 30))}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0c0d14] px-4 text-sm text-white outline-none placeholder:text-white/25"
                      placeholder="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <span className="mt-2 block text-[11px] text-white/34">
                      {usernameStatus === "checking"
                        ? "Checking availability…"
                        : usernameStatus === "taken"
                          ? "That username is already taken."
                          : usernameStatus === "available" && username.trim()
                            ? "Username available."
                            : "3–30 characters, lowercase letters, numbers, and underscores."}
                    </span>
                  </label>
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">Bio</span>
                    <textarea
                      value={bio}
                      onChange={(event) => setBio(event.target.value.slice(0, 200))}
                      rows={4}
                      className="mt-2 w-full rounded-[22px] border border-white/10 bg-[#0c0d14] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25"
                      placeholder="Give your shelf a little personality."
                    />
                    <span className="mt-2 block text-right text-[11px] text-white/32">{bio.length}/200</span>
                  </label>

                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">Website / social link</span>
                    <input
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0c0d14] px-4 text-sm text-white outline-none placeholder:text-white/25"
                      placeholder="https://"
                    />
                    <span className={`mt-2 block text-[11px] ${websiteError ? "text-rose-200" : "text-white/32"}`}>
                      {websiteError || "Optional. Add one place people can find you."}
                    </span>
                  </label>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Shelf details</p>
                <p className="mt-2 max-w-[640px] text-sm leading-6 text-white/50">
                  These favourite picks help shape your public profile whenever your Mount Rushmore is still empty.
                </p>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">Favourite film</span>
                    <input
                      value={favouriteFilm}
                      onChange={(event) => setFavouriteFilm(event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0c0d14] px-4 text-sm text-white outline-none placeholder:text-white/25"
                      placeholder="Interstellar"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">Favourite series</span>
                    <input
                      value={favouriteSeries}
                      onChange={(event) => setFavouriteSeries(event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0c0d14] px-4 text-sm text-white outline-none placeholder:text-white/25"
                      placeholder="Succession"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/40">Favourite book</span>
                    <input
                      value={favouriteBook}
                      onChange={(event) => setFavouriteBook(event.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0c0d14] px-4 text-sm text-white outline-none placeholder:text-white/25"
                      placeholder="Dune"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Mount Rushmore</p>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      Pick four defining films, series, or books. Each tab saves independently, so your top 4 in one category never overwrites another.
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <MountRushmoreEditor initialSlots={rushmore} onChange={setRushmore} />
                </div>
              </section>

              <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Privacy</p>
                <div className="mt-4 flex flex-col gap-4 rounded-[22px] border border-white/8 bg-[#0b0c12] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/86">{isPublic ? "Public profile" : "Private profile"}</p>
                    <p className="mt-1 text-sm leading-6 text-white/48">
                      Private profiles stay out of discovery and username search. Your public link still updates here when you are ready to share it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic((current) => !current)}
                    className={`inline-flex h-11 items-center rounded-full px-5 text-[11px] uppercase tracking-[0.18em] ${
                      isPublic ? "bg-white text-black" : "border border-white/10 bg-white/[0.04] text-white/82"
                    }`}
                  >
                    {isPublic ? "Set private" : "Set public"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
