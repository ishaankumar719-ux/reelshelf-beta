export type TMDBSearchMovie = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
};

export type TMDBMovieDetails = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  poster_path: string | null;
  credits?: {
    crew?: Array<{
      job: string;
      name: string;
    }>;
  };
};

export type TMDBWatchProviders = {
  results?: {
    GB?: {
      flatrate?: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string;
      }>;
      rent?: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string;
      }>;
      buy?: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string;
      }>;
    };
  };
};

export type TMDBRecommendation = {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
};

export type TMDBTVDetails = {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  number_of_seasons?: number | null;
  episode_run_time?: number[] | null;
  created_by?: Array<{
    name: string;
  }>;
  credits?: {
    crew?: Array<{
      job: string;
      name: string;
    }>;
  };
};

export type TMDBTVRecommendation = {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
};

export type TMDBTVSeasonDetails = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  air_date: string;
  episodes: Array<{
    id: number;
    name: string;
    overview: string;
    air_date: string;
    episode_number: number;
    runtime?: number | null;
    still_path: string | null;
  }>;
};

const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

export async function searchMovies(query: string): Promise<TMDBSearchMovie[]> {
  if (!API_KEY || !query.trim()) return [];

  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("TMDB search failed", res.status);
    return [];
  }

  const data = await res.json();
  return data.results || [];
}

export async function getMovieDetails(
  movieId: number
): Promise<TMDBMovieDetails | null> {
  if (!API_KEY) return null;

  const res = await fetch(
    `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  return res.json();
}

export async function getMovieWatchProviders(
  movieId: number
): Promise<TMDBWatchProviders | null> {
  if (!API_KEY) return null;

  const res = await fetch(
    `${BASE_URL}/movie/${movieId}/watch/providers?api_key=${API_KEY}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  return res.json();
}

export async function getMovieRecommendations(
  movieId: number
): Promise<TMDBRecommendation[]> {
  if (!API_KEY) return [];

  const res = await fetch(
    `${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}`,
    { cache: "no-store" }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.results || [];
}

export async function getTVDetails(tvId: number): Promise<TMDBTVDetails | null> {
  if (!API_KEY) return null;

  const res = await fetch(
    `${BASE_URL}/tv/${tvId}?api_key=${API_KEY}&append_to_response=credits`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  return res.json();
}

export async function getTVWatchProviders(
  tvId: number
): Promise<TMDBWatchProviders | null> {
  if (!API_KEY) return null;

  const res = await fetch(
    `${BASE_URL}/tv/${tvId}/watch/providers?api_key=${API_KEY}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  return res.json();
}

export async function getTVRecommendations(
  tvId: number
): Promise<TMDBTVRecommendation[]> {
  if (!API_KEY) return [];

  const res = await fetch(
    `${BASE_URL}/tv/${tvId}/recommendations?api_key=${API_KEY}`,
    { cache: "no-store" }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.results || [];
}

export async function getTVSeasonDetails(
  tvId: number,
  seasonNumber: number
): Promise<TMDBTVSeasonDetails | null> {
  if (!API_KEY) return null;

  const res = await fetch(
    `${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  return res.json();
}
