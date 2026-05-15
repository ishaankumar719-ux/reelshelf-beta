import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ImportWizard from "@/app/settings/import/ImportWizard"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Import from Letterboxd – ReelShelf",
  description: "Import your Letterboxd diary into ReelShelf by username or CSV export.",
}

export default async function LetterboxdImportPage() {
  const supabase = await createClient()
  if (!supabase) redirect("/auth")

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth")

  return <ImportWizard />
}
