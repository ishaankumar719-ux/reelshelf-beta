import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import MessageReportsClient from "@/components/messaging/MessageReportsClient"

export const metadata: Metadata = { title: "Message reports · ReelShelf admin" }

// Private review queue. Access is decided by public.app_admins in the
// database (is_app_admin), not by the client: the report functions refuse
// non-admins even if this page were reached some other way.
export default async function MessageReportsPage() {
  const supabase = await createClient()
  if (!supabase) redirect("/")
  const { data: isAdmin } = await supabase.rpc("is_app_admin")
  if (!isAdmin) redirect("/")
  return <MessageReportsClient />
}
