export type MediaType = "movie" | "tv" | "book";

export type SavedMediaItem = {
  id: string;
  mediaType: MediaType;
  title: string;
  poster?: string;
  year: number;
  director?: string;
  genres?: string[];
  runtime?: number;
  voteAverage?: number;
};
