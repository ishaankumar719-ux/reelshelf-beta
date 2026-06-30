import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AddToDiaryButton from "../../../components/AddToDiaryButton";
import AddToWatchlistButton from "../../../components/AddToWatchlistButton";
import ShareButton from "../../../components/detail/ShareButton";
import BecauseYouLikedRow from "../../../components/BecauseYouLikedRow";
import MediaReviewsSection from "../../../components/reviews/MediaReviewsSection";
import TrackRecentView from "../../../components/TrackRecentView";
import {
  getLocalBookByRouteId,
  localBooks,
  type LocalBook,
} from "../../../lib/localBooks";
import { localMovies } from "../../../lib/localMovies";
import { COLLECTION_DEFS, type CollectionDef } from "../../../lib/discoverCollections";
import { getBookHrefFromRouteId, normalizeBookRouteId, isOpenLibraryId } from "../../../lib/bookRoutes";
import { resolveBookCover, resolveBooksWithCovers } from "../../../lib/bookCovers";
import BookDescription from "../../../components/BookDescription";

const SANS_FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';

function getBookCollections(title: string, year: string | number): CollectionDef[] {
  const yr = parseInt(String(year));
  const lower = title.toLowerCase();
  return COLLECTION_DEFS.filter((def) => {
    if (!def.localFilter) return false;
    switch (def.localFilter) {
      case "classic-literature":
        return !isNaN(yr) && yr < 1980;
      case "books-to-screen":
        return localMovies.some((m) => m.title.toLowerCase() === lower);
      default:
        return false;
    }
  });
}

function AppearsInSection({ collections }: { collections: CollectionDef[] }) {
  if (!collections.length) return null;
  return (
    <section style={{ margin: "32px 0 16px" }}>
      <h2 style={{
        margin: "0 0 12px",
        fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.3)",
        fontFamily: SANS_FONT,
      }}>
        Appears in
      </h2>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
        {collections.map((col) => (
          <a
            key={col.slug}
            href={`/discover/collection/${col.slug}`}
            style={{
              flexShrink: 0, padding: "12px 16px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              textDecoration: "none", display: "flex", flexDirection: "column", gap: 4, maxWidth: 220,
            }}
          >
            <span style={{ fontFamily: SANS_FONT, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.3 }}>
              {col.name}
            </span>
            <span style={{
              fontFamily: SANS_FONT, fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.45,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {col.description}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function BackButton() {
  return (
    <Link
      href="/books"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 28,
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "#d1d5db",
        textDecoration: "none",
        fontSize: 13,
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 14 }}>←</span>
      <span>Back to Books</span>
    </Link>
  );
}

function FallbackCover() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 18,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 50%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.38)",
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        ReelShelf
      </span>

      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.58)",
          fontSize: 20,
        }}
      >
        B
      </div>
    </div>
  );
}

function DetailPill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 36,
        padding: "9px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        color: "#e5e7eb",
        fontSize: 13,
        lineHeight: 1,
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
      }}
    >
      {label}
    </span>
  );
}

function ActionButtons({
  book,
}: {
  book: {
    id: string;
    mediaType: "book";
    title: string;
    year: number;
    poster?: string;
    director?: string;
    genres?: string[];
    runtime?: number;
    voteAverage?: number;
  };
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        marginTop: 30,
        marginBottom: 32,
        flexWrap: "wrap",
      }}
    >
      <AddToDiaryButton movie={book} />
      <AddToWatchlistButton movie={book} />
      <ShareButton style={{ borderRadius: 10 }} />
    </div>
  );
}

function RecommendationCard({
  book,
}: {
  book: LocalBook & { coverUrl: string | null };
}) {
  return (
    <Link
      href={getBookHrefFromRouteId(book.id)}
      style={{
        textDecoration: "none",
        color: "white",
        width: 180,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 180,
          aspectRatio: "2 / 3",
          borderRadius: 16,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #151515 0%, #0b0b0b 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
        }}
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <FallbackCover />
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 38%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.02) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.1,
              letterSpacing: "-0.4px",
              fontWeight: 600,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {book.title}
          </h3>

          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,0.75)",
              fontSize: 12,
              fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
            }}
          >
            {book.year}
          </p>
        </div>
      </div>
    </Link>
  );
}

