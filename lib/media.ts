export type MediaType = "movie" | "tv" | "book";
export type DiaryReviewScope = "title" | "show" | "season" | "episode";

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
  reviewScope?: DiaryReviewScope;
  showId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};
