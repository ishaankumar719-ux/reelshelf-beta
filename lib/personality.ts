import { getTopEntries, type TasteVector } from "./taste.engine";

export type CinematicDNAProfile = {
  archetype: string;
  tagline: string;
  topGenres: string[];
  topDirectors: string[];
  dominantDecade: string;
  pacingLabel: string;
  darknessLabel: string;
  prestigeLabel: string;
};

function getAverage(value: number, totalEntries: number) {
  if (totalEntries === 0) return 0;
  return value / totalEntries;
}

function getPacingLabel(averagePacing: number) {
  if (averagePacing >= 0.72) return "Slow-Burn";
  if (averagePacing >= 0.42) return "Measured";
  return "Fast-Moving";
}

function getDarknessLabel(averageDarkness: number) {
  if (averageDarkness >= 1.05) return "Dark";
  if (averageDarkness >= 0.45) return "Brooding";
  return "Lighter-Toned";
}

function getPrestigeLabel(averagePrestige: number) {
  if (averagePrestige >= 1.35) return "High Prestige";
  if (averagePrestige >= 0.75) return "Curated Mainstream";
  return "Pop Discovery";
}

function pickArchetype(input: {
  topGenres: string[];
  topDirectors: string[];
  pacingLabel: string;
  darknessLabel: string;
  prestigeLabel: string;
}): { archetype: string; tagline: string } {
  const joinedGenres = input.topGenres.join(" ").toLowerCase();
  const joinedDirectors = input.topDirectors.join(" ").toLowerCase();

  if (
    joinedGenres.includes("science fiction") &&
    input.pacingLabel === "Slow-Burn" &&
    input.prestigeLabel === "High Prestige"
  ) {
    return {
      archetype: "The Cosmic Seeker",
      tagline: "Drawn to scale, wonder, time and the unknown.",
    };
  }

  if (
    joinedGenres.includes("crime") &&
    joinedGenres.includes("thriller") &&
    input.darknessLabel === "Dark"
  ) {
    return {
      archetype: "The Neon Noir Mind",
      tagline: "You chase danger, shadows and moral collapse.",
    };
  }

  if (
    joinedGenres.includes("drama") &&
    input.pacingLabel === "Slow-Burn" &&
    input.prestigeLabel === "High Prestige"
  ) {
    return {
      archetype: "The Auteur Disciple",
      tagline: "You trust atmosphere, intent and directorial voice.",
    };
  }

  if (joinedGenres.includes("romance") && joinedGenres.includes("drama")) {
    return {
      archetype: "The Tragic Romantic",
      tagline: "You gravitate toward intimacy, longing and emotional fallout.",
    };
  }

  if (
    joinedDirectors.includes("christopher nolan") &&
    input.prestigeLabel !== "Pop Discovery"
  ) {
    return {
      archetype: "The Prestige Addict",
      tagline: "You love precision, spectacle and cerebral obsession.",
    };
  }

  if (joinedGenres.includes("horror") || joinedGenres.includes("mystery")) {
    return {
      archetype: "The Tension Collector",
      tagline: "You live for dread, uncertainty and psychological pull.",
    };
  }

  if (
    input.pacingLabel === "Fast-Moving" &&
    input.prestigeLabel === "Pop Discovery"
  ) {
    return {
      archetype: "The Adrenaline Curator",
      tagline: "You prefer momentum, energy and immediate payoff.",
    };
  }

  return {
    archetype: "The Cinematic Explorer",
    tagline: "Your taste is broad, evolving and driven by discovery.",
  };
}

export function generateCinematicDNA(
  taste: TasteVector
): CinematicDNAProfile {
  const topGenres = getTopEntries(taste.genres, 3).map((item) => item.name);
  const topDirectors = getTopEntries(taste.directors, 3).map(
    (item) => item.name
  );
  const dominantDecade =
    getTopEntries(taste.decades, 1)[0]?.name ?? "Unknown";

  const averagePacing = getAverage(taste.pacingScore, taste.totalEntries);
  const averageDarkness = getAverage(taste.darknessScore, taste.totalEntries);
  const averagePrestige = getAverage(taste.prestigeScore, taste.totalEntries);

  const pacingLabel = getPacingLabel(averagePacing);
  const darknessLabel = getDarknessLabel(averageDarkness);
  const prestigeLabel = getPrestigeLabel(averagePrestige);

  const { archetype, tagline } = pickArchetype({
    topGenres,
    topDirectors,
    pacingLabel,
    darknessLabel,
    prestigeLabel,
  });

  return {
    archetype,
    tagline,
    topGenres,
    topDirectors,
    dominantDecade,
    pacingLabel,
    darknessLabel,
    prestigeLabel,
  };
}
