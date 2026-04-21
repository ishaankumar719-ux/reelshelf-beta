"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDiaryLog } from "../../hooks/useDiaryLog";
import { getMediaHref } from "../../lib/mediaRoutes";
import { createClient as createSupabaseClient } from "../../lib/supabase/client";
import type { SavedItem } from "./WatchlistGrid";

interface WatchlistCardProps {
  item: SavedItem;
  userId: string | null;
  onRemoved: (id: string) => void;
  onRestored: (item: SavedItem) => void;
}

export default function WatchlistCard({
  item,
  onRemoved,
  onRestored,
  userId,
}: WatchlistCardProps) {
  const router = useRouter();
  const { openLog } = useDiaryLog();
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const showFallback = !item.poster || imgError;

  async function handleRemove() {
    if (!userId || isRemoving) {
      return;
    }

    const supabase = createSupabaseClient();

    if (!supabase) {
      return;
    }

    setIsRemoving(true);
    onRemoved(item.id);

    const { error } = await supabase
      .from("saved_items")
      .delete()
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      console.error("[WATCHLIST] remove error:", error.message);
      onRestored(item);
    } else {
      console.log("[WATCHLIST] removed:", item.title);
    }

    setIsRemoving(false);
  }

  function handleOpen() {
    router.push(getMediaHref({ id: item.media_id, mediaType: item.media_type }));
  }

  function handleLog() {
    openLog({
      title: item.title,
      media_type: item.media_type,
      year: item.year,
      poster: item.poster ?? null,
      creator: item.creator ?? null,
      genres: item.genres,
      runtime: item.runtime ?? null,
      vote_average: item.vote_average ?? null,
      media_id: item.media_id,
    });
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: "#111122",
        }}
      >
        {!showFallback && (
          <img
            src={item.poster ?? undefined}
            alt={item.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={() => setImgError(true)}
          />
        )}

        {showFallback && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg, #1c1c32 0%, #0d0d1a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "40px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.1)",
                userSelect: "none",
              }}
            >
              {item.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            fontSize: "10px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "0.02em",
            ...(item.media_type === "tv"
              ? { background: "rgba(15,110,86,0.85)", color: "#d1f5e8" }
              : item.media_type === "book"
                ? { background: "rgba(83,74,183,0.85)", color: "#e8e6ff" }
                : { background: "rgba(55,138,221,0.85)", color: "#dbeeff" }),
          }}
        >
          {item.media_type === "tv"
            ? "Series"
            : item.media_type === "book"
              ? "Book"
              : "Film"}
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "16px",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s ease",
            pointerEvents: hovered ? "auto" : "none",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.92)",
              textAlign: "center",
              margin: "0 0 2px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.title}
          </p>

          <p
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              margin: "0 0 10px",
            }}
          >
            {item.year}
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleOpen();
            }}
            style={overlayBtn()}
          >
            Open
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleLog();
            }}
            style={overlayBtn({ teal: true })}
          >
            Log now
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleRemove();
            }}
            disabled={isRemoving}
            style={{
              ...overlayBtn({ danger: true }),
              opacity: isRemoving ? 0.7 : 1,
              cursor: isRemoving ? "wait" : "pointer",
            }}
          >
            Remove
          </button>
        </div>
      </div>

      <div style={{ padding: "8px 2px 0", marginTop: "0" }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.82)",
            margin: "0 0 2px",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            lineHeight: 1.35,
          }}
        >
          {item.title}
        </p>

        <p
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.35)",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.year}
          {item.creator ? ` · ${item.creator}` : ""}
        </p>

        <p
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.2)",
            margin: "3px 0 0",
          }}
        >
          Added{" "}
          {new Date(item.added_at).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

function overlayBtn({
  teal = false,
  danger = false,
}: {
  teal?: boolean;
  danger?: boolean;
} = {}) {
  return {
    width: "88%",
    padding: "8px 0",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "center" as const,
    border: danger
      ? "0.5px solid rgba(220,60,60,0.4)"
      : teal
        ? "0.5px solid rgba(29,158,117,0.55)"
        : "0.5px solid rgba(255,255,255,0.18)",
    background: danger
      ? "rgba(220,60,60,0.14)"
      : teal
        ? "rgba(29,158,117,0.2)"
        : "rgba(255,255,255,0.08)",
    color: danger
      ? "rgba(255,130,130,0.9)"
      : teal
        ? "rgba(100,215,170,0.95)"
        : "rgba(255,255,255,0.82)",
  };
}
