import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import LegacyBadgeAdminClient from "./LegacyBadgeAdminClient"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ishaankumar719@gmail.com"

export default async function LegacyBadgesAdminPage() {
  const supabase = await createClient()
  if (!supabase) redirect("/")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect("/")

  const { data: badges } = await supabase
    .from("badges")
    .select("id, slug, name, description, icon")
    .eq("category", "legacy")
    .order("created_at", { ascending: true })

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", color: "rgba(255,255,255,0.85)" }}>
      <LegacyBadgeAdminClient
        badges={(badges ?? []) as Array<{ id: string; slug: string; name: string; description: string; icon: string }>}
      />
    </div>
  )
}
