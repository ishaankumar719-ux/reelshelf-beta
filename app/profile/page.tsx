import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProfileEditor from "@/src/components/profile/ProfileEditor"
import ProfileHighlights from "@/components/profile/ProfileHighlights"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="pb-24 md:pb-8">
      <ProfileHighlights userId={user.id} />
      <ProfileEditor userId={user.id} />
    </div>
  )
}
