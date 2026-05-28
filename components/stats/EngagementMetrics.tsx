"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../AuthProvider"
import { getTopEngagedEntries, type EntryEngagement } from "../../lib/supabase/reactions"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 12px",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.34)",
        fontFamily: FONT,
      }}
    >
      {children}
    </h2>
  )
}

function EngagementCard({ entry }: { entry: EntryEngagement }) {
  const [imgErr, setImgErr] = useState(false)
  const total = entry.totalReactions + entry.totalLikes
  const posterSrc = entry.poster
    ? entry.poster.startsWith("http")
      ? entry.poster
      : `https://image.tmdb.org/t/p/w92${entry.poster}`
    : null

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 12,
        border: "0.5px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 54,
          borderRadius: 6,
          overflow: "hidden",
          flexShrink: 0,
          background: "rgba(255,255,255,0.05)",
        }}
      >
        {posterSrc && !imgErr ? (
          <img
            src={posterSrc}
            alt={entry.title}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "rgba(255,255,255,0.2)",
              fontWeight: 700,
            }}
          >
            {entry.title.charAt(0)}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.82)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: FONT,
          }}
        >
          {entry.title}
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          {entry.totalLikes > 0 && (
            <span style={{ fontSize: 11, color: "rgba(251,113,133,0.7)", fontFamily: FONT }}>
              ♥ {entry.totalLikes}
            </span>
          )}
          {entry.totalReactions > 0 && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: FONT }}>
              ✦ {entry.totalReactions} reaction{entry.totalReactions !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          fontSize: 15,
          fontWeight: 600,
          color: "rgba(255,255,255,0.55)",
          fontVariantNumeric: "tabular-nums",
          fontFamily: FONT,
        }}
      >
        {total}
      </div>
    </div>
  )
}

export default function EngagementMetrics() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<EntryEngagement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    void getTopEngagedEntries(user.id, 5).then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [user])

  if (loading || entries.length === 0) return null

  const totalLikes = entries.reduce((s, e) => s + e.totalLikes, 0)
  const totalReactions = entries.reduce((s, e) => s + e.totalReactions, 0)

  return (
    <div
      style={{
        marginTop: 32,
        padding: "20px 20px 24px",
        borderRadius: 16,
        border: "0.5px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <SectionLabel>Engagement</SectionLabel>

      {/* Summary row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Likes received", value: totalLikes, icon: "♥" },
          { label: "Reactions received", value: totalReactions, icon: "✦" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "0.5px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: "-0.3px",
                color: "rgba(255,255,255,0.88)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {stat.icon} {stat.value}
            </p>
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.28)",
                fontFamily: FONT,
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Most engaged entries */}
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          fontFamily: FONT,
        }}
      >
        Most engaged reviews
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {entries.map((e) => (
          <EngagementCard key={e.entryId} entry={e} />
        ))}
      </div>
    </div>
  )
}
