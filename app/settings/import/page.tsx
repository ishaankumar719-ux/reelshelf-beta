import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ImportWizard from "./ImportWizard"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Import from Letterboxd – ReelShelf",
  description: "Import your Letterboxd diary into ReelShelf with smart TMDB matching.",
}

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

  return <ImportWizard />
}
