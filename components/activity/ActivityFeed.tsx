"use client"

import { useState, useEffect } from "react"
import type { ActivityEvent } from "@/lib/activity"
import ActivityCard from "./ActivityCard"
import { getLikedDiaryEntryIds, getLikeCountsForEntries } from "@/lib/supabase/likes"
import { getCommentCountsForEntries } from "@/lib/supabase/comments"

// ─── types ───────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  events: ActivityEvent[]
  emptyMessage?: string
  showTabs?: boolean
}

type FeedTab = "mine" | "following"

type SocialState = {
  likeCount: number
  commentCount: number
  hasLiked: boolean
}

// ─── empty states ─────────────────────────────────────────────────────────────

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
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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

// ─── feed list ────────────────────────────────────────────────────────────────

function FeedList({
  events,
  socialData,
  emptyMessage,
}: {
  events: ActivityEvent[]
  socialData: Record<string, SocialState>
  emptyMessage?: string
}) {
  if (events.length === 0) {
    return <EmptyState message={emptyMessage ?? "No activity yet"} />
  }

  return (
    <div>
      {events.map((event, index) => {
        const social = event.diary_entry_id ? socialData[event.diary_entry_id] : undefined
        return (
          <div
            key={event.id}
            style={{
              borderBottom:
                index === events.length - 1
                  ? "none"
                  : "0.5px solid rgba(255,255,255,0.055)",
            }}
          >
            <ActivityCard
              event={event}
              initialLikeCount={social?.likeCount ?? 0}
              initialCommentCount={social?.commentCount ?? 0}
              initialHasLiked={social?.hasLiked ?? false}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── main feed ────────────────────────────────────────────────────────────────

export default function ActivityFeed({
  events,
  emptyMessage,
  showTabs = false,
}: ActivityFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>("mine")
  const [socialData, setSocialData] = useState<Record<string, SocialState>>({})

  // Batch-fetch likes + comments for all diary events in one pass
  useEffect(() => {
    const diaryEntryIds = events
      .map((e) => e.diary_entry_id)
      .filter((id): id is string => Boolean(id))

    if (diaryEntryIds.length === 0) return

    void Promise.all([
      getLikedDiaryEntryIds(diaryEntryIds),
      getLikeCountsForEntries(diaryEntryIds),
      getCommentCountsForEntries(diaryEntryIds),
    ]).then(([likedIds, likeCounts, commentCounts]) => {
      const likedSet = new Set(likedIds)
      const next: Record<string, SocialState> = {}
      for (const id of diaryEntryIds) {
        next[id] = {
          likeCount: likeCounts[id] ?? 0,
          commentCount: commentCounts[id] ?? 0,
          hasLiked: likedSet.has(id),
        }
      }
      setSocialData(next)
    })
  }, [events])

  if (!showTabs) {
    return (
      <FeedList
        events={events}
        socialData={socialData}
        emptyMessage={emptyMessage}
      />
    )
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
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", margin: "4px 0 0" }}>
          Your recent ReelShelf moments
        </p>
      </header>

      {/* Tab bar */}
      <div
        style={{
          display: "inline-flex",
          gap: 2,
          marginBottom: 24,
          padding: 3,
          borderRadius: 22,
          background: "rgba(255,255,255,0.04)",
          border: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        {(
          [
            { key: "mine", label: "My Activity" },
            { key: "following", label: "Following" },
          ] as const
        ).map((tab) => (
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
                activeTab === tab.key ? "rgba(255,255,255,0.12)" : "transparent",
              color:
                activeTab === tab.key
                  ? "rgba(255,255,255,0.88)"
                  : "rgba(255,255,255,0.35)",
              boxShadow:
                activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "mine" ? (
        <FeedList
          events={events}
          socialData={socialData}
          emptyMessage={
            emptyMessage ??
            "No activity yet — start logging films to see your history here"
          }
        />
      ) : (
        <FollowingPlaceholder />
      )}
    </div>
  )
}
