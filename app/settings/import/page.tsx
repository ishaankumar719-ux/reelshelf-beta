import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ImportClient from "./ImportClient"

export const dynamic = "force-dynamic"

export default async function ImportPage() {
  const supabase = await createClient()

  if (!supabase) {
    redirect("/auth")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  return <ImportClient />
}
