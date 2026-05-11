import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import BetaFeedbackButton from "../components/BetaFeedbackButton";
import { DiaryLogProvider } from "../hooks/useDiaryLog";
import type { UserProfile } from "../lib/profile";
import { PROFILE_SELECT } from "../lib/queries";
import { createClient } from "../lib/supabase/server";
import AppNav from "../src/components/layout/AppNav";
import GlobalSearch from "../src/components/layout/GlobalSearch";

export const dynamic = "force-dynamic";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root cause recovery: the app shell lost its global stylesheet import,
  // which disabled Tailwind utilities across every route and let raw browser
  // defaults leak through the entire UI.
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  let initialProfile: UserProfile | null = null;

  if (supabase && user) {
    console.log("[PROFILE QUERY] select string:", PROFILE_SELECT)
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[PROFILE QUERY] error:", error.message, "| hint:", error.hint)
    } else {
      console.log("[PROFILE QUERY] returned fields:", Object.keys(data ?? {}))
    }
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
    console.log("[NAV PROFILE] avatar_url:", typedProfile?.avatar_url ?? null)
    console.log("[NAV PROFILE] error:", error?.message ?? "none")

    initialProfile = {
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
    };
  }

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#050505",
          color: "white",
          fontFamily: "serif",
        }}
      >
        <style>{`
          .app-shell-main {
            max-width: 1600px;
            margin: 0 auto;
            padding: 28px 20px 60px;
          }

          @media (max-width: 760px) {
            .app-shell-main {
              padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 86px);
            }
          }
        `}</style>
        <AuthProvider initialUser={user} initialProfile={initialProfile}>
          <DiaryLogProvider>
            <AppNav />
            <GlobalSearch />
            <main className="app-shell-main">
              {children}
            </main>
            <BetaFeedbackButton />
          </DiaryLogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
