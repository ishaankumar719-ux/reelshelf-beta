import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type ProfileRow = { id: string; username: string | null; display_name: string | null; is_public: boolean }

type FilmRow = {
  id: string
  media_id: string
  title: string
  poster: string | null
  year: number
  rating: number | null
  favourite: boolean
  saved_at: string
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  const full = Math.floor(rating / 2)
  const half = rating % 2 >= 1
  return (
    <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ fontSize: 8, color: i < full ? "rgba(212,175,55,0.9)" : half && i === full ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.12)" }}>
          ★
        </span>
      ))}
    </div>
  )
}

function PosterCard({ film }: { film: FilmRow }) {
  const [imgErr, setImgErr] = [false, () => {}]
  const posterSrc = film.poster ? `https://image.tmdb.org/t/p/w185${film.poster}` : null

  return (
    <Link
      href={`/film/${film.media_id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "2/3",
            borderRadius: 6,
            overflow: "hidden",
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          {posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterSrc}
              alt={film.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.3 }}>{film.title}</span>
            </div>
          )}
        </div>
        {film.favourite && (
          <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: "rgba(239,68,68,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 8, color: "#fff" }}>♥</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 5 }}>
        <StarRating rating={film.rating} />
      </div>
    </Link>
  )
}

export default async function FilmsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  if (!supabase) notFound()

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, username, display_name, is_public")
    .eq("username", username.toLowerCase())
    .single()

  if (!profileData) notFound()
  const profile = profileData as ProfileRow

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  if (!profile.is_public && !isOwner) {
    return <PrivatePage username={profile.username ?? username} />
  }

  const { data: rows } = await supabase
    .from("diary_entries")
    .select("id, media_id, title, poster, year, rating, favourite, saved_at")
    .eq("user_id", profile.id)
    .eq("media_type", "movie")
    .eq("review_scope", "title")
    .order("saved_at", { ascending: false })
    .limit(500)

  const films = (rows ?? []) as FilmRow[]
  const displayName = profile.display_name || profile.username || username

  return (
    <PageShell
      title="Films"
      subtitle={`@${profile.username ?? username}`}
      backHref={`/u/${profile.username ?? username}`}
      count={films.length}
    >
      {films.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic", padding: "24px 0" }}>
          {isOwner ? "You haven't logged any films yet." : `${displayName} hasn't logged any films yet.`}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "12px 10px" }}>
          {films.map((film) => (
            <PosterCard key={film.id} film={film} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function PrivatePage({ username }: { username: string }) {
  return (
    <PageShell title="Films" subtitle={`@${username}`} backHref={`/u/${username}`} count={null}>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic", padding: "24px 0" }}>
        This profile is private.
      </p>
    </PageShell>
  )
}

function PageShell({
  title,
  subtitle,
  backHref,
  count,
  children,
}: {
  title: string
  subtitle: string
  backHref: string
  count: number | null
  children: React.ReactNode
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#08080f", color: "rgba(255,255,255,0.85)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px 80px" }}>
        <Link
          href={backHref}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", marginBottom: 24 }}
        >
          ← {subtitle}
        </Link>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.02em" }}>
            {title}{count !== null ? <span style={{ marginLeft: 10, fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>{count}</span> : null}
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
