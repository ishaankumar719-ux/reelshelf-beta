"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type {
  MountRushmoreSlot,
  PublicProfileActivityItem,
  PublicProfileShowcaseData,
  PublicProfileTopRatedItem,
} from "@/src/types/profile"

interface ProfileShowcaseProps {
  profile: PublicProfileShowcaseData | null
  isOwner: boolean
}

type RushmoreTab = "movie" | "tv" | "book"

const INITIAL_COLORS = ["#1D9E75", "#534AB7", "#D85A30", "#D4537E"] as const

function sectionLabelStyle() {
  return {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.3)",
    marginBottom: 16,
    display: "block",
  }
}

function getInitials(displayName: string | null, username: string) {
  const source = (displayName || username).trim()
  if (!source) return "R"

  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase()
}

function getAvatarColor(username: string) {
  const fallback = username.trim() || "reelshelf"
  return INITIAL_COLORS[fallback.charCodeAt(0) % INITIAL_COLORS.length] || INITIAL_COLORS[0]
}

function parseRating(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "string" ? parseFloat(value) : value
  return Number.isFinite(parsed) ? parsed : null
}

function getRushmorePosterSrc(slot: MountRushmoreSlot) {
  if (!slot.poster_path) return null
  if (slot.poster_path.startsWith("http")) return slot.poster_path
  return `https://image.tmdb.org/t/p/w342${slot.poster_path}`
}

function getRouteForMedia(mediaType: "movie" | "tv" | "book", mediaId: string) {
  if (mediaType === "tv") return `/series/${mediaId}`
  if (mediaType === "book") return `/books/${mediaId}`
  return `/films/${mediaId}`
}

function Avatar({
  avatarUrl,
  displayName,
  username,
}: {
  avatarUrl: string | null
  displayName: string | null
  username: string
}) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(displayName, username)

  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.1)",
        background: `linear-gradient(135deg, ${getAvatarColor(username)}, rgba(10,10,20,0.92))`,
        boxShadow: "0 18px 45px rgba(0,0,0,0.36)",
      }}
    >
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={displayName || username}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  )
}

function PosterFallback({ title }: { title: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg,#141622 0%,#0b0c14 100%)",
        color: "rgba(255,255,255,0.22)",
        fontSize: 24,
        fontWeight: 700,
      }}
    >
      {title.charAt(0).toUpperCase()}
    </div>
  )
}

function RushmoreCard({ slot }: { slot: MountRushmoreSlot }) {
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const posterSrc = getRushmorePosterSrc(slot)
  const title = slot.title || "Untitled"
  const mediaType = slot.media_type || "movie"
  const routeId = slot.media_id || ""

  return (
    <button
      type="button"
      onClick={() => {
        if (!routeId) return
        router.push(getRouteForMedia(mediaType, routeId))
      }}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: routeId ? "pointer" : "default",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 10,
          overflow: "hidden",
          background: "#10111c",
          transition: "transform 0.15s ease",
        }}
        className="group"
      >
        {posterSrc && !imgError ? (
          <img
            src={posterSrc}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            className="transition duration-150 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <PosterFallback title={title} />
        )}
      </div>
      <p
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.82)",
          margin: "8px 0 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          margin: "2px 0 0",
        }}
      >
        {slot.year || "—"}
      </p>
    </button>
  )
}

function EmptyRushmoreTile() {
  return (
    <div
      style={{
        aspectRatio: "2 / 3",
        borderRadius: 10,
        border: "1.5px dashed rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.02)",
      }}
    />
  )
}

function RecentItem({ item }: { item: PublicProfileActivityItem }) {
  const router = useRouter()
  const [imgError, setImgError] = useState(false)
  const title = item.title
  const route = getRouteForMedia(item.media_type, item.media_id)

  return (
    <button
      type="button"
      onClick={() => router.push(route)}
      style={{
        width: 80,
        flexShrink: 0,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: 8,
          overflow: "hidden",
          background: "#10111c",
        }}
      >
        {item.poster && !imgError ? (
          <img
            src={item.poster}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <PosterFallback title={title} />
        )}
      </div>
      <p
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.78)",
          margin: "5px 0 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </p>
    </button>
  )
}

