"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient as createSupabaseBrowserClient } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/config";
import type { UserProfile } from "../lib/profile";
import {
  getProfileDisplayName,
  getProfileHandle,
  isProfileComplete,
  normalizeDisplayName,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from "../lib/profile";
import type { MountRushmoreMovie } from "../lib/profile";
import {
  clearDiaryDataForSignOut,
  syncDiaryWithBackend,
} from "../lib/diary";
import {
  clearWatchlistDataForSignOut,
  syncWatchlistWithBackend,
} from "../lib/watchlist";
import { PROFILE_SELECT } from "../lib/queries";
import ProfileSetupModal from "./ProfileSetupModal";

type SaveProfileValues = {
  username: string;
  displayName: string;
  avatarFile: File | null;
};

type SaveProfileDetailsValues = {
  bio: string;
  favouriteFilm: string;
  favouriteSeries: string;
  favouriteBook: string;
  movieMountRushmore: MountRushmoreMovie[];
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  needsProfileCompletion: boolean;
  loading: boolean;
  configured: boolean;
  syncing: boolean;
  saveProfileIdentity: (values: SaveProfileValues) => Promise<string | null>;
  saveProfileDetails: (values: SaveProfileDetailsValues) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  displayName: null,
  handle: null,
  avatarUrl: null,
  needsProfileCompletion: false,
  loading: true,
  configured: false,
  syncing: false,
  saveProfileIdentity: async () => null,
  saveProfileDetails: async () => null,
  signOut: async () => {},
});

async function syncAllUserData() {
  await Promise.all([syncDiaryWithBackend(), syncWatchlistWithBackend()]);
}

async function fetchProfileForUser(user: User | null) {
  const client = createSupabaseBrowserClient();

  if (!client || !user) {
    return {
      profile: null,
      error: null,
    } as const;
  }

  console.log("[PROFILE QUERY] select string:", PROFILE_SELECT);
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = (data || null) as
    | {
        email?: string | null
        username?: string | null
        display_name?: string | null
        avatar_url?: string | null
        bio?: string | null
        website_url?: string | null
        is_public?: boolean | null
        created_at?: string | null
        updated_at?: string | null
        favourite_film?: string | null
        favourite_series?: string | null
        favourite_book?: string | null
      }
    | null

  if (error) {
    console.error("[PROFILE QUERY] error:", error.message, "| hint:", error.hint);
  } else {
    console.log("[PROFILE QUERY] returned fields:", Object.keys(data ?? {}));
    console.log("[NAV PROFILE] avatar_url:", typedProfile?.avatar_url ?? null);
    console.log("[NAV PROFILE] error:", "none");
  }

  if (error) {
    logSupabaseProfileError("fetch profile", error);
    return {
      profile: null,
      error,
    } as const;
  }

  return {
      profile: {
        id: user.id,
        email: typedProfile?.email ?? user.email ?? null,
        username: typedProfile?.username ?? null,
        displayName: typedProfile?.display_name ?? null,
        avatarUrl: typedProfile?.avatar_url ?? null,
        bio: typedProfile?.bio ?? null,
        websiteUrl: typedProfile?.website_url ?? null,
        isPublic: typedProfile?.is_public ?? true,
        createdAt: typedProfile?.created_at ?? null,
        updatedAt: typedProfile?.updated_at ?? null,
        favouriteFilm: typedProfile?.favourite_film ?? null,
        favouriteSeries: typedProfile?.favourite_series ?? null,
        favouriteBook: typedProfile?.favourite_book ?? null,
        movieMountRushmore: [],
      } satisfies UserProfile,
    error: null,
  } as const;
}

function logSupabaseProfileError(
  scope: string,
  error: {
    code?: string;
    details?: string;
    hint?: string;
    message?: string;
  } | null
) {
  console.error(`[ReelShelf profile] ${scope} failed`, {
    code: error?.code ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    message: error?.message ?? null,
  });
}

