export type MoodItemType = "film" | "tv" | "book";

export type MoodItem = {
  title: string;
  year: number;
  type: MoodItemType;
  author?: string;
};

export type MoodConfig = {
  id: string;
  label: string;
  emoji: string;
  items: MoodItem[];
};

export const MOOD_DATA: MoodConfig[] = [
  {
    id: "boost",
    label: "Need a boost",
    emoji: "⚡",
    items: [
      { title: "Paddington 2", year: 2017, type: "film" },
      { title: "The Grand Budapest Hotel", year: 2014, type: "film" },
      { title: "School of Rock", year: 2003, type: "film" },
      { title: "Chef", year: 2014, type: "film" },
      { title: "Spider-Man: Into the Spider-Verse", year: 2018, type: "film" },
      { title: "Ted Lasso", year: 2020, type: "tv" },
      { title: "Abbott Elementary", year: 2021, type: "tv" },
      { title: "The Bear", year: 2022, type: "tv" },
      { title: "The Midnight Library", author: "Matt Haig", year: 2020, type: "book" },
      { title: "A Man Called Ove", author: "Fredrik Backman", year: 2012, type: "book" },
      { title: "Eleanor Oliphant Is Completely Fine", author: "Gail Honeyman", year: 2017, type: "book" },
    ],
  },
  {
    id: "sad",
    label: "Feeling sad",
    emoji: "🌧",
    items: [
      { title: "Her", year: 2013, type: "film" },
      { title: "Aftersun", year: 2022, type: "film" },
      { title: "Manchester by the Sea", year: 2016, type: "film" },
      { title: "The Worst Person in the World", year: 2021, type: "film" },
      { title: "Eternal Sunshine of the Spotless Mind", year: 2004, type: "film" },
      { title: "Normal People", year: 2020, type: "tv" },
      { title: "I May Destroy You", year: 2020, type: "tv" },
      { title: "A Little Life", author: "Hanya Yanagihara", year: 2015, type: "book" },
      { title: "The Year of Magical Thinking", author: "Joan Didion", year: 2005, type: "book" },
    ],
  },
  {
    id: "scared",
    label: "Want to be scared",
    emoji: "👁",
    items: [
      { title: "Hereditary", year: 2018, type: "film" },
      { title: "The Conjuring", year: 2013, type: "film" },
      { title: "Get Out", year: 2017, type: "film" },
      { title: "The Descent", year: 2005, type: "film" },
      { title: "The Substance", year: 2024, type: "film" },
      { title: "The Haunting of Hill House", year: 2018, type: "tv" },
      { title: "Marianne", year: 2019, type: "tv" },
      { title: "The Shining", author: "Stephen King", year: 1977, type: "book" },
      { title: "Mexican Gothic", author: "Silvia Moreno-Garcia", year: 2020, type: "book" },
      { title: "House of Leaves", author: "Mark Z. Danielewski", year: 2000, type: "book" },
    ],
  },
  {
    id: "cry",
    label: "Want to cry",
    emoji: "💧",
    items: [
      { title: "The Iron Claw", year: 2023, type: "film" },
      { title: "Past Lives", year: 2023, type: "film" },
      { title: "Coco", year: 2017, type: "film" },
      { title: "Grave of the Fireflies", year: 1988, type: "film" },
      { title: "About Time", year: 2013, type: "film" },
      { title: "This Is Us", year: 2016, type: "tv" },
      { title: "The Leftovers", year: 2014, type: "tv" },
      { title: "When Breath Becomes Air", author: "Paul Kalanithi", year: 2016, type: "book" },
      { title: "The Lovely Bones", author: "Alice Sebold", year: 2002, type: "book" },
      { title: "Flowers for Algernon", author: "Daniel Keyes", year: 1966, type: "book" },
    ],
  },
  {
    id: "comfort",
    label: "Need comfort",
    emoji: "🛋",
    items: [
      { title: "Harry Potter and the Philosopher's Stone", year: 2001, type: "film" },
      { title: "The Princess Bride", year: 1987, type: "film" },
      { title: "The Secret Life of Walter Mitty", year: 2013, type: "film" },
      { title: "Paddington", year: 2014, type: "film" },
      { title: "Friends", year: 1994, type: "tv" },
      { title: "Ted Lasso", year: 2020, type: "tv" },
      { title: "The Great British Bake Off", year: 2010, type: "tv" },
      { title: "Gilmore Girls", year: 2000, type: "tv" },
      { title: "The House in the Cerulean Sea", author: "TJ Klune", year: 2020, type: "book" },
      { title: "Winnie-the-Pooh", author: "A.A. Milne", year: 1926, type: "book" },
      { title: "Comfort Me with Apples", author: "Catherynne M. Valente", year: 2021, type: "book" },
    ],
  },
  {
    id: "chaos",
    label: "Want chaos",
    emoji: "🔥",
    items: [
      { title: "Uncut Gems", year: 2019, type: "film" },
      { title: "Babylon", year: 2022, type: "film" },
      { title: "Mad Max: Fury Road", year: 2015, type: "film" },
      { title: "Everything Everywhere All at Once", year: 2022, type: "film" },
      { title: "The Wolf of Wall Street", year: 2013, type: "film" },
      { title: "The Bear", year: 2022, type: "tv" },
      { title: "Succession", year: 2018, type: "tv" },
      { title: "American Gods", author: "Neil Gaiman", year: 2001, type: "book" },
      { title: "Blood Meridian", author: "Cormac McCarthy", year: 1985, type: "book" },
      { title: "The Raw Shark Texts", author: "Steven Hall", year: 2007, type: "book" },
    ],
  },
  {
    id: "romantic",
    label: "Something romantic",
    emoji: "🌹",
    items: [
      { title: "Before Sunrise", year: 1995, type: "film" },
      { title: "When Harry Met Sally", year: 1989, type: "film" },
      { title: "La La Land", year: 2016, type: "film" },
      { title: "Pride & Prejudice", year: 2005, type: "film" },
      { title: "Past Lives", year: 2023, type: "film" },
      { title: "Normal People", year: 2020, type: "tv" },
      { title: "Fleabag", year: 2016, type: "tv" },
      { title: "Pride and Prejudice", author: "Jane Austen", year: 1813, type: "book" },
      { title: "One Day", author: "David Nicholls", year: 2009, type: "book" },
      { title: "The Notebook", author: "Nicholas Sparks", year: 1996, type: "book" },
    ],
  },
  {
    id: "mindblowing",
    label: "Something mind-blowing",
    emoji: "🌀",
    items: [
      { title: "Interstellar", year: 2014, type: "film" },
      { title: "Inception", year: 2010, type: "film" },
      { title: "Arrival", year: 2016, type: "film" },
      { title: "Oldboy", year: 2003, type: "film" },
      { title: "Parasite", year: 2019, type: "film" },
      { title: "Dark", year: 2017, type: "tv" },
      { title: "Severance", year: 2022, type: "tv" },
      { title: "Annihilation", author: "Jeff VanderMeer", year: 2014, type: "book" },
      { title: "Recursion", author: "Blake Crouch", year: 2019, type: "book" },
      { title: "Project Hail Mary", author: "Andy Weir", year: 2021, type: "book" },
    ],
  },
  {
    id: "background",
    label: "Easy background watch",
    emoji: "☕",
    items: [
      { title: "Brooklyn Nine-Nine", year: 2013, type: "tv" },
      { title: "The Office", year: 2005, type: "tv" },
      { title: "Friends", year: 1994, type: "tv" },
      { title: "Parks and Recreation", year: 2009, type: "tv" },
      { title: "Modern Family", year: 2009, type: "tv" },
      { title: "Schitt's Creek", year: 2015, type: "tv" },
      { title: "Taskmaster", year: 2015, type: "tv" },
      { title: "Bored and Brilliant", author: "Manoush Zomorodi", year: 2017, type: "book" },
    ],
  },
  {
    id: "acclaimed",
    label: "Critically acclaimed",
    emoji: "🏆",
    items: [
      { title: "Parasite", year: 2019, type: "film" },
      { title: "The Godfather", year: 1972, type: "film" },
      { title: "12 Angry Men", year: 1957, type: "film" },
      { title: "Spirited Away", year: 2001, type: "film" },
      { title: "The Shawshank Redemption", year: 1994, type: "film" },
      { title: "The Wire", year: 2002, type: "tv" },
      { title: "Breaking Bad", year: 2008, type: "tv" },
      { title: "Chernobyl", year: 2019, type: "tv" },
      { title: "To Kill a Mockingbird", author: "Harper Lee", year: 1960, type: "book" },
      { title: "1984", author: "George Orwell", year: 1949, type: "book" },
      { title: "Beloved", author: "Toni Morrison", year: 1987, type: "book" },
    ],
  },
];

export type MoodKey = (typeof MOOD_DATA)[number]["id"];
