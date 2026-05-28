"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "../AuthProvider"
import { createClient as createSupabaseBrowserClient } from "../../lib/supabase/client"
import { getCollabRecommendations, type CollabRec } from "../../lib/recommendations"
import { getMediaHref } from "../../lib/mediaRoutes"
import type { MediaType } from "../../lib/media"
import type { DiaryMovie } from "../../lib/diary"

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

function PosterTile({
  title,
  mediaType,
  poster,
  href,
}: {
  title: string
  mediaType: MediaType
  poster: string | null
  href: string
}) {
  return (
    <Link
      href={href}
      className="poster-tile"
      style={{
        display: "block",
        width: "min(104px, 25vw)",
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          paddingBottom: "150%",
          background: "#0f0f0f",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg,#181818,#0c0c0c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.08)", fontSize: 20, fontWeight: 700, fontFamily: SANS }}>
              {title[0]}
            </span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.85) 100%)",
          }}
        />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 6px" }}>
          <h3
            style={{
              margin: 0,
              fontSize: 9.5,
              fontWeight: 600,
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </h3>
        </div>
      </div>
    </Link>
  )
}

interface SocialRecommendationsProps {
  diaryEntries: DiaryMovie[]
}

export default function SocialRecommendations({ diaryEntries }: SocialRecommendationsProps) {
  const { user } = useAuth()
  const [recs, setRecs] = useState<CollabRec[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user?.id || diaryEntries.length === 0) {
      setLoaded(true)
      return
    }

    const client = createSupabaseBrowserClient()
    if (!client) {
      setLoaded(true)
      return
    }

    const seedEntries = diaryEntries
      .filter(
        (e) =>
          e.mediaType === "movie" &&
          (e.favourite || (typeof e.rating === "number" && e.rating >= 8))
      )
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5)
      .map((e) => ({
        media_id: e.id,
        title: e.title,
        rating: typeof e.rating === "number" ? e.rating : 8,
        media_type: e.mediaType as string,
      }))

    if (seedEntries.length === 0) {
      setLoaded(true)
      return
    }

    void getCollabRecommendations(client, user.id, seedEntries).then((result) => {
      setRecs(result)
      setLoaded(true)
    })
  }, [user, diaryEntries])

  if (!loaded || recs.length === 0) return null

  return (
    <>
      {recs.map((rec) => (
        <section key={rec.seedTitle} style={{ marginBottom: "clamp(18px, 3.5vw, 26px)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: "clamp(8px, 1.8vw, 12px)",
            }}
          >
            <div>
              <span
                style={{
                  color: "#3e3e3e",
                  fontSize: 9,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  fontFamily: SANS,
                  display: "block",
                  marginBottom: 3,
                }}
              >
                From your circle
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(14px, 2.5vw, 17px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.25px",
                  fontWeight: 500,
                }}
              >
                Because you rated{" "}
                <em style={{ fontStyle: "italic", fontWeight: 400 }}>{rec.seedTitle}</em> highly
              </h2>
            </div>
          </div>

          <div
            className="home-row"
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              overscrollBehaviorX: "contain",
              scrollbarWidth: "none",
              paddingBottom: 2,
            }}
          >
            {rec.items.map((item) => (
              <PosterTile
                key={`${item.media_type}-${item.media_id}`}
                title={item.title}
                mediaType={item.media_type}
                poster={item.poster}
                href={getMediaHref({ id: item.media_id, mediaType: item.media_type as MediaType })}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
