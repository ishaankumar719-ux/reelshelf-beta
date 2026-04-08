import Header from "../components/Header";
import { AuthProvider } from "../components/AuthProvider";
import { normalizeMountRushmore, type UserProfile } from "../lib/profile";
import { createClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  let initialProfile: UserProfile | null = null;

  if (supabase && user) {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, email, username, display_name, avatar_url, bio, favourite_film, favourite_series, favourite_book, movie_mount_rushmore"
      )
      .eq("id", user.id)
      .maybeSingle();

    initialProfile = {
      id: user.id,
      email: data?.email ?? user.email ?? null,
      username: data?.username ?? null,
      displayName: data?.display_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
      bio: data?.bio ?? null,
      favouriteFilm: data?.favourite_film ?? null,
      favouriteSeries: data?.favourite_series ?? null,
      favouriteBook: data?.favourite_book ?? null,
      movieMountRushmore: normalizeMountRushmore(data?.movie_mount_rushmore),
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
          <Header />
          <main className="app-shell-main">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
