import { redirect } from "next/navigation"
import ActivityFeed from "@/components/activity/ActivityFeed"
import { fetchActivityEvents } from "@/lib/activity"
import { createClient } from "@/lib/supabase/server"

export default async function ActivityPage() {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/auth")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth")
  }

  const userId = session.user.id

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .single()

  const activityProfile = {
    username: profile?.username ?? null,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  }

  const events = await fetchActivityEvents(userId, activityProfile)

  return (
    <main style={{ padding: "32px 24px 56px", background: "#08080f", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1020px", margin: "0 auto" }}>
        <ActivityFeed
          events={events}
          emptyMessage="No activity yet — start logging films to see your history here"
          showTabs
        />
      </div>
    </main>
  )
}
