export type FranchiseMediaType = "film" | "book" | "series";

type FranchiseTitle = {
  id: string;
  title: string;
  year: number;
  type: FranchiseMediaType;
};

type FranchiseCommunity = {
  slug: string;
  name: string;
  description: string;
  titles: FranchiseTitle[];
  discussion: { title: string; prompt: string };
  featured?: { title: string; tagline: string; bookId: string; filmId: string };
};

export const hungerGamesCommunity: FranchiseCommunity = {
  slug: "the-hunger-games",
  name: "The Hunger Games",
  description: "Explore Panem across Suzanne Collins’s novels and their screen adaptations.",
  titles: [
    { id: "OL5735363W", title: "The Hunger Games", year: 2008, type: "book" },
    { id: "OL5735360W", title: "Catching Fire", year: 2009, type: "book" },
    { id: "OL14908941W", title: "Mockingjay", year: 2010, type: "book" },
    { id: "OL20716197W", title: "The Ballad of Songbirds and Snakes", year: 2020, type: "book" },
    { id: "OL43426400W", title: "Sunrise on the Reaping", year: 2025, type: "book" },
    { id: "70160", title: "The Hunger Games", year: 2012, type: "film" },
    { id: "101299", title: "The Hunger Games: Catching Fire", year: 2013, type: "film" },
    { id: "131631", title: "The Hunger Games: Mockingjay – Part 1", year: 2014, type: "film" },
    { id: "131634", title: "The Hunger Games: Mockingjay – Part 2", year: 2015, type: "film" },
    { id: "695721", title: "The Hunger Games: The Ballad of Songbirds & Snakes", year: 2023, type: "film" },
    { id: "1300968", title: "The Hunger Games: Sunrise on the Reaping", year: 2026, type: "film" },
  ],
  featured: {
    title: "Sunrise on the Reaping",
    tagline: "Return to the 50th Hunger Games, decades before Katniss, on the page and on screen.",
    bookId: "OL43426400W",
    filmId: "1300968",
  },
  discussion: {
    title: "What did the Hunger Games books make you feel that the films didn’t?",
    prompt: "Pick a character, scene or detail that stayed with you, and think about what changed when it moved from page to screen.",
  },
};

const communities = [hungerGamesCommunity];

export function getFranchiseCommunity(slug: string) {
  return communities.find((community) => community.slug === slug);
}

export function getFranchiseCommunityForTitle(type: FranchiseTitle["type"], id: string) {
  return communities.find((community) =>
    community.titles.some((title) => title.type === type && title.id === id),
  );
}
