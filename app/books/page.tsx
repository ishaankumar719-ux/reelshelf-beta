import { MediaCard } from "../../src/components/ui/MediaCard";
import { localBooks } from "../../lib/localBooks";
import { resolveBooksWithCovers } from "../../lib/bookCovers";

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
          <MediaCard
            key={book.id}
            title={book.title}
            year={book.year}
            posterUrl={book.coverUrl}
            mediaType="book"
            size="md"
            href={`/books/${book.id}`}
          />
        ))}
      </section>
    </main>
  );
}
