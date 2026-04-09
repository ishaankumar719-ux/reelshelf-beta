import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProfileEditor from "@/src/components/profile/ProfileEditor"

export const dynamic = "force-dynamic"

export default async function SettingsProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }

  if (!user) {
    redirect("/login")
  }

  return <ProfileEditor userId={user.id} />
}