function HighestRatedRow({ items }: { items: PublicProfileTopRatedItem[] }) {
  const [errors, setErrors] = useState<Record<number, boolean>>({})

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
        gap: 10,
      }}
    >
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          style={{
            position: "relative",
            width: 64,
            aspectRatio: "2 / 3",
            borderRadius: 8,
            overflow: "hidden",
            background: "#10111c",
          }}
        >
          {item.poster && !errors[index] ? (
            <img
              src={item.poster}
              alt={item.title}
              onError={() => setErrors((current) => ({ ...current, [index]: true }))}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <PosterFallback title={item.title} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function ProfileShowcase({ profile, isOwner }: ProfileShowcaseProps) {
  const [activeTab, setActiveTab] = useState<RushmoreTab>("movie")
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(false)
    const timeoutId = window.setTimeout(() => setVisible(true), 100)
    return () => window.clearTimeout(timeoutId)
  }, [activeTab])

  const rushmoreSlots = useMemo(() => {
    if (!profile) return [] as Array<MountRushmoreSlot | null>
    return [1, 2, 3, 4].map((position) =>
      profile.mount_rushmore.find(
        (slot) => slot.media_type === activeTab && slot.position === position
      ) ?? null
    )
  }, [activeTab, profile])

  if (!profile) return null

  const identityName = profile.display_name || profile.username
  const favourites = [
    profile.favourite_film ? `🎬 ${profile.favourite_film}` : null,
    profile.favourite_series ? `📺 ${profile.favourite_series}` : null,
    profile.favourite_book ? `📚 ${profile.favourite_book}` : null,
  ].filter((value): value is string => Boolean(value))

  if (!profile.is_public && !isOwner) {
    return (
      <section
        style={{
          maxWidth: 1020,
          margin: "0 auto",
          padding: "32px 20px 48px",
          background: "#08080f",
        }}
      >
        <div
          style={{
            minHeight: "50vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 16,
          }}
        >
          <Avatar
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            username={profile.username}
          />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.92)", margin: 0 }}>
              {identityName}
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: "6px 0 0" }}>
              @{profile.username} has a private profile
            </p>
          </div>
        </div>
      </section>
    )
  }

  const stats = [
    { label: "Films", value: profile.stats.films },
    { label: "Series", value: profile.stats.series },
    { label: "Reviews", value: profile.stats.reviews },
    { label: "Avg rating", value: profile.stats.avg_rating !== null ? `${profile.stats.avg_rating} ★` : "—" },
  ]

  const emptyTabMessage =
    activeTab === "movie"
      ? "Build your top 4 films"
      : activeTab === "tv"
        ? "Build your top 4 series"
        : "Build your top 4 books"

  return (
    <section
      style={{
        maxWidth: 1020,
        margin: "0 auto",
        padding: "32px 20px 48px",
        background: "#08080f",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "0.5px solid rgba(255,255,255,0.08)",
          borderRadius: 28,
          padding: 24,
          boxShadow: "0 28px 90px rgba(0,0,0,0.42)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 0 }}>
            <Avatar
              avatarUrl={profile.avatar_url}
              displayName={profile.display_name}
              username={profile.username}
            />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.92)", margin: 0 }}>
                {identityName}
              </h1>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: "4px 0 0" }}>
                @{profile.username}
              </p>
              {profile.bio ? (
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.6)",
                    margin: "10px 0 0",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    maxWidth: 560,
                  }}
                >
                  {profile.bio}
                </p>
              ) : null}
              {profile.website_url ? (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    marginTop: 10,
                    fontSize: 12,
                    color: "#67d7b2",
                    textDecoration: "none",
                  }}
                >
                  {profile.website_url}
                </a>
              ) : null}
            </div>
          </div>

          {isOwner ? (
            <Link
              href="/profile"
              style={{
                display: "inline-flex",
                height: 36,
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.25)",
                padding: "0 16px",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.82)",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Edit profile
            </Link>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginTop: 28,
          }}
        >
          {stats.map((item) => (
            <div
              key={item.label}
              style={{
                textAlign: "center",
                border: "0.5px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                padding: "16px 12px",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.88)", margin: 0 }}>
                {item.value}
              </p>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  margin: "6px 0 0",
                }}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40 }}>
          <span style={sectionLabelStyle()}>Mount Rushmore</span>
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {([
              { key: "movie", label: "Films" },
              { key: "tv", label: "Series" },
              { key: "book", label: "Books" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  background:
                    activeTab === tab.key ? "rgba(255,255,255,0.14)" : "transparent",
                  color:
                    activeTab === tab.key
                      ? "rgba(255,255,255,0.88)"
                      : "rgba(255,255,255,0.35)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {rushmoreSlots.map((slot, index) => (
                <div key={`${activeTab}-${index + 1}`}>
                  {slot ? <RushmoreCard slot={slot} /> : <EmptyRushmoreTile />}
                </div>
              ))}
            </div>

            {rushmoreSlots.every((slot) => slot === null) ? (
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.3)",
                  fontStyle: "italic",
                  textAlign: "center",
                  margin: "12px 0 0",
                }}
              >
                {emptyTabMessage}
              </p>
            ) : null}
          </div>
        </div>

        {profile.recent_activity.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>Recently watched</span>
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                scrollbarWidth: "none",
                paddingBottom: 4,
              }}
              className="[&::-webkit-scrollbar]:hidden"
            >
              {profile.recent_activity.map((item) => (
                <RecentItem key={`${item.id}-${item.media_id}`} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        {profile.highest_rated.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>Highest rated</span>
            <HighestRatedRow items={profile.highest_rated} />
          </div>
        ) : null}

        {favourites.length > 0 ? (
          <div style={{ marginTop: 40 }}>
            <span style={sectionLabelStyle()}>Favourites</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {favourites.map((item) => (
                <p
                  key={item}
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.75)",
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
