import { redirect } from "next/navigation"

// The watchlist is now a shelf: send old links to the shelves page, which applies
// the owner's Public / Unlisted / Private choice for the film and TV shelves.
export default async function ProfileWatchlistRedirect({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  redirect(`/u/${encodeURIComponent(username)}/shelves`)
}
