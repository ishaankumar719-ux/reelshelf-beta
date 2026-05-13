import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getMediaHref } from "@/lib/mediaRoutes"
import type { MediaType } from "@/lib/media"

export const dynamic = "force-dynamic"

type ProfileRow = { id: string; username: string | null; display_name: string | null; is_public: boolean }

type WatchlistRow = {
  id: string
  media_id: string
  media_type: string
  title: string
  poster: string | null
  year: number
  creator: string | null
  added_at: string
}

const MEDIA_TYPE_LABEL: Record<string, string> = {
  movie: "Film",
  tv: "Series",
  book: "Book",
}

function WatchlistCard({ item }: { item: WatchlistRow }) {
  const href = getMediaHref({ id: item.media_id, mediaType: item.media_type as MediaType })
  const posterSrc = item.poster ? `https://image.tmdb.org/t/p/w185${item.poster}` : null

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
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
              alt={item.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.3 }}>{item.title}</span>
            </div>
          )}
        </div>
        {MEDIA_TYPE_LABEL[item.media_type] && item.media_type !== "movie" ? (
          <div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.7)", borderRadius: 3, padding: "1px 5px" }}>
            <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
              {MEDIA_TYPE_LABEL[item.media_type]}
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}

export default async function WatchlistPage({ params }: { params: Promise<{ username: string }> }) {
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
    .from("saved_items")
    .select("id, media_id, media_type, title, poster, year, creator, added_at")
    .eq("user_id", profile.id)
    .eq("list_type", "watchlist")
    .order("added_at", { ascending: false })
    .limit(500)

  const items = (rows ?? []) as WatchlistRow[]
  const displayName = profile.display_name || profile.username || username

  return (
    <PageShell
      title="Watchlist"
      subtitle={`@${profile.username ?? username}`}
      backHref={`/u/${profile.username ?? username}`}
      count={items.length}
    >
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic", padding: "24px 0" }}>
          {isOwner ? "Your watchlist is empty." : `${displayName}'s watchlist is empty.`}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "12px 10px" }}>
          {items.map((item) => (
            <WatchlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function PrivatePage({ username }: { username: string }) {
  return (
    <PageShell title="Watchlist" subtitle={`@${username}`} backHref={`/u/${username}`} count={null}>
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
