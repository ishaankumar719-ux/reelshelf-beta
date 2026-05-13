import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getMediaHref } from "@/lib/mediaRoutes"
import type { MediaType } from "@/lib/media"

export const dynamic = "force-dynamic"

type ProfileRow = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; is_public: boolean }

type ReviewRow = {
  id: string
  media_id: string
  media_type: string
  title: string
  poster: string | null
  year: number
  rating: number | null
  review: string
  watched_date: string
  saved_at: string
  contains_spoilers: boolean
  rewatch: boolean
}

const MEDIA_TYPE_LABEL: Record<string, string> = {
  movie: "Film",
  tv: "Series",
  book: "Book",
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null
  const full = Math.floor(rating / 2)
  const half = rating % 2 >= 1
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center", verticalAlign: "middle" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ fontSize: 11, color: i < full ? "rgba(212,175,55,0.9)" : half && i === full ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.15)" }}>
          ★
        </span>
      ))}
    </span>
  )
}

function ReviewCard({ entry }: { entry: ReviewRow }) {
  const href = getMediaHref({ id: entry.media_id, mediaType: entry.media_type as MediaType })
  const posterSrc = entry.poster ? `https://image.tmdb.org/t/p/w92${entry.poster}` : null
  const dateStr = entry.watched_date
    ? new Date(entry.watched_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 0",
        borderBottom: "0.5px solid rgba(255,255,255,0.055)",
      }}
    >
      <Link href={href} style={{ flexShrink: 0, textDecoration: "none" }}>
        <div
          style={{
            width: 56,
            height: 84,
            borderRadius: 5,
            overflow: "hidden",
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          {posterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterSrc} alt={entry.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.3 }}>{entry.title}</span>
            </div>
          )}
        </div>
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <Link href={href} style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
              {entry.title}
            </span>
          </Link>
          {entry.year ? (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{entry.year}</span>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {entry.rating ? <StarRating rating={entry.rating} /> : null}
          {MEDIA_TYPE_LABEL[entry.media_type] ? (
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
              {MEDIA_TYPE_LABEL[entry.media_type]}
            </span>
          ) : null}
          {entry.rewatch ? (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Rewatch</span>
          ) : null}
          {dateStr ? (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>{dateStr}</span>
          ) : null}
        </div>

        {entry.contains_spoilers ? (
          <p style={{ margin: "0 0 6px", fontSize: 11, color: "rgba(239,68,68,0.6)", fontStyle: "italic" }}>Contains spoilers</p>
        ) : null}

        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {entry.review}
        </p>
      </div>
    </div>
  )
}

export default async function ReviewsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  if (!supabase) notFound()

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_public")
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
    .select("id, media_id, media_type, title, poster, year, rating, review, watched_date, saved_at, contains_spoilers, rewatch")
    .eq("user_id", profile.id)
    .not("review", "is", null)
    .neq("review", "")
    .order("saved_at", { ascending: false })
    .limit(200)

  const reviews = (rows ?? []) as ReviewRow[]
  const displayName = profile.display_name || profile.username || username

  return (
    <PageShell
      title="Reviews"
      subtitle={`@${profile.username ?? username}`}
      backHref={`/u/${profile.username ?? username}`}
      count={reviews.length}
    >
      {reviews.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic", padding: "24px 0" }}>
          {isOwner ? "You haven't written any reviews yet." : `${displayName} hasn't written any reviews yet.`}
        </p>
      ) : (
        <div>
          {reviews.map((entry) => (
            <ReviewCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function PrivatePage({ username }: { username: string }) {
  return (
    <PageShell title="Reviews" subtitle={`@${username}`} backHref={`/u/${username}`} count={null}>
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
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px" }}>
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
