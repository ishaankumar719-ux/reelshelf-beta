export const MOOD_SEED_DATA = {
  boost: {
    label: "Need a boost",
    emoji: "⚡",
    titles: [
      "Paddington 2",
      "The Grand Budapest Hotel",
      "School of Rock",
      "Chef",
      "Spider-Man: Into the Spider-Verse",
    ],
  },
  sad: {
    label: "Feeling sad",
    emoji: "🌧",
    titles: [
      "Her",
      "Aftersun",
      "Manchester by the Sea",
      "The Worst Person in the World",
      "Eternal Sunshine of the Spotless Mind",
    ],
  },
  scared: {
    label: "Want to be scared",
    emoji: "👁",
    titles: [
      "Hereditary",
      "The Conjuring",
      "Get Out",
      "The Descent",
      "The Substance",
    ],
  },
  cry: {
    label: "Want to cry",
    emoji: "💧",
    titles: [
      "The Iron Claw",
      "Past Lives",
      "Coco",
      "Grave of the Fireflies",
      "About Time",
    ],
  },
  comfort: {
    label: "Need comfort",
    emoji: "🛋",
    titles: [
      "Harry Potter and the Philosopher's Stone",
      "The Princess Bride",
      "Friends",
      "Ted Lasso",
      "The Secret Life of Walter Mitty",
    ],
  },
  chaos: {
    label: "Want chaos",
    emoji: "🔥",
    titles: [
      "Uncut Gems",
      "Babylon",
      "Mad Max: Fury Road",
      "Everything Everywhere All at Once",
      "The Wolf of Wall Street",
    ],
  },
  romantic: {
    label: "Something romantic",
    emoji: "🌹",
    titles: [
      "Before Sunrise",
      "When Harry Met Sally",
      "La La Land",
      "Pride & Prejudice",
      "Past Lives",
    ],
  },
  mindblowing: {
    label: "Something mind-blowing",
    emoji: "🌀",
    titles: [
      "Interstellar",
      "Inception",
      "Arrival",
      "Oldboy",
      "Parasite",
    ],
  },
  background: {
    label: "Easy background watch",
    emoji: "☕",
    titles: [
      "Brooklyn Nine-Nine",
      "The Office",
      "Friends",
      "Parks and Recreation",
      "Modern Family",
    ],
  },
  acclaimed: {
    label: "Critically acclaimed",
    emoji: "🏆",
    titles: [
      "Parasite",
      "The Godfather",
      "12 Angry Men",
      "Spirited Away",
      "The Shawshank Redemption",
    ],
  },
} as const;

export type MoodKey = keyof typeof MOOD_SEED_DATA;