function RelatedBooksSection({
  books,
}: {
  books: Array<LocalBook & { coverUrl: string | null }>;
}) {
  if (!books.length) {
    return null;
  }

  return (
    <section
      style={{
        marginTop: 42,
        padding: 24,
        borderRadius: 26,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(18,18,18,0.94) 0%, rgba(10,10,10,0.94) 100%)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 24,
          letterSpacing: "-0.8px",
          fontWeight: 500,
        }}
      >
        Related books
      </h2>

      <p
        style={{
          margin: "0 0 18px",
          color: "#9ca3af",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        More reads with a similar mood, author, or shelf energy.
      </p>

      <div
        className="hide-scroll-x"
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {books.map((book) => (
          <RecommendationCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}

function getRelatedBooks(book: LocalBook) {
  const sameAuthor = localBooks.filter(
    (entry) => entry.id !== book.id && entry.author === book.author
  );
  const sameGenre = localBooks.filter(
    (entry) =>
      entry.id !== book.id &&
      entry.author !== book.author &&
      entry.genre === book.genre
  );
  const others = localBooks.filter(
    (entry) =>
      entry.id !== book.id &&
      entry.author !== book.author &&
      entry.genre !== book.genre
  );

  return [...sameAuthor, ...sameGenre, ...others].slice(0, 8);
}

// ── Open Library data fetching ────────────────────────────────────────────────

type OLWorkData = {
  title: string;
  author: string;
  year: string;
  description: string;
  coverUrl: string | null;
  subjects: string[];
};

function cleanDescription(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")                          // HTML tags
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1")       // *italic* / **bold**
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")          // [text](url) → text
    .replace(/^[-*]{3,}\s*$/gm, "")                   // --- *** dividers
    .replace(/^Source title:.*$/gim, "")               // "Source title: X" lines
    .replace(/https?:\/\/\S+/g, "")                    // bare URLs
    .replace(/\n{3,}/g, "\n\n")                        // collapse excess newlines
    .trim();
}

function extractOLDescription(raw: unknown): string {
  if (typeof raw === "string") return cleanDescription(raw);
  if (raw && typeof raw === "object" && "value" in (raw as object)) {
    return cleanDescription(((raw as Record<string, unknown>).value as string) ?? "");
  }
  return "";
}

const DESCRIPTION_MIN = 80;
const DESCRIPTION_FALLBACK = "No overview is available for this book yet.";

async function fetchOpenLibraryWork(workId: string): Promise<OLWorkData | null> {
  try {
    const worksRes = await fetch(
      `https://openlibrary.org/works/${workId}.json`,
      { cache: "force-cache" }
    );
    if (!worksRes.ok) return null;
    const work = await worksRes.json() as {
      title?: string;
      description?: unknown;
      first_sentence?: unknown;
      excerpt?: unknown;
      covers?: number[];
      authors?: Array<{ author?: { key?: string } }>;
      first_publish_date?: string;
      subjects?: string[];
    };

    const title = work.title ?? "Unknown Title";
    const coverUrl = work.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${work.covers[0]}-L.jpg`
      : null;
    const year = (work.first_publish_date ?? "").match(/\d{4}/)?.[0] ?? "—";
    const subjects = (work.subjects ?? []).slice(0, 3) as string[];

    // Priority 1: work description
    let description = extractOLDescription(work.description);

    // Priority 2: first_sentence
    if (description.length < DESCRIPTION_MIN) {
      const fs = extractOLDescription(work.first_sentence);
      if (fs.length >= DESCRIPTION_MIN) description = fs;
    }

    // Priority 3: excerpt
    if (description.length < DESCRIPTION_MIN) {
      const ex = extractOLDescription(work.excerpt);
      if (ex.length >= DESCRIPTION_MIN) description = ex;
    }

    const authorKey = work.authors?.[0]?.author?.key;
    const needsMoreDesc = description.length < DESCRIPTION_MIN;

    // Fetch author + (if needed) editions in parallel
    const [authorData, editionsData] = await Promise.all([
      authorKey
        ? fetch(`https://openlibrary.org${authorKey}.json`, { cache: "force-cache" })
            .then((r) => (r.ok ? (r.json() as Promise<{ name?: string }>) : null))
            .catch(() => null)
        : Promise.resolve(null),
      needsMoreDesc
        ? fetch(`https://openlibrary.org/works/${workId}/editions.json?limit=5`, { cache: "force-cache" })
            .then((r) => (r.ok ? (r.json() as Promise<{ entries?: Array<{ description?: unknown }> }>) : null))
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const author = authorData?.name ?? "Unknown Author";

    // Priority 4: best edition description
    if (description.length < DESCRIPTION_MIN && editionsData?.entries) {
      for (const edition of editionsData.entries) {
        const edDesc = extractOLDescription(edition.description);
        if (edDesc.length >= DESCRIPTION_MIN) {
          description = edDesc;
          break;
        }
      }
    }

    // Priority 5: Google Books
    if (description.length < DESCRIPTION_MIN && title !== "Unknown Title") {
      try {
        const gbRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}&maxResults=3`,
          { cache: "force-cache" }
        );
        if (gbRes.ok) {
          const gbData = await gbRes.json() as { items?: Array<{ volumeInfo?: { description?: string } }> };
          for (const item of (gbData.items ?? [])) {
            const gbDesc = cleanDescription(item.volumeInfo?.description ?? "");
            if (gbDesc.length >= DESCRIPTION_MIN) {
              description = gbDesc;
              break;
            }
          }
        }
      } catch {
        // network errors are non-fatal
      }
    }

    // Priority 6: subjects-based summary
    if (description.length < DESCRIPTION_MIN && subjects.length > 0) {
      const parts = subjects.slice(0, 3);
      const last = parts[parts.length - 1];
      const rest = parts.slice(0, -1);
      description = rest.length > 0
        ? `A work covering themes of ${rest.join(", ")} and ${last}.`
        : `A work covering the theme of ${last}.`;
    }

    // Priority 7: static fallback
    if (description.length < DESCRIPTION_MIN) {
      description = DESCRIPTION_FALLBACK;
    }

    return { title, author, year, description, coverUrl, subjects };
  } catch {
    return null;
  }
}

async function OpenLibraryBookPage({ workId }: { workId: string }) {
  const data = await fetchOpenLibraryWork(workId);

  if (!data) {
    notFound();
  }

  const book = {
    id: workId,
    mediaType: "book" as const,
    title: data.title,
    year: parseInt(data.year, 10) || 0,
    poster: data.coverUrl || undefined,
    director: data.author,
    genres: data.subjects,
    runtime: undefined,
    voteAverage: undefined,
  };

  return (
    <main style={{ padding: "0 0 80px" }}>
      <TrackRecentView item={book} />
      <style>{`
        @media (max-width: 900px) {
          .book-detail-grid { grid-template-columns: 1fr !important; }
          .book-detail-cover { max-width: 320px; }
        }
      `}</style>

      <BackButton />

      <section
        className="book-detail-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
          gap: 34,
          alignItems: "start",
        }}
      >
        <div
          className="book-detail-cover"
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            borderRadius: 24,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #171717 0%, #0a0a0a 100%)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
          }}
        >
          {data.coverUrl ? (
            <img
              src={data.coverUrl}
              alt={data.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <FallbackCover />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 42%, rgba(0,0,0,0.1) 100%)",
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.96) 100%)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
            padding: 28,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 38%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative" }}>
            <p
              style={{
                margin: 0,
                marginBottom: 12,
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Book
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(26px, 7vw, 56px)",
                lineHeight: 1.04,
                letterSpacing: "clamp(-0.6px, -0.2vw, -2px)",
                fontWeight: 500,
              }}
            >
              {data.title}
            </h1>

            <p
              style={{
                margin: "16px 0 0",
                color: "#d1d5db",
                fontSize: 17,
                lineHeight: 1.7,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {data.year} · By {data.author}
            </p>

            {data.subjects.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
                {data.subjects.map((s) => (
                  <DetailPill key={s} label={s} />
                ))}
                <DetailPill label={data.author} />
              </div>
            )}

            {/* Reading time estimate: ~1 min/page (250 words/page ÷ 250 wpm) */}
            {data.year && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                <DetailPill label={`Published ${data.year}`} />
              </div>
            )}

            <ActionButtons book={book} />

            <section
              style={{
                padding: 22,
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  color: "#9ca3af",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Overview
              </p>
              <BookDescription text={data.description} />
            </section>

            {/* Author card — visual only, no profile page for book authors */}
            <section style={{ marginTop: 24 }}>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Author
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #2a1f3a, #1a2a3a)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: "rgba(255,255,255,0.35)",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {data.author.trim()[0]?.toUpperCase() ?? "A"}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.88)",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    {data.author}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Author
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <AppearsInSection collections={getBookCollections(data.title, data.year)} />

      <MediaReviewsSection
        mediaIds={[workId]}
        mediaType="book"
        title={data.title}
        year={book.year}
        poster={data.coverUrl}
        creator={data.author}
        href={`/books/${workId}`}
      />
    </main>
  );
}

// ── Main page (local books + Open Library) ────────────────────────────────────

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const normalizedId = normalizeBookRouteId(id);

  if (!normalizedId) {
    notFound();
  }

  if (normalizedId !== id) {
    redirect(`/books/${normalizedId}`);
  }

  if (isOpenLibraryId(normalizedId)) {
    return <OpenLibraryBookPage workId={normalizedId} />;
  }

  const book = getLocalBookByRouteId(normalizedId);

  if (!book) {
    notFound();
  }

  const [coverUrl, relatedBooks] = await Promise.all([
    resolveBookCover(book),
    resolveBooksWithCovers(getRelatedBooks(book)),
  ]);

  return (
    <main style={{ padding: "0 0 80px" }}>
      <TrackRecentView
        item={{
          id: book.id,
          mediaType: "book",
          title: book.title,
          poster: coverUrl || undefined,
          year: Number(book.year),
          director: book.author,
          genres: [book.genre],
          runtime: undefined,
          voteAverage: undefined,
        }}
      />
      <style>{`
        @media (max-width: 900px) {
          .book-detail-grid {
            grid-template-columns: 1fr !important;
          }

          .book-detail-cover {
            max-width: 320px;
          }
        }
      `}</style>

      <BackButton />

      <section
        className="book-detail-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
          gap: 34,
          alignItems: "start",
        }}
      >
        <div
          className="book-detail-cover"
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            borderRadius: 24,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.1)",
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%), linear-gradient(180deg, #171717 0%, #0a0a0a 100%)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <FallbackCover />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 42%, rgba(0,0,0,0.1) 100%)",
              pointerEvents: "none",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.96) 100%)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
            padding: 28,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at top right, rgba(255,255,255,0.06), transparent 38%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative" }}>
            <p
              style={{
                margin: 0,
                marginBottom: 12,
                color: "#7f7f7f",
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              Book
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(26px, 7vw, 56px)",
                lineHeight: 1.04,
                letterSpacing: "clamp(-0.6px, -0.2vw, -2px)",
                fontWeight: 500,
              }}
            >
              {book.title}
            </h1>

            <p
              style={{
                margin: "16px 0 0",
                color: "#d1d5db",
                fontSize: 17,
                lineHeight: 1.7,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
              }}
            >
              {book.year} · By {book.author} · {book.genre}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 22,
              }}
            >
              <DetailPill label={book.genre} />
              <DetailPill label={book.pages} />
              <DetailPill label={book.author} />
              {(() => {
                const pageCount = parseInt(book.pages);
                if (!isNaN(pageCount) && pageCount > 0) {
                  const mins = pageCount; // ~1 min/page (250 words/page ÷ 250 wpm)
                  const hrs = Math.floor(mins / 60);
                  const rem = mins % 60;
                  const label = hrs > 0
                    ? `~${hrs}h ${rem > 0 ? `${rem}m` : ""} read`.trim()
                    : `~${mins}m read`;
                  return <DetailPill key="rt" label={label} />;
                }
                return null;
              })()}
            </div>

            <ActionButtons
              book={{
                id: book.id,
                mediaType: "book",
                title: book.title,
                year: Number(book.year),
                poster: coverUrl || undefined,
                director: book.author,
                genres: [book.genre],
                runtime: undefined,
                voteAverage: undefined,
              }}
            />

            <section
              style={{
                padding: 22,
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  color: "#9ca3af",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Overview
              </p>

              <BookDescription text={book.overview} />
            </section>

            {/* Author card — visual only, no profile page for book authors */}
            <section style={{ marginTop: 24 }}>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                }}
              >
                Author
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #2a1f3a, #1a2a3a)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: "rgba(255,255,255,0.35)",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {book.author.trim()[0]?.toUpperCase() ?? "A"}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.88)",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    {book.author}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                    }}
                  >
                    Author
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <AppearsInSection collections={getBookCollections(book.title, book.year)} />
      <RelatedBooksSection books={relatedBooks} />
      <BecauseYouLikedRow
        mediaType="book"
        currentId={book.id}
        currentTitle={book.title}
        currentCreator={book.author}
        currentGenres={[book.genre]}
        title={`Because you liked ${book.title}`}
      />
      <MediaReviewsSection
        mediaIds={[book.id]}
        mediaType="book"
        title={book.title}
        year={Number(book.year) || 0}
        poster={coverUrl}
        creator={book.author}
        href={`/books/${book.id}`}
      />
    </main>
  );
}
