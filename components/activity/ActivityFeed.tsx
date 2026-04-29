"use client"

import ActivityItem from "./ActivityItem"

export interface ActivityEvent {
  id: string
  type: "logged" | "watchlisted"
  title: string
  media_type: "movie" | "tv" | "book"
  poster: string | null
  rating: number | null
  watched_date: string | null
  timestamp: string
}

export interface BatchEvent {
  type: "batch"
  count: number
  timestamp: string
  sample: ActivityEvent[]
}

export interface ActivityProfile {
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

interface ActivityFeedProps {
  allEvents: ActivityEvent[]
  profile: ActivityProfile | null
}

const BATCH_THRESHOLD_MS = 60000

function timeAgo(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

  return new Date(isoString).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  })
}

function groupEvents(events: ActivityEvent[]): Array<ActivityEvent | BatchEvent> {
  const grouped: Array<ActivityEvent | BatchEvent> = []
  let index = 0

  while (index < events.length) {
    const current = events[index]
    let nextIndex = index + 1

    while (
      nextIndex < events.length &&
      Math.abs(
        new Date(events[nextIndex].timestamp).getTime() -
          new Date(current.timestamp).getTime()
      ) < BATCH_THRESHOLD_MS
    ) {
      nextIndex += 1
    }

    const batchSize = nextIndex - index

    if (batchSize >= 4) {
      grouped.push({
        type: "batch",
        count: batchSize,
        timestamp: current.timestamp,
        sample: events.slice(index, Math.min(index + 3, nextIndex)),
      })
      index = nextIndex
      continue
    }

    grouped.push(current)
    index += 1
  }

  return grouped
}

export default function ActivityFeed({ allEvents, profile }: ActivityFeedProps) {
  const groupedEvents = groupEvents(allEvents)

  return (
    <main style={{ padding: "32px 24px 56px", background: "#08080f", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1020px", margin: "0 auto" }}>
        <header style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              margin: 0,
            }}
          >
            Activity
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              marginTop: "5px",
            }}
          >
            Your recent ReelShelf moments
          </p>
        </header>

        {groupedEvents.length === 0 ? (
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.3)",
              textAlign: "center",
              padding: "64px 0",
              fontStyle: "italic",
            }}
          >
            No activity yet — start logging films to see your history here
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {groupedEvents.map((event, index) =>
              event.type === "batch" ? (
                <div
                  key={`batch-${event.timestamp}-${event.count}-${index}`}
                  style={{
                    padding: "14px 0",
                    borderBottom:
                      index === groupedEvents.length - 1
                        ? "none"
                        : "0.5px solid rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "13px",
                    fontStyle: "italic",
                  }}
                >
                  Imported {event.count} films from Letterboxd ·{" "}
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
              ) : (
                <ActivityItem
                  key={event.id}
                  event={event}
                  profile={profile}
                  isLast={index === groupedEvents.length - 1}
                />
              )
            )}
          </div>
        )}
      </div>
    </main>
  )
}
