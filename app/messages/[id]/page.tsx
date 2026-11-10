import type { Metadata } from "next"
import ConversationClient from "@/components/messaging/ConversationClient"

export const metadata: Metadata = { title: "Conversation · ReelShelf" }

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ConversationClient conversationId={id} />
}