async function ensureProfileRow(user: User) {
  const client = createSupabaseBrowserClient();

  if (!client) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data: existing, error: existingError } = await client
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    logSupabaseProfileError("select existing profile", existingError);
    return {
      ok: false,
      error: existingError.message || "Could not verify your profile row.",
    };
  }

  if (existing?.id) {
    return { ok: true };
  }

  const { error: insertError } = await client.from("profiles").insert({
    id: user.id,
    email: user.email || null,
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: true };
    }

    logSupabaseProfileError("insert profile shell row", insertError);
    return {
      ok: false,
      error: insertError.message || "Could not create your profile row.",
    };
  }

  return { ok: true };
}

async function resolveProfileForUser(user: User | null) {
  if (!user) {
    return {
      profile: null,
      resolved: true,
    } as const;
  }

  const ensured = await ensureProfileRow(user);

  if (!ensured.ok) {
    return {
      profile: null,
      resolved: false,
    } as const;
  }

  const { profile, error } = await fetchProfileForUser(user);

  if (error) {
    return {
      profile: null,
      resolved: false,
    } as const;
  }

  return {
    profile,
    resolved: true,
  } as const;
}

function getAvatarExtension(file: File) {
  const parts = file.name.split(".");
  const extension = parts[parts.length - 1]?.toLowerCase();

  if (extension && extension.length <= 5) {
    return extension;
  }

  return "jpg";
}

function getAvatarPath(userId: string, file: File) {
  const extension = getAvatarExtension(file);
  return `${userId}/avatar.${extension}`;
}

function getAvatarErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Could not upload your avatar right now.";

  const normalized = message.toLowerCase();

  if (normalized.includes("bucket") && normalized.includes("not found")) {
    return "The Supabase avatars bucket is missing. Create the `avatars` bucket and rerun the profile identity migration.";
  }

  if (normalized.includes("row-level security") || normalized.includes("permission")) {
    return "Avatar upload is blocked by Supabase Storage permissions. Check the `avatars` bucket policies for authenticated users.";
  }

  return message;
}

