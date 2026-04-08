export const localBooks = [
  {
    id: "the-alchemist",
    title: "The Alchemist",
    year: "1988",
    author: "Paulo Coelho",
    genre: "Literary Fiction",
    pages: "208 pages",
    cover: null,
    overview:
      "A shepherd named Santiago follows a recurring dream across continents in search of treasure and purpose.",
  },
  {
    id: "dune-book",
    title: "Dune",
    year: "1965",
    author: "Frank Herbert",
    genre: "Science Fiction",
    pages: "688 pages",
    cover: null,
    overview:
      "Paul Atreides is thrust into a vast interstellar conflict over prophecy, empire, and survival on Arrakis.",
  },
  {
    id: "the-secret-history",
    title: "The Secret History",
    year: "1992",
    author: "Donna Tartt",
    genre: "Dark Academia",
    pages: "559 pages",
    cover: null,
    overview:
      "An elite classics group at a New England college slips from intellectual obsession into murder.",
  },
  {
    id: "the-song-of-achilles",
    title: "The Song of Achilles",
    year: "2011",
    author: "Madeline Miller",
    genre: "Mythic Fiction",
    pages: "416 pages",
    cover: null,
    overview:
      "Patroclus recounts a lyrical, intimate retelling of Achilles' myth from youth to war at Troy.",
  },
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    year: "2018",
    author: "James Clear",
    genre: "Self-Improvement",
    pages: "320 pages",
    cover: null,
    overview:
      "A practical framework for building good habits, breaking bad ones, and improving through tiny changes.",
  },
  {
    id: "the-psychology-of-money",
    title: "The Psychology of Money",
    year: "2020",
    author: "Morgan Housel",
    genre: "Personal Finance",
    pages: "256 pages",
    cover: null,
    overview:
      "A concise exploration of how behavior, emotion, and perspective shape financial decision-making.",
  },
  {
    id: "normal-people",
    title: "Normal People",
    year: "2018",
    author: "Sally Rooney",
    genre: "Contemporary Fiction",
    pages: "273 pages",
    cover: null,
    overview:
      "Marianne and Connell circle each other through school, class, intimacy, and emotional distance.",
  },
  {
    id: "a-little-life",
    title: "A Little Life",
    year: "2015",
    author: "Hanya Yanagihara",
    genre: "Literary Fiction",
    pages: "832 pages",
    cover: null,
    overview:
      "Four friends build adult lives in New York while one carries devastating private pain.",
  },
  {
    id: "the-midnight-library",
    title: "The Midnight Library",
    year: "2020",
    author: "Matt Haig",
    genre: "Speculative Fiction",
    pages: "304 pages",
    cover: null,
    overview:
      "Between life and death, Nora Seed explores alternate versions of the life she might have lived.",
  },
  {
    id: "the-silent-patient",
    title: "The Silent Patient",
    year: "2019",
    author: "Alex Michaelides",
    genre: "Psychological Thriller",
    pages: "336 pages",
    cover: null,
    overview:
      "A psychotherapist becomes obsessed with treating a woman who shot her husband and then stopped speaking.",
  },
  {
    id: "intermezzo",
    title: "Intermezzo",
    year: "2024",
    author: "Sally Rooney",
    genre: "Contemporary Fiction",
    pages: "448 pages",
    cover: null,
    overview:
      "Two brothers and the women in their orbit navigate grief, intimacy, and the shape of a life after loss.",
  },
  {
    id: "tomorrow-and-tomorrow-and-tomorrow",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    year: "2022",
    author: "Gabrielle Zevin",
    genre: "Literary Fiction",
    pages: "416 pages",
    cover: null,
    overview:
      "Two game designers build a creative partnership that spans decades of friendship, ambition, and heartbreak.",
  },
] as const;

export type LocalBook = (typeof localBooks)[number];
export type ResolvedLocalBook = LocalBook & { coverUrl: string | null };

const localBookByRouteId = new Map<string, LocalBook>(
  localBooks.map((book) => [book.id, book])
);

export function getLocalBookByRouteId(id: string) {
  return localBookByRouteId.get(id);
}
