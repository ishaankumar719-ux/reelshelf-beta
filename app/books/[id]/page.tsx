import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AddToDiaryButton from "../../../components/AddToDiaryButton";
import AddToWatchlistButton from "../../../components/AddToWatchlistButton";
import BecauseYouLikedRow from "../../../components/BecauseYouLikedRow";
import TrackRecentView from "../../../components/TrackRecentView";
import {
  getLocalBookByRouteId,
  localBooks,
  type LocalBook,
} from "../../../lib/localBooks";
import { getBookHrefFromRouteId, normalizeBookRouteId } from "../../../lib/bookRoutes";
import { resolveBookCover, resolveBooksWithCovers } from "../../../lib/bookCovers";

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
                fontSize: 56,
                lineHeight: 1.02,
                letterSpacing: "-2px",
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

              <p
                style={{
                  margin: 0,
                  maxWidth: 760,
                  color: "#d1d5db",
                  lineHeight: 1.8,
                  fontSize: 17,
                }}
              >
                {book.overview}
              </p>
            </section>
          </div>
        </div>
      </section>

      <RelatedBooksSection books={relatedBooks} />
      <BecauseYouLikedRow
        mediaType="book"
        currentId={book.id}
        currentTitle={book.title}
        currentCreator={book.author}
        currentGenres={[book.genre]}
        title={`Because you liked ${book.title}`}
      />
    </main>
  );
}
