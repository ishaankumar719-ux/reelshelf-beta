"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ChangeEvent } from "react"
import { useAuth } from "@/components/AuthProvider"
import { normalizeDisplayName, normalizeUsername } from "@/lib/profile"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import MountRushmoreEditor from "@/src/components/profile/MountRushmoreEditor"
import type { MountRushmoreSlot } from "@/src/types/profile"

interface ProfileEditorProps {
  userId: string
}

type OwnerProfileSettings = {
  username: string
  display_name: string
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

function emptyRushmoreSlots(): MountRushmoreSlot[] {
  return [1, 2, 3, 4].map((position) => ({
    position: position as 1 | 2 | 3 | 4,
    media_id: null,
    media_type: null,
    title: null,
    year: null,
    poster_path: null,
  }))
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
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export default function ProfileEditor({ userId }: ProfileEditorProps) {
  const router = useRouter()
  const { profile: authProfile } = useAuth()
  const profileUsername = authProfile?.username || ""

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [rushmore, setRushmore] = useState<MountRushmoreSlot[]>(emptyRushmoreSlots)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const [originalUsername, setOriginalUsername] = useState("")

  useEffect(() => {
    const supabase = createSupabaseClient()

    if (!supabase) {
      setIsBootstrapping(false)
      return
    }

    const client = supabase

    let cancelled = false

    async function load() {
      const [{ data, error }, { data: rushmoreRows, error: rushmoreError }] = await Promise.all([
        client
          .from("profiles")
          .select("username, display_name, avatar_url, bio, favourite_film, favourite_series, favourite_book, website_url, is_public")
          .eq("id", userId)
          .maybeSingle(),
        client
          .from("mount_rushmore")
          .select("position, media_id, media_type, title, year, poster_path")
          .eq("user_id", userId)
          .order("position", { ascending: true }),
      ])

      if (cancelled) return

      if (error || rushmoreError) {
        setSaveState("error")
        setSaveMessage(error?.message || rushmoreError?.message || "Could not load your profile settings.")
        setIsBootstrapping(false)
        return
      }

      const settings = (data || {}) as Partial<OwnerProfileSettings>
      const loadedUsername = settings.username || authProfile?.username || ""

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
      setRushmore(
        emptyRushmoreSlots().map((slot) => {
          const existing = (rushmoreRows || []).find((row) => row.position === slot.position)
          return existing
            ? {
                position: slot.position,
                media_id: existing.media_id,
                media_type: existing.media_type,
                title: existing.title,
                year: existing.year,
                poster_path: existing.poster_path,
              }
            : slot
        })
      )
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

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    setAvatarFile(file)
    setAvatarPreviewUrl(previewUrl)
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
      const finalAvatarUrl = avatarFile ? await uploadAvatar(userId, avatarFile) : avatarUrl

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        username: normalizedUsernameValue,
        display_name: normalizedDisplayNameValue || null,
        avatar_url: finalAvatarUrl,
        bio: bio.trim() || null,
        favourite_film: favouriteFilm.trim() || null,
        favourite_series: favouriteSeries.trim() || null,
        favourite_book: favouriteBook.trim() || null,
        website_url: websiteUrl.trim() || null,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        throw profileError
      }

      const { error: upsertRushmoreError } = await supabase.from("mount_rushmore").upsert(
        rushmore.map((slot) => ({
          user_id: userId,
          position: slot.position,
          media_id: slot.media_id,
          media_type: slot.media_type,
          title: slot.title,
          year: slot.year,
          poster_path: slot.poster_path,
        })),
        { onConflict: "user_id,position" }
      )

      if (upsertRushmoreError) {
        throw upsertRushmoreError
      }

      setSaveState("success")
      setSaveMessage("Profile updated.")
      router.push(`/u/${encodeURIComponent(normalizedUsernameValue)}`)
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
            <h1 className="mt-3 text-[28px] font-medium tracking-[-0.03em] text-white/92 sm:text-[34px]">
              Shape your ReelShelf identity
            </h1>
            <p className="mt-3 max-w-[720px] text-sm leading-6 text-white/55">
              Keep the editing experience private and functional here. Your public shelf stays cinematic on the showcase route.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={profileUsername ? `/u/${encodeURIComponent(profileUsername)}` : "/"}
              className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-[11px] uppercase tracking-[0.16em] text-white/70"
            >
              Cancel
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
                      <Image
                        src={avatarPreviewUrl || avatarUrl || ""}
                        alt={avatarLabel}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/90">
                        {getInitials(avatarLabel)}
                      </div>
                    )}
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
                    href={profileUsername ? `/u/${encodeURIComponent(profileUsername)}` : "/"}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-5 text-[11px] uppercase tracking-[0.18em] text-white/78"
                  >
                    View showcase
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
                      onChange={(event) => setUsername(event.target.value.slice(0, 30))}
                      className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0c0d14] px-4 text-sm text-white outline-none placeholder:text-white/25"
                      placeholder="username"
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
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
                      Pick four defining films or series. Posters, title, year, and TMDB metadata fill automatically when you select a result.
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
                      Private shelves stay out of discovery. Followers can still keep up with your profile if they already know it.
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
