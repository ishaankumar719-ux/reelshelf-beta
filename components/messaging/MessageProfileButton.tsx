"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import { canMessage, openDirectConversation } from "@/lib/messaging/api"

/** "Message" next to Follow on a profile. Shown only when the database says
 *  you can message this person (mutual followers, no block either way, or an
 *  existing conversation). Opening always lands on the same DM. */
export default function MessageProfileButton({ profileId }: { profileId: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [eligible, setEligible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const viewerId = user?.id ?? null

  useEffect(() => {
    const client = createClient()
    if (!client || !viewerId || viewerId === profileId) return
    let cancelled = false
    canMessage(client, profileId)
      .then((ok) => { if (!cancelled) setEligible(ok) })
      .catch(() => { if (!cancelled) setEligible(false) })
    return () => { cancelled = true }
  }, [viewerId, profileId])

  if (!eligible) return null

  async function open() {
    const client = createClient()
    if (!client || busy) return
    setBusy(true)
    setError(null)
    try {
      router.push(`/messages/${await openDirectConversation(client, profileId)}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      title={error ?? undefined}
      style={{
        display: "inline-flex",
        height: 36,
        alignItems: "center",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(255,255,255,0.1)",
        padding: "0 18px",
        fontSize: 12,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: error ? "#ff8a8a" : "rgba(255,255,255,0.88)",
        flexShrink: 0,
        cursor: busy ? "wait" : "pointer",
      }}
    >
      {busy ? "…" : error ? "Try again" : "Message"}
    </button>
  )
}
