import Link from "next/link";
import { localBooks } from "../../lib/localBooks";
import { resolveBooksWithCovers } from "../../lib/bookCovers";

function FallbackCover() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 14,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 50%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.38)",
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
        }}
      >
        ReelShelf
      </span>

      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.58)",
          fontSize: 18,
        }}
      >
        B
      </div>
    </div>
  );
}

export default async function BooksPage() {
  const books = await resolveBooksWithCovers(localBooks);

  return (
    <main style={{ padding: "0 0 80px" }}>
      <section style={{ marginBottom: 14 }}>
        <p
          style={{
            color: "#8a8a8a",
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 4,
            fontFamily: "Arial, sans-serif",
          }}
        >
          Discover
        </p>

        <h1
          style={{
            fontSize: 30,
            margin: 0,
            letterSpacing: "-0.8px",
            fontWeight: 500,
          }}
        >
          Books
        </h1>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/books/${book.id}`}
            style={{ textDecoration: "none" }}
          >
            <article
              style={{
                position: "relative",
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#111",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                transition:
                  "transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "relative",
                  aspectRatio: "2 / 3",
                  overflow: "hidden",
                  background: "#111",
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
                      "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.02) 100%)",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    right: 14,
                    bottom: 14,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    minHeight: 62,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 18,
                      margin: 0,
                      letterSpacing: "-0.5px",
                      fontWeight: 600,
                      lineHeight: 1.15,
                      color: "white",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {book.title}
                  </h2>

                  <p
                    style={{
                      marginTop: 6,
                      marginBottom: 0,
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 12,
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    {book.year}
                  </p>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}
