"use client"

import { BOOK_POSTERS } from "@/data/books/posters"

export default function BookRow({
  title,
  books,
}: {
  title: string
  books: string[]
}) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-4 px-6">{title}</h2>

      <div className="flex gap-4 overflow-x-auto px-6 scrollbar-hide">
        {books.map((book) => (
          <div
            key={book}
            className="min-w-[160px] transition hover:scale-110 duration-300"
          >
            <img
              src={BOOK_POSTERS[book]}
              className="w-[160px] h-[240px] object-cover rounded-lg shadow-lg"
            />

            <p className="mt-2 text-sm font-medium line-clamp-1">{book}</p>
          </div>
        ))}
      </div>
    </div>
  )
}