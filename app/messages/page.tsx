import type { Metadata } from "next"

export const metadata: Metadata = { title: "Messages · ReelShelf" }

// The right-hand pane on desktop before a conversation is chosen. On phones
// the layout shows the inbox instead and hides this pane.
export default function MessagesPage() {
  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 32, textAlign: "center" }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.92)", fontSize: 17, fontWeight: 600 }}>Your messages</p>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.5 }}>
          Choose a conversation, or start one with someone who follows you back.
        </p>
      </div>
    </div>
  )
}
