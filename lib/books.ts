export type Book = {
  id: string
  title: string
  author: string
  cover: string | null
}

function isGoodCover(url?: string | null) {
  if (!url) return false

  const badWords = [
    "books.googleusercontent",
    "pdf",
    "text",
    "snippet",
    "frontcover=false",
  ]

  return !badWords.some((w) => url.includes(w))
}

export async function searchBooks(query: string): Promise<Book[]> {
  const res = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=intitle:${query}&maxResults=10&printType=books&key=${process.env.GOOGLE_BOOKS_API_KEY}`,
    { cache: "no-store" }
  )

  if (!res.ok) return []

  const data = await res.json()
  if (!data.items) return []

  const cleaned = data.items
    .map((item: any) => ({
      id: item.id,
      title: item.volumeInfo?.title || "Untitled",
      author: item.volumeInfo?.authors?.[0] || "Unknown",
      cover: item.volumeInfo?.imageLinks?.thumbnail
        ? item.volumeInfo.imageLinks.thumbnail.replace("http://", "https://")
        : null,
    }))
    .filter((b: Book) => isGoodCover(b.cover))

  return cleaned.slice(0, 1) // ⭐ ONLY TAKE BEST RESULT
}

export async function getBooksByTitles(titles: string[]) {
  const results = await Promise.all(
    titles.map((title) => searchBooks(title))
  )

  return results.flat()
}