async function uploadAvatar(userId: string, file: File) {
  const client = createSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const path = getAvatarPath(userId, file);

  const { error } = await client.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
  initialProfile?: UserProfile | null;
}) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [profileResolved, setProfileResolved] = useState(
    !initialUser || Boolean(initialProfile)
  );
  const [loading, setLoading] = useState(
    configured ? Boolean(initialUser && !initialProfile) || !initialUser : false
  );
  const [syncing, setSyncing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const needsProfileCompletion = Boolean(
    user && !loading && profileResolved && !isProfileComplete(profile)
  );

  useEffect(() => {
    const client = createSupabaseBrowserClient();

    if (!client) {
      setLoading(false);
      return;
    }

    const supabase = client;
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user ?? null);
      const profileResult = await resolveProfileForUser(session?.user ?? null);
      if (!mounted) return;
      setProfile((current) => profileResult.profile ?? current ?? null);
      setProfileResolved(profileResult.resolved);
      setLoading(false);

      if (session?.user) {
        setSyncing(true);
        await syncAllUserData();
        if (mounted) {
          setSyncing(false);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        void resolveProfileForUser(session.user).then((profileResult) => {
          if (mounted) {
            setProfile((current) => profileResult.profile ?? current ?? null);
            setProfileResolved(profileResult.resolved);
            setLoading(false);
          }
        });
        setSyncing(true);
        void syncAllUserData().finally(() => {
          if (mounted) {
            setSyncing(false);
          }
        });
      } else {
        setProfile(null);
        setProfileResolved(true);
        setLoading(false);
        clearDiaryDataForSignOut();
        clearWatchlistDataForSignOut();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      displayName: getProfileDisplayName(profile),
      handle: getProfileHandle(profile),
      avatarUrl: profile?.avatarUrl ?? null,
      needsProfileCompletion,
      loading,
      configured,
      syncing,
      saveProfileIdentity: async (values: SaveProfileValues) => {
        const usernameError = validateUsername(values.username);
        if (usernameError) {
          return usernameError;
        }

        const displayNameError = validateDisplayName(values.displayName);
        if (displayNameError) {
          return displayNameError;
        }

        const supabase = createSupabaseBrowserClient();

        if (!supabase || !user) {
          return "You need to be signed in to save your profile.";
        }

        setSavingProfile(true);

        try {
          const ensured = await ensureProfileRow(user);

          if (!ensured.ok) {
            return ensured.error || "Could not prepare your profile row.";
          }

          let avatarUrl = profile?.avatarUrl ?? null;

          if (values.avatarFile) {
            avatarUrl = await uploadAvatar(user.id, values.avatarFile);
          }

          if (!avatarUrl) {
            setSavingProfile(false);
            return "Add a profile picture to finish your profile.";
          }

          const username = normalizeUsername(values.username);
          const displayName = normalizeDisplayName(values.displayName);

          const payload = {
            email: user.email || null,
            username,
            display_name: displayName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          };

          console.log("[PROFILE QUERY] select string:", "id");
          const { data: existingProfile, error: existingProfileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (existingProfileError) {
            logSupabaseProfileError("recheck profile before save", existingProfileError);
            return existingProfileError.message || "Could not load your profile.";
          }

          console.log("[PROFILE QUERY] select string:", PROFILE_SELECT);
          const saveQuery = existingProfile?.id
            ? supabase
                .from("profiles")
                .update(payload)
                .eq("id", user.id)
                .select(PROFILE_SELECT)
                .single()
            : supabase
                .from("profiles")
                .insert({
                  id: user.id,
                  ...payload,
                })
                .select(PROFILE_SELECT)
                .single();

          const { data: savedProfile, error: saveError } = await saveQuery;
          const typedSavedProfile = (savedProfile || null) as
            | {
                id: string
                email?: string | null
                username?: string | null
                display_name?: string | null
                avatar_url?: string | null
                bio?: string | null
                website_url?: string | null
                is_public?: boolean | null
                created_at?: string | null
                updated_at?: string | null
                favourite_film?: string | null
                favourite_series?: string | null
                favourite_book?: string | null
              }
            | null

          if (saveError) {
            console.error("[PROFILE QUERY] error:", saveError.message, "| hint:", saveError.hint);
          } else {
            console.log("[PROFILE QUERY] returned fields:", Object.keys(savedProfile ?? {}));
          }

          if (saveError) {
            if (saveError.code === "23505") {
              logSupabaseProfileError("save profile duplicate username", saveError);
              return "That username is already taken.";
            }

            logSupabaseProfileError("save profile row", saveError);
            return saveError.message || "Could not save your profile right now.";
          }

          setProfile({
            id: typedSavedProfile?.id ?? user.id,
            email: typedSavedProfile?.email ?? user.email ?? null,
            username: typedSavedProfile?.username ?? username,
            displayName: typedSavedProfile?.display_name ?? displayName,
            avatarUrl: typedSavedProfile?.avatar_url ?? avatarUrl,
            bio: typedSavedProfile?.bio ?? profile?.bio ?? null,
            websiteUrl: typedSavedProfile?.website_url ?? profile?.websiteUrl ?? null,
            isPublic: typedSavedProfile?.is_public ?? profile?.isPublic ?? true,
            createdAt: typedSavedProfile?.created_at ?? profile?.createdAt ?? null,
            updatedAt: typedSavedProfile?.updated_at ?? profile?.updatedAt ?? null,
            favouriteFilm:
              typedSavedProfile?.favourite_film ?? profile?.favouriteFilm ?? null,
            favouriteSeries:
              typedSavedProfile?.favourite_series ?? profile?.favouriteSeries ?? null,
            favouriteBook:
              typedSavedProfile?.favourite_book ?? profile?.favouriteBook ?? null,
            movieMountRushmore: profile?.movieMountRushmore ?? [],
          });

          return null;
        } catch (error) {
          console.error(error);
          return getAvatarErrorMessage(error);
        } finally {
          setSavingProfile(false);
        }
      },
      saveProfileDetails: async (values: SaveProfileDetailsValues) => {
        const supabase = createSupabaseBrowserClient();

        if (!supabase || !user) {
          return "You need to be signed in to save your profile.";
        }

        const ensured = await ensureProfileRow(user);

        if (!ensured.ok) {
          return ensured.error || "Could not prepare your profile row.";
        }

        const payload = {
          bio: values.bio.trim() || null,
          favourite_film: values.favouriteFilm.trim() || null,
          favourite_series: values.favouriteSeries.trim() || null,
          favourite_book: values.favouriteBook.trim() || null,
          updated_at: new Date().toISOString(),
        };

        console.log("[PROFILE QUERY] select string:", PROFILE_SELECT);
        const { data: savedProfile, error: saveError } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", user.id)
          .select(PROFILE_SELECT)
          .single();
        const typedSavedProfile = (savedProfile || null) as
          | {
              id: string
              email?: string | null
              username?: string | null
              display_name?: string | null
              avatar_url?: string | null
              bio?: string | null
              website_url?: string | null
              is_public?: boolean | null
              created_at?: string | null
              updated_at?: string | null
              favourite_film?: string | null
              favourite_series?: string | null
              favourite_book?: string | null
            }
          | null

        if (saveError) {
          console.error("[PROFILE QUERY] error:", saveError.message, "| hint:", saveError.hint);
        } else {
          console.log("[PROFILE QUERY] returned fields:", Object.keys(savedProfile ?? {}));
        }

        if (saveError) {
          logSupabaseProfileError("save profile details", saveError);
          return saveError.message || "Could not save your profile details.";
        }

        setProfile({
          id: typedSavedProfile?.id ?? user.id,
          email: typedSavedProfile?.email ?? user.email ?? null,
          username: typedSavedProfile?.username ?? profile?.username ?? null,
          displayName: typedSavedProfile?.display_name ?? profile?.displayName ?? null,
          avatarUrl: typedSavedProfile?.avatar_url ?? profile?.avatarUrl ?? null,
          bio: typedSavedProfile?.bio ?? null,
          websiteUrl: typedSavedProfile?.website_url ?? profile?.websiteUrl ?? null,
          isPublic: typedSavedProfile?.is_public ?? profile?.isPublic ?? true,
          createdAt: typedSavedProfile?.created_at ?? profile?.createdAt ?? null,
          updatedAt: typedSavedProfile?.updated_at ?? profile?.updatedAt ?? null,
          favouriteFilm: typedSavedProfile?.favourite_film ?? null,
          favouriteSeries: typedSavedProfile?.favourite_series ?? null,
          favouriteBook: typedSavedProfile?.favourite_book ?? null,
          movieMountRushmore: profile?.movieMountRushmore ?? [],
        });

        return null;
      },
      signOut: async () => {
        const supabase = createSupabaseBrowserClient();

        if (!supabase) {
          clearDiaryDataForSignOut();
          clearWatchlistDataForSignOut();
          setUser(null);
          setProfile(null);
          return;
        }

        await supabase.auth.signOut();
        clearDiaryDataForSignOut();
        clearWatchlistDataForSignOut();
        setUser(null);
        setProfile(null);
      },
    }),
    [
      configured,
      loading,
      needsProfileCompletion,
      profile,
      syncing,
      user,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {loading ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "grid",
            placeItems: "center",
            background: "rgba(5,5,5,0.42)",
            backdropFilter: "blur(10px)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(10,10,10,0.9)",
              padding: "12px 18px",
              color: "#e5e7eb",
              fontSize: 13,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Loading profile...
          </div>
        </div>
      ) : null}
      <ProfileSetupModal
        open={needsProfileCompletion}
        saving={savingProfile}
        initialUsername={profile?.username}
        initialDisplayName={profile?.displayName}
        initialAvatarUrl={profile?.avatarUrl}
        onSubmit={value.saveProfileIdentity}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
