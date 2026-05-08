"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDiaryLog } from "@/hooks/useDiaryLog";
import type { LogMediaInput } from "@/types/diary";

export interface SavedItem {
  id: string;
  title: string;
  media_type: "movie" | "tv" | "book";
  year: number;
  poster: string | null;
  creator: string | null;
  media_id: string;
  added_at: string;
}

interface PickCardProps {
  title: string;
  mode: "explore" | "watchlist";
  watchlistItems?: SavedItem[];
}

interface NormalisedItem {
  title: string;
  year: number;
  poster: string | null;
  routeId: string;
  mediaType: "movie" | "tv";
  creator?: string | null;
  tmdbId?: number | null;
}

interface TrendingResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  media_type?: "movie" | "tv";
}

function Btn({
  label,
  onClick,
  teal = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  teal?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        padding: "6px 12px",
        borderRadius: "7px",
        fontSize: "11px",
        fontWeight: 500,
        fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        border: teal
          ? "0.5px solid rgba(29,158,117,0.45)"
          : "0.5px solid rgba(255,255,255,0.15)",
        background: teal ? "rgba(29,158,117,0.18)" : "rgba(255,255,255,0.07)",
        color: teal ? "rgba(100,215,170,0.95)" : "rgba(255,255,255,0.78)",
      }}
    >
      {label}
    </button>
  );
}

export default function PickCard({
  title,
  mode,
  watchlistItems,
}: PickCardProps) {
  const router = useRouter();
  const [pool, setPool] = useState<NormalisedItem[]>([]);
  const [picked, setPicked] = useState<NormalisedItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const intervalRef = useRef<number | null>(null);

  let openLog: ((media: LogMediaInput) => void) | undefined;
  try {
    ({ openLog } = useDiaryLog());
  } catch {
    openLog = undefined;
  }

  const pickOne = (sourcePool: NormalisedItem[], excludeTitle?: string) => {
    const candidates =
      sourcePool.length > 1
        ? sourcePool.filter((item) => item.title !== excludeTitle)
        : sourcePool;
    const nextPick = candidates[Math.floor(Math.random() * candidates.length)];
    if (nextPick) {
      setPicked(nextPick);
      setRevealed(true);
    }
  };

  useEffect(() => {
    async function loadExplorePool() {
      setLoading(true);
      try {
        const response = await fetch("/api/trending");
        const data = (await response.json()) as { results?: TrendingResult[] };
        const items: NormalisedItem[] = (data.results ?? [])
          .filter((result) => Boolean(result.poster_path))
          .map((result) => ({
            title: result.title ?? result.name ?? "",
            year: parseInt(
              (result.release_date ?? result.first_air_date ?? "0").slice(0, 4),
              10
            ),
            poster: result.poster_path
              ? `https://image.tmdb.org/t/p/w342${result.poster_path}`
              : null,
            routeId: String(result.id),
            mediaType: (result.media_type === "tv" ? "tv" : "movie") as "movie" | "tv",
            tmdbId: result.id,
          }))
          .filter((item) => item.title.length > 0);

        setPool(items);
        if (items.length > 0) {
          pickOne(items);
        }
      } catch (error) {
        console.error("[PICK CARD] explore fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    function loadWatchlistPool() {
      const items: NormalisedItem[] = (watchlistItems ?? [])
        .filter((item) => item.media_type === "movie" || item.media_type === "tv")
        .map((item) => ({
          title: item.title,
          year: item.year,
          poster: item.poster ?? null,
          routeId: item.media_id,
          mediaType: item.media_type as "movie" | "tv",
          creator: item.creator ?? null,
        }));

      setPool(items);
      if (items.length > 0) {
        pickOne(items);
      }
      setRevealed(true);
    }

    if (mode === "explore") {
      void loadExplorePool();
    } else {
      loadWatchlistPool();
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [mode, watchlistItems]);

  const spin = () => {
    if (pool.length === 0 || spinning) return;
    setSpinning(true);
    setRevealed(false);
    const currentTitle = picked?.title;
    let cycles = 0;

    intervalRef.current = window.setInterval(() => {
      const preview = pool[Math.floor(Math.random() * pool.length)];
      if (preview) {
        setPicked(preview);
      }
      cycles += 1;
      if (cycles >= 8) {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        pickOne(pool, currentTitle);
        setSpinning(false);
      }
    }, 80);
  };

  const handleOpen = () => {
    if (!picked) return;
    const route =
      picked.mediaType === "tv"
        ? `/series/${picked.routeId}`
        : `/films/${picked.routeId}`;
    router.push(route);
  };

  const handleLog = () => {
    if (!picked || !openLog) return;
    openLog({
      title: picked.title,
      media_type: picked.mediaType,
      year: picked.year,
      poster: picked.poster,
      ...(mode === "explore" && picked.tmdbId
        ? { tmdb_id: picked.tmdbId }
        : {}),
    });
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        minHeight: "200px",
        flex: 1,
      }}
    >
      <p
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.34)",
          margin: 0,
          fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
        }}
      >
        {title}
      </p>

      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.2)",
            fontSize: "13px",
            fontStyle: "italic",
          }}
        >
          Finding something…
        </div>
      ) : null}

      {!loading && mode === "watchlist" && pool.length === 0 ? (
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.38)",
              marginBottom: "8px",
              lineHeight: 1.5,
              marginTop: 0,
            }}
          >
            Add titles to your watchlist and ReelShelf will pick one for you
          </p>
          <button
            type="button"
            onClick={() => router.push("/search")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              background: "rgba(255,255,255,0.07)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.65)",
              cursor: "pointer",
            }}
          >
            Browse films →
          </button>
        </div>
      ) : null}

      {!loading && picked && (mode === "explore" || pool.length > 0) ? (
        <div
          style={{
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.18s ease",
            flex: 1,
          }}
        >
          <div
            style={{
              width: "64px",
              height: "96px",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#111122",
              flexShrink: 0,
              transform: spinning ? "scale(0.93)" : "scale(1)",
              transition: "transform 0.12s ease",
            }}
          >
            {picked.poster ? (
              <img
                src={picked.poster}
                alt={picked.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                {picked.title.charAt(0)}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                margin: "0 0 3px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {picked.title}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.35)",
                margin: "0 0 14px",
              }}
            >
              {picked.year}
              {picked.creator ? ` · ${picked.creator}` : ""}
            </p>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <Btn label="Open" onClick={handleOpen} />
              {openLog ? <Btn label="Log" onClick={handleLog} teal /> : null}
              <Btn
                label={spinning ? "…" : "🎲"}
                onClick={spin}
                disabled={spinning || pool.length <= 1}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
