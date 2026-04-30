"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDiaryLog } from "@/hooks/useDiaryLog";
import { pickSourceFilm, type SourceFilm } from "@/lib/sourceFilm";

interface BecauseYouLikedProps {
  diaryEntries: Array<{
    media_id: string;
    title: string;
    rating: unknown;
    watched_date: string;
  }>;
}

interface RecommendedFilm {
  id: number;
  title: string;
  release_date: string;
  poster_path: string;
  overview?: string;
}

interface RecommendationsResponse {
  sourceTitle?: string;
  sourceYear?: string;
  results?: RecommendedFilm[];
}

function recBtn({ teal = false }: { teal?: boolean } = {}) {
  return {
    padding: "6px 14px",
    borderRadius: "7px",
    fontSize: "11px",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center" as const,
    border: teal
      ? "0.5px solid rgba(29,158,117,0.45)"
      : "0.5px solid rgba(255,255,255,0.18)",
    background: teal ? "rgba(29,158,117,0.2)" : "rgba(255,255,255,0.08)",
    color: teal ? "rgba(100,215,170,0.95)" : "rgba(255,255,255,0.82)",
  };
}

function RecCard({
  film,
  onOpen,
  onLog,
}: {
  film: RecommendedFilm;
  onOpen: () => void;
  onLog: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const year = film.release_date?.slice(0, 4) ?? "";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{ cursor: "pointer", width: "140px", flexShrink: 0 }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "2/3",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#111122",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.15s ease",
        }}
      >
        {!imgError && film.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${film.poster_path}`}
            alt={film.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.1)",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            {film.title.charAt(0)}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s ease",
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
              fontSize: "12px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.9)",
              textAlign: "center",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {film.title}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            style={recBtn()}
          >
            Open
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onLog();
            }}
            style={recBtn({ teal: true })}
          >
            + Log
          </button>
        </div>
      </div>

      <div style={{ marginTop: "7px" }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.65)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {film.title}
        </p>
        <p
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.32)",
            margin: "2px 0 0",
          }}
        >
          {year}
        </p>
      </div>
    </div>
  );
}

export default function BecauseYouLiked({ diaryEntries }: BecauseYouLikedProps) {
  const router = useRouter();
  const [sourceFilm, setSourceFilm] = useState<SourceFilm | null>(null);
  const [sourceTitle, setSourceTitle] = useState("");
  const [recs, setRecs] = useState<RecommendedFilm[]>([]);
  const [loading, setLoading] = useState(true);

  let openLog:
    | ((media: {
        title: string;
        media_type: "movie";
        year: number;
        poster: string | null;
        tmdb_id: number;
      }) => void)
    | undefined;
  try {
    ({ openLog } = useDiaryLog());
  } catch {
    openLog = undefined;
  }

  useEffect(() => {
    const source = pickSourceFilm(diaryEntries);
    if (!source) {
      setLoading(false);
      return;
    }

    setSourceFilm(source);

    const fetchRecs = async () => {
      try {
        const response = await fetch(`/api/recommendations?id=${source.tmdbId}`);
        const data = (await response.json()) as RecommendationsResponse;
        setSourceTitle(data.sourceTitle || source.title);
        setRecs(data.results ?? []);
      } catch (error) {
        console.error("[BECAUSE YOU LIKED]", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchRecs();
  }, [diaryEntries]);

  const handleLog = (film: RecommendedFilm) => {
    if (!openLog) return;
    openLog({
      title: film.title,
      media_type: "movie",
      year: parseInt(film.release_date?.slice(0, 4) ?? "0", 10),
      poster: film.poster_path
        ? `https://image.tmdb.org/t/p/w342${film.poster_path}`
        : null,
      tmdb_id: film.id,
    });
  };

  if (!loading && (!sourceFilm || recs.length === 0)) return null;

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "40px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.3)",
            margin: "0 0 6px",
          }}
        >
          Because you liked
        </p>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            margin: "0 0 6px",
          }}
        >
          {loading ? "…" : sourceTitle}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "rgba(255,255,255,0.32)",
            fontStyle: "italic",
          }}
        >
          Films with a similar pulse
        </p>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              style={{
                width: "140px",
                flexShrink: 0,
                aspectRatio: "2/3",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.06)",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : null}

      {!loading && recs.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {recs.map((film) => (
            <RecCard
              key={film.id}
              film={film}
              onOpen={() => router.push(`/films/${film.id}`)}
              onLog={() => handleLog(film)}
            />
          ))}
        </div>
      ) : null}

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </section>
  );
}
