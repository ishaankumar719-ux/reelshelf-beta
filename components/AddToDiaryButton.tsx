"use client";

import { useDiaryLog } from "../hooks/useDiaryLog";
import type { MediaType } from "../lib/media";

type Props = {
  movie: {
    id: string;
    mediaType?: MediaType;
    title: string;
    year: number;
    poster?: string;
    director?: string;
    genres?: string[];
    runtime?: number;
    voteAverage?: number;
  };
};

export default function AddToDiaryButton({ movie }: Props) {
  const { openLog } = useDiaryLog();

  function handleAdd() {
    openLog({
      title: movie.title,
      media_type: movie.mediaType || "movie",
      year: movie.year,
      poster: movie.poster ?? null,
      creator: movie.director ?? null,
      genres: movie.genres,
      runtime: movie.runtime ?? null,
      vote_average: movie.voteAverage ?? null,
      media_id: movie.id,
    });
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      style={{
        padding: "12px 18px",
        borderRadius: 999,
        background: "white",
        color: "black",
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      Add to Diary
    </button>
  );
}
