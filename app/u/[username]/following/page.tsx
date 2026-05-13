import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import UserListRow, { type UserRowData } from "@/components/profile/UserListRow"

export const dynamic = "force-dynamic"

type ProfileRow = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; is_public: boolean }

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
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

  // Fetch following
  const { data: followingRows } = await supabase
    .from("followers")
    .select("following_id")
    .eq("follower_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(200)

  const followingIds = (followingRows ?? []).map((r) => r.following_id as string)

  let following: UserRowData[] = []
  if (followingIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", followingIds)
    following = ((profileRows ?? []) as ProfileRow[]).map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
    }))
    const idOrder = new Map(followingIds.map((id, i) => [id, i]))
    following.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))
  }

  // Current user's following set
  const myFollowingSet = new Set<string>()
  if (user) {
    const { data: myFollowing } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", followingIds)
    ;(myFollowing ?? []).forEach((r) => myFollowingSet.add(r.following_id as string))
  }

  const displayName = profile.display_name || profile.username || username

  return (
    <PageShell
      title="Following"
      subtitle={`@${profile.username ?? username}`}
      backHref={`/u/${profile.username ?? username}`}
      count={following.length}
    >
      {following.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic", padding: "24px 0" }}>
          {isOwner ? "You're not following anyone yet." : `${displayName} isn't following anyone yet.`}
        </p>
      ) : (
        following.map((u) => (
          <UserListRow key={u.id} user={u} initialFollowing={myFollowingSet.has(u.id)} />
        ))
      )}
    </PageShell>
  )
}

function PrivatePage({ username }: { username: string }) {
  return (
    <PageShell title="Following" subtitle={`@${username}`} backHref={`/u/${username}`} count={null}>
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
