import { createClient } from "@/lib/supabase/server"
import { fetchListsForProfile } from "@/lib/supabase/lists"
import ListPreviewCard from "@/components/lists/ListPreviewCard"
import CreateListButton from "@/components/lists/CreateListButton"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

interface UserListsSectionProps {
  userId: string
  isOwner: boolean
}

export default async function UserListsSection({
  userId,
  isOwner,
}: UserListsSectionProps) {
  const supabase = await createClient()
  if (!supabase) return null

  const lists = await fetchListsForProfile(supabase, userId, isOwner)

  // Empty state — hide the section entirely for non-owners with no public lists
  if (lists.length === 0 && !isOwner) return null

  return (
    <section className="w-full py-4 md:py-5 md:px-6" style={{ fontFamily: FONT }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingInline: 16,
        }}
        className="md:px-0"
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.34)",
          }}
        >
          Lists
        </span>

        {isOwner && <CreateListButton userId={userId} />}
      </div>

      {/* Empty state for owner with no lists */}
      {lists.length === 0 && isOwner && (
        <div
          style={{
            paddingInline: 16,
            paddingBottom: 8,
          }}
          className="md:px-0"
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "rgba(255,255,255,0.22)",
              fontStyle: "italic",
            }}
          >
            No lists yet — create one to organise your favourites.
          </p>
        </div>
      )}

      {/* Grid */}
      {lists.length > 0 && (
        <div
          className="px-4 md:px-0"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {lists.map((list) => (
            <ListPreviewCard key={list.id} list={list} isOwner={isOwner} />
          ))}
        </div>
      )}
    </section>
  )
}
