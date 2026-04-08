import Header from "../components/Header";
import { AuthProvider } from "../components/AuthProvider";
import type { UserProfile } from "../lib/profile";
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
        "id, email, username, display_name, avatar_url, bio, favourite_film, favourite_series, favourite_book"
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
        <AuthProvider initialUser={user} initialProfile={initialProfile}>
          <Header />
          <main
            style={{
              maxWidth: 1600,
              margin: "0 auto",
              padding: "28px 20px 60px",
            }}
          >
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
