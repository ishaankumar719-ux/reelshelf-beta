import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProfileShowcase from "@/src/components/profile/ProfileShowcase"

export const dynamic = "force-dynamic"

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const normalizedUsername = (username || "").trim().toLowerCase()

  if (!normalizedUsername) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }

  let isOwner = false

  if (supabase && user) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle()

    isOwner = profileRow?.id === user.id
  }

  return <ProfileShowcase username={normalizedUsername} isOwner={isOwner} />
}
