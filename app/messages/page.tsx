import type { Metadata } from "next"
import InboxClient from "@/components/messaging/InboxClient"

export const metadata: Metadata = { title: "Messages · ReelShelf" }

export default function MessagesPage() {
  return <InboxClient />
}
