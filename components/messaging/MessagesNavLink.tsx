"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import { getBadgeCount, subscribeToInbox } from "@/lib/messaging/api"

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 0 1-11.6 7.14L4 20l.9-4.1A8 8 0 1 1 20 12Z" />
    </svg>
  )
}

/** Header link to /messages with a live unread badge (messages + pending invites). */
export default function MessagesNavLink() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const userId = user?.id ?? null

  useEffect(() => {
    const client = createClient()
    if (!client || !userId) return
    let cancelled = false
    const refresh = () => {
      getBadgeCount(client)
        .then((n) => { if (!cancelled) setCount(n) })
        .catch(() => { /* keep the last known count */ })
    }
    refresh()
    const unsubscribe = subscribeToInbox(client, userId, refresh)
    // Realtime can drop while a tab sleeps; catch up when it's visible again.
    const onVisible = () => { if (document.visibilityState === "visible") refresh() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      unsubscribe()
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [userId])

  if (!userId) return null
  const label = count > 0 ? `Messages, ${count} unread` : "Messages"

  return (
    <Link
      href="/messages"
      aria-label={label}
      title="Messages"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.82)",
        textDecoration: "none",
        flexShrink: 0,
      }}
    >
      <ChatIcon />
      {count > 0 ? (
        <span
          data-testid="messages-badge"
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: "#e5484d",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  )
}
