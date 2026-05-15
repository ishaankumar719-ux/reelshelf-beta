import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// Canonical import URL is /import/letterboxd — redirect here for backwards compatibility
export default function ImportSettingsPage() {
  redirect("/import/letterboxd")
}
