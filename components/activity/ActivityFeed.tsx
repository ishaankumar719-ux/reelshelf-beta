"use client"

import { useState } from "react"
import type { ActivityEvent } from "@/lib/activity"
import ActivityCard from "./ActivityCard"

interface ActivityFeedProps {
  events: ActivityEvent[]
  emptyMessage?: string
  showTabs?: boolean
}

type FeedTab = "mine" | "following"

function FollowingPlaceholder() {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <p
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.45)",
          marginBottom: 8,
        }}
      >
        Following feed coming soon
      </p>
      <p
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.25)",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        Follow other ReelShelf users to see their activity here
      </p>
    </div>
  )
}

function FeedList({ events, emptyMessage }: { events: ActivityEvent[]; emptyMessage?: string }) {
  if (events.length === 0) {
    return (
      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.3)",
          textAlign: "center",
          padding: "48px 0",
          fontStyle: "italic",
        }}
      >
        {emptyMessage ?? "No activity yet"}
      </p>
    )
  }

  return (
    <div>
      {events.map((event, index) => (
        <div
          key={event.id}
          style={{
            borderBottom:
              index === events.length - 1 ? "none" : "0.5px solid rgba(255,255,255,0.06)",
          }}
        >
          <ActivityCard event={event} />
        </div>
      ))}
    </div>
  )
}

export default function ActivityFeed({
  events,
  emptyMessage,
  showTabs = false,
}: ActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("mine")

  if (!showTabs) {
    return <FeedList events={events} emptyMessage={emptyMessage} />
  }

  return (
    <div>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            margin: 0,
          }}
        >
          Activity
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.35)",
            marginTop: 5,
          }}
        >
          Your recent ReelShelf moments
        </p>
      </header>

      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {([
          { key: "mine", label: "My Activity" },
          { key: "following", label: "Following" },
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

      {activeTab === "mine" ? (
        <FeedList
          events={events}
          emptyMessage={emptyMessage ?? "No activity yet — start logging films to see your history here"}
        />
      ) : (
        <FollowingPlaceholder />
      )}
    </div>
  )
}
