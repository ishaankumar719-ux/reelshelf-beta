import { cache } from "react";
import type { LocalBook, ResolvedLocalBook } from "./localBooks";

function getOpenLibraryCoverUrl(coverId: number) {
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

const searchOpenLibraryCover = cache(
  async ({ title, author }: { title: string; author: string }) => {
    try {
      const searchParams = new URLSearchParams({
        title,
        author,
        limit: "5",
        fields: "cover_i,title,author_name",
      });

      const res = await fetch(
        `https://openlibrary.org/search.json?${searchParams.toString()}`,
        { next: { revalidate: 86400 } }
      );

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as {
        docs?: Array<{
          cover_i?: number;
          title?: string;
          author_name?: string[];
        }>;
      };

      const docs = data.docs || [];
      const normalizedTitle = title.toLowerCase();
      const normalizedAuthor = author.toLowerCase();

      const exactMatch =
        docs.find(
          (doc) =>
            doc.cover_i &&
            doc.title?.toLowerCase() === normalizedTitle &&
            doc.author_name?.some(
              (name) => name.toLowerCase() === normalizedAuthor
            )
        ) ||
        docs.find(
          (doc) =>
            doc.cover_i &&
            doc.title?.toLowerCase().includes(normalizedTitle)
        ) ||
        docs.find((doc) => doc.cover_i);

      return exactMatch?.cover_i ? getOpenLibraryCoverUrl(exactMatch.cover_i) : null;
    } catch (error) {
      console.error("[ReelShelf books] Open Library cover lookup failed", {
        title,
        author,
        error,
      });
      return null;
    }
  }
);

export async function resolveBookCover(book: LocalBook) {
  if (book.cover) {
    return book.cover;
  }

  return searchOpenLibraryCover({
    title: book.title,
    author: book.author,
  });
}

export async function resolveBooksWithCovers(
  books: readonly LocalBook[]
): Promise<ResolvedLocalBook[]> {
  return Promise.all(
    books.map(async (book) => ({
      ...book,
      coverUrl: await resolveBookCover(book),
    }))
  );
}
