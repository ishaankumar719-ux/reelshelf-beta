"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/AuthProvider"

export interface UserRowData {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

function Avatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  const initial = (name || "?").charAt(0).toUpperCase()

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        background: "linear-gradient(135deg, #534AB7, #1D9E75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 600,
        color: "rgba(255,255,255,0.92)",
        border: "0.5px solid rgba(255,255,255,0.1)",
      }}
    >
      {url && !err ? (
        <img src={url} alt={name} onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : initial}
    </div>
  )
}

function FollowBtn({ userId, initialFollowing }: { userId: string; initialFollowing: boolean }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  if (!user || user.id === userId) return null

  async function toggle() {
    if (loading || !user) return
    setLoading(true)
    const was = following
    setFollowing(!was)

    const client = createClient()
    if (!client) { setFollowing(was); setLoading(false); return }

    if (was) {
      await client.from("followers").delete().eq("follower_id", user.id).eq("following_id", userId)
    } else {
      await client.from("followers").insert({ follower_id: user.id, following_id: userId })
    }
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      style={{
        height: 34,
        padding: "0 16px",
        borderRadius: 999,
        border: following ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.22)",
        background: following ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
        color: following ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.88)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.15s ease",
        flexShrink: 0,
        fontFamily: FONT,
      }}
    >
      {loading ? "…" : following ? "Following" : "Follow"}
    </button>
  )
}

export default function UserListRow({
  user: row,
  initialFollowing = false,
}: {
  user: UserRowData
  initialFollowing?: boolean
}) {
  const profileHref = row.username ? `/u/${encodeURIComponent(row.username)}` : null
  const displayName = row.displayName || row.username || "Unknown"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "0.5px solid rgba(255,255,255,0.055)",
      }}
    >
      {profileHref ? (
        <Link href={profileHref} style={{ flexShrink: 0, textDecoration: "none" }}>
          <Avatar url={row.avatarUrl} name={displayName} />
        </Link>
      ) : (
        <Avatar url={row.avatarUrl} name={displayName} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {profileHref ? (
          <Link href={profileHref} style={{ textDecoration: "none" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: FONT }}>
              {displayName}
            </p>
          </Link>
        ) : (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)", fontFamily: FONT }}>
            {displayName}
          </p>
        )}
        {row.username ? (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: FONT }}>
            @{row.username}
          </p>
        ) : null}
      </div>

      <FollowBtn userId={row.id} initialFollowing={initialFollowing} />
    </div>
  )
}
