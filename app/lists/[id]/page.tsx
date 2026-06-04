import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchListWithItems } from "@/lib/supabase/lists"
import { getMediaHref } from "@/lib/mediaRoutes"
import ListItemsEditor from "@/components/lists/ListItemsEditor"

export const dynamic = "force-dynamic"

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const TYPE_LABEL: Record<string, string> = { movie: "Film", tv: "TV", book: "Book" }
const TYPE_COLOR: Record<string, string> = {
  movie: "rgba(96,165,250,0.75)",
  tv:    "rgba(167,139,250,0.75)",
  book:  "rgba(52,211,153,0.75)",
}

function RankBadge({ n }: { n: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 32,
        height: 32,
        borderRadius: 6,
        background: "rgba(255,255,255,0.05)",
        border: "0.5px solid rgba(255,255,255,0.1)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        color: "rgba(255,255,255,0.55)",
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      #{n}
    </span>
  )
}

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const result = await fetchListWithItems(supabase, id)
  if (!result) notFound()

  const { list, items, creator } = result
  const isOwner = user?.id === list.user_id

  // Block non-owners from private lists
  if (!list.is_public && !isOwner) notFound()

  const creatorName = creator.display_name || creator.username || "Someone"
  const creatorHref = creator.username
    ? `/u/${encodeURIComponent(creator.username)}`
    : null

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "28px 16px 80px",
        fontFamily: FONT,
      }}
    >
      {/* Back nav */}
      {creatorHref && (
        <Link
          href={creatorHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "rgba(255,255,255,0.38)",
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          ← {creatorName}
        </Link>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "clamp(22px,5vw,32px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "rgba(255,255,255,0.94)",
                lineHeight: 1.15,
              }}
            >
              {list.title}
            </h1>

            {/* Chips row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {list.is_ranked && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(251,191,36,0.8)",
                    border: "0.5px solid rgba(251,191,36,0.25)",
                    borderRadius: 4,
                    padding: "2px 7px",
                  }}
                >
                  Ranked
                </span>
              )}
              {!list.is_ranked && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.3)",
                    border: "0.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 4,
                    padding: "2px 7px",
                  }}
                >
                  Unranked
                </span>
              )}
              {isOwner && !list.is_public && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(251,113,133,0.8)",
                    border: "0.5px solid rgba(251,113,133,0.22)",
                    borderRadius: 4,
                    padding: "2px 7px",
                  }}
                >
                  Private
                </span>
              )}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
        </div>

        {/* Creator line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 14,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#534AB7,#1D9E75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                alt={creatorName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              creatorName.charAt(0).toUpperCase()
            )}
          </div>
          {creatorHref ? (
            <Link
              href={creatorHref}
              style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}
            >
              {creatorName}
            </Link>
          ) : (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{creatorName}</span>
          )}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            ·{" "}
            {new Date(list.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>

        {list.description && (
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {list.description}
          </p>
        )}
      </div>

      <div
        style={{
          height: "0.5px",
          background: "rgba(255,255,255,0.07)",
          marginBottom: 28,
        }}
      />

      {/* Owner view: full editor */}
      {isOwner ? (
        <ListItemsEditor
          listId={list.id}
          initialItems={items}
          initialList={{
            title: list.title,
            description: list.description,
            is_public: list.is_public,
            is_ranked: list.is_ranked,
          }}
        />
      ) : (
        /* Visitor view: static read-only items */
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.25)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              No items in this list yet.
            </p>
          )}
          {items.map((item, idx) => {
            const href = getMediaHref({ id: item.media_id, mediaType: item.media_type })
            return (
              <Link
                key={item.id}
                href={href}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 0",
                    borderBottom: "0.5px solid rgba(255,255,255,0.055)",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Rank number */}
                  {list.is_ranked && <RankBadge n={idx + 1} />}

                  {/* Poster */}
                  <div
                    style={{
                      width: 40,
                      height: 60,
                      borderRadius: 4,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "rgba(255,255,255,0.04)",
                      border: "0.5px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {item.poster_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          opacity: 0.3,
                        }}
                      >
                        🎬
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.88)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.title}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.year && (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                          {item.year}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: TYPE_COLOR[item.media_type] ?? "rgba(255,255,255,0.3)",
                        }}
                      >
                        {TYPE_LABEL[item.media_type] ?? item.media_type}
                      </span>
                    </div>
                    {item.notes && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 12,
                          color: "rgba(255,255,255,0.3)",
                          fontStyle: "italic",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
