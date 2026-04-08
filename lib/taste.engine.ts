export type LoggedMovieInput = {
  title: string;
  genres: string[];
  director: string;
  year: number;
  runtime: number;
  voteAverage: number;
};

export type TasteVector = {
  genres: Record<string, number>;
  directors: Record<string, number>;
  decades: Record<string, number>;
  pacingScore: number;
  darknessScore: number;
  prestigeScore: number;
  totalEntries: number;
};

export function createEmptyTasteVector(): TasteVector {
  return {
    genres: {},
    directors: {},
    decades: {},
    pacingScore: 0,
    darknessScore: 0,
    prestigeScore: 0,
    totalEntries: 0,
  };
}

function addWeight(map: Record<string, number>, key: string, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

function getDecade(year: number) {
  return `${Math.floor(year / 10) * 10}s`;
}

function getPacingWeight(runtime: number) {
  if (runtime >= 160) return 1;
  if (runtime >= 130) return 0.75;
  if (runtime >= 105) return 0.45;
  return 0.15;
}

function getDarknessWeight(genres: string[], voteAverage: number) {
  let score = 0;

  const lowerGenres = genres.map((genre) => genre.toLowerCase());

  if (lowerGenres.includes("thriller")) score += 0.8;
  if (lowerGenres.includes("crime")) score += 0.8;
  if (lowerGenres.includes("mystery")) score += 0.7;
  if (lowerGenres.includes("drama")) score += 0.45;
  if (lowerGenres.includes("horror")) score += 1;
  if (lowerGenres.includes("war")) score += 0.75;
  if (lowerGenres.includes("science fiction")) score += 0.35;
  if (lowerGenres.includes("romance")) score -= 0.2;
  if (lowerGenres.includes("comedy")) score -= 0.35;
  if (lowerGenres.includes("family")) score -= 0.45;
  if (lowerGenres.includes("animation")) score -= 0.15;

  if (voteAverage >= 8) score += 0.35;
  if (voteAverage < 6.5) score -= 0.2;

  return score;
}

function getPrestigeWeight(director: string, voteAverage: number, runtime: number) {
  let score = 0;

  const prestigeDirectors = [
    "Christopher Nolan",
    "Denis Villeneuve",
    "David Fincher",
    "Martin Scorsese",
    "Paul Thomas Anderson",
    "Damien Chazelle",
    "Ari Aster",
    "Bong Joon-ho",
    "Park Chan-wook",
    "Michael Mann",
    "Stanley Kubrick",
  ];

  if (prestigeDirectors.includes(director)) score += 1;
  if (voteAverage >= 7.5) score += 0.7;
  if (runtime >= 140) score += 0.35;

  return score;
}

export function addMovieToTasteVector(
  current: TasteVector,
  movie: LoggedMovieInput
): TasteVector {
  const next: TasteVector = {
    genres: { ...current.genres },
    directors: { ...current.directors },
    decades: { ...current.decades },
    pacingScore: current.pacingScore,
    darknessScore: current.darknessScore,
    prestigeScore: current.prestigeScore,
    totalEntries: current.totalEntries,
  };

  movie.genres.forEach((genre) => addWeight(next.genres, genre, 1));
  addWeight(next.directors, movie.director, 1);
  addWeight(next.decades, getDecade(movie.year), 1);

  next.pacingScore += getPacingWeight(movie.runtime);
  next.darknessScore += getDarknessWeight(movie.genres, movie.voteAverage);
  next.prestigeScore += getPrestigeWeight(
    movie.director,
    movie.voteAverage,
    movie.runtime
  );
  next.totalEntries += 1;

  return next;
}

export function buildTasteVector(movies: LoggedMovieInput[]): TasteVector {
  return movies.reduce(
    (vector, movie) => addMovieToTasteVector(vector, movie),
    createEmptyTasteVector()
  );
}

export function getTopEntries(
  map: Record<string, number>,
  limit = 3
): Array<{ name: string; score: number }> {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, score]) => ({ name, score }));
}