export type MountRushmoreMovie = {
  title: string;
  year: number | null;
  subtitle: string | null;
  poster: string | null;
};

export type UserProfile = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  favouriteFilm: string | null;
  favouriteSeries: string | null;
  favouriteBook: string | null;
  movieMountRushmore: MountRushmoreMovie[];
};

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);

  if (!username) {
    return "Choose a username to continue.";
  }

  if (username.length < 3) {
    return "Usernames must be at least 3 characters.";
  }

  if (username.length > 24) {
    return "Usernames must be 24 characters or fewer.";
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "Use only lowercase letters, numbers, and underscores.";
  }

  return null;
}

export function validateDisplayName(value: string) {
  const displayName = normalizeDisplayName(value);

  if (!displayName) {
    return "Add a display name to finish your profile.";
  }

  if (displayName.length < 2) {
    return "Display names must be at least 2 characters.";
  }

  if (displayName.length > 40) {
    return "Display names must be 40 characters or fewer.";
  }

  return null;
}

export function isProfileComplete(profile: UserProfile | null) {
  return Boolean(
    profile?.username && profile.displayName && profile.avatarUrl
  );
}

export function getProfileDisplayName(profile: UserProfile | null) {
  if (profile?.displayName) {
    return profile.displayName;
  }

  if (profile?.username) {
    return `@${profile.username}`;
  }

  return null;
}

export function getProfileHandle(profile: UserProfile | null) {
  return profile?.username ? `@${profile.username}` : null;
}

export function getProfileInitials(profile: Pick<UserProfile, "displayName" | "username"> | null) {
  const source = normalizeDisplayName(profile?.displayName || profile?.username || "");

  if (!source) {
    return "R";
  }

  const parts = source.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export function getPublicProfileHref(username: string) {
  return `/u/${encodeURIComponent(normalizeUsername(username))}`;
}

export function getEmptyMountRushmore(): MountRushmoreMovie[] {
  return Array.from({ length: 4 }, () => ({
    title: "",
    year: null,
    subtitle: null,
    poster: null,
  }));
}

export function normalizeMountRushmore(
  value: unknown
): MountRushmoreMovie[] {
  const source = Array.isArray(value) ? value : [];

  const normalized = source
    .slice(0, 4)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return {
          title: "",
          year: null,
          subtitle: null,
          poster: null,
        } satisfies MountRushmoreMovie;
      }

      const maybeItem = item as {
        title?: unknown;
        year?: unknown;
        subtitle?: unknown;
        poster?: unknown;
      };

      const year =
        typeof maybeItem.year === "number" && Number.isFinite(maybeItem.year)
          ? maybeItem.year
          : typeof maybeItem.year === "string" && maybeItem.year.trim()
            ? Number(maybeItem.year)
            : null;

      return {
        title:
          typeof maybeItem.title === "string" ? maybeItem.title.trim() : "",
        year: typeof year === "number" && Number.isFinite(year) ? year : null,
        subtitle:
          typeof maybeItem.subtitle === "string" && maybeItem.subtitle.trim()
            ? maybeItem.subtitle.trim()
            : null,
        poster:
          typeof maybeItem.poster === "string" && maybeItem.poster.trim()
            ? maybeItem.poster.trim()
            : null,
      } satisfies MountRushmoreMovie;
    });

  return [...normalized, ...getEmptyMountRushmore()].slice(0, 4);
}
