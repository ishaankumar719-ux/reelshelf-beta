"use client";

import { saveDiaryDraft } from "../lib/diary";
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
  function handleAdd() {
    saveDiaryDraft({
      ...movie,
      mediaType: movie.mediaType || "movie",
    });
    window.location.href = "/diary/log";
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
