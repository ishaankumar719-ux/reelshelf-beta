import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import BetaInviteAdminClient from "./BetaInviteAdminClient"

export const dynamic = "force-dynamic"

export type BetaInvite = {
  id: string
  code: string
  created_by: string | null
  claimed_by: string | null
  claimed_at: string | null
  max_uses: number
  current_uses: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const ADMIN_EMAIL = "ishaankumar719@gmail.com"

export default async function BetaInvitesAdminPage() {
  const supabase = await createClient()
  if (!supabase) redirect("/")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect("/")

  const { data: invites } = await supabase
    .from("beta_invites")
    .select("id, code, created_by, claimed_by, claimed_at, max_uses, current_uses, expires_at, is_active, created_at")
    .order("created_at", { ascending: false })

  return <BetaInviteAdminClient initialInvites={(invites ?? []) as BetaInvite[]} />
}
