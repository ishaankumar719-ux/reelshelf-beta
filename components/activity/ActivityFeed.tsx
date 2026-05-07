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

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "56px 24px",
        borderRadius: 14,
        border: "0.5px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
          border: "0.5px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.32)", margin: 0, fontWeight: 500 }}>
        {message}
      </p>
    </div>
  )
}

function FollowingPlaceholder() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "56px 24px",
        borderRadius: 14,
        border: "0.5px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
          border: "0.5px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.32)", margin: "0 0 6px", fontWeight: 500 }}>
        Following feed coming soon
      </p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", fontStyle: "italic", margin: 0 }}>
        Follow other ReelShelf users to see their activity here
      </p>
    </div>
  )
}

function FeedList({ events, emptyMessage }: { events: ActivityEvent[]; emptyMessage?: string }) {
  if (events.length === 0) {
    return <EmptyState message={emptyMessage ?? "No activity yet"} />
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
      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Activity
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.32)",
            marginTop: 4,
            margin: "4px 0 0",
          }}
        >
          Your recent ReelShelf moments
        </p>
      </header>

      {/* Tab bar */}
      <div
        style={{
          display: "inline-flex",
          gap: 2,
          marginBottom: 24,
          padding: "3px",
          borderRadius: 22,
          background: "rgba(255,255,255,0.04)",
          border: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        {([
          { key: "mine", label: "My Activity" },
          { key: "following", label: "Following" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "5px 16px",
              borderRadius: 18,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              transition: "all 0.15s ease",
              background:
                activeTab === tab.key
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
              color:
                activeTab === tab.key
                  ? "rgba(255,255,255,0.88)"
                  : "rgba(255,255,255,0.35)",
              boxShadow:
                activeTab === tab.key
                  ? "0 1px 3px rgba(0,0,0,0.3)"
                  : "none",
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
