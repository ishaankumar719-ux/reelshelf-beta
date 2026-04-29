"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDiaryLog } from "@/hooks/useDiaryLog";
import type { LogMediaInput } from "@/types/diary";

export interface TonightsPickItem {
  id: string;
  title: string;
  poster: string | null;
  year: number;
  creator?: string | null;
  genres?: string[];
  runtime?: number | null;
  mediaType: "movie" | "tv" | "book";
  href: string;
  addedAt: string;
  tmdbId?: number | null;
}

interface TonightsPickProps {
  exploreItems: TonightsPickItem[];
  watchlistItems: TonightsPickItem[];
  title?: string;
  exploreSubtitle?: string;
  watchlistSubtitle?: string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyHref?: string;
  emptyCta?: string;
}

type PickMode = "explore" | "watchlist";

function actionBtn({
  teal = false,
  muted = false,
  spinning = false,
}: { teal?: boolean; muted?: boolean; spinning?: boolean } = {}) {
  return {
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: muted || spinning ? "default" : "pointer",
    border: teal
      ? "0.5px solid rgba(29,158,117,0.45)"
      : muted
        ? "0.5px solid rgba(255,255,255,0.07)"
        : "0.5px solid rgba(255,255,255,0.18)",
    background: teal
      ? "rgba(29,158,117,0.18)"
      : muted
        ? "rgba(255,255,255,0.03)"
        : "rgba(255,255,255,0.08)",
    color: teal
      ? "rgba(100,215,170,0.95)"
      : muted
        ? "rgba(255,255,255,0.2)"
        : "rgba(255,255,255,0.82)",
    opacity: spinning ? 0.5 : 1,
    transition: "opacity 0.15s",
  } as const;
}

function randomItem(items: TonightsPickItem[]) {
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function getMediaLabel(mediaType: TonightsPickItem["mediaType"]) {
  if (mediaType === "tv") return "Series";
  if (mediaType === "book") return "Book";
  return "Film";
}

export default function TonightsPick({
  exploreItems,
  watchlistItems,
  title = "Tonight's Pick",
  exploreSubtitle = "A random film from tonight's wider horizon.",
  watchlistSubtitle = "Can't decide? Let ReelShelf choose from your saved queue.",
  emptyTitle = "Your watchlist is empty",
  emptyBody = "Add a few titles to your watchlist and ReelShelf will pick one for you.",
  emptyHref = "/movies",
  emptyCta = "Browse films",
}: TonightsPickProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PickMode>("explore");
  const [picked, setPicked] = useState<TonightsPickItem | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const items = mode === "explore" ? exploreItems : watchlistItems;

  let openLog: ((media: LogMediaInput) => void) | undefined;
  try {
    const ctx = useDiaryLog();
    openLog = ctx.openLog;
  } catch {
    openLog = undefined;
  }

  useEffect(() => {
    if (items.length > 0) {
      setPicked(randomItem(items));
      setRevealed(true);
    } else {
      setPicked(null);
      setRevealed(false);
    }
  }, [items, mode]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const spin = () => {
    if (items.length === 0 || spinning) return;

    const currentPickedId = picked?.id ?? null;
    setSpinning(true);
    setRevealed(false);

    let cycles = 0;
    intervalRef.current = window.setInterval(() => {
      setPicked(randomItem(items));
      cycles += 1;

      if (cycles >= 6) {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        const candidates =
          items.length > 1
            ? items.filter((item) => item.id !== currentPickedId)
            : items;
        const finalPick =
          candidates[Math.floor(Math.random() * candidates.length)] ?? items[0];

        setPicked(finalPick);
        setSpinning(false);
        setRevealed(true);
      }
    }, 100);
  };

  return (
    <section>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span style={{ fontSize: "16px" }}>🎲</span>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                  margin: 0,
                }}
              >
                {title}
              </h2>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.3)",
                margin: 0,
              }}
            >
              {mode === "explore"
                ? items.length > 0
                  ? exploreSubtitle
                  : "Explore is warming up — try again shortly."
                : items.length > 0
                  ? watchlistSubtitle
                  : "Add a few titles to your watchlist first"}
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px",
              borderRadius: 999,
              border: "0.5px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {([
              ["explore", "Explore"],
              ["watchlist", "My Watchlist"],
            ] as const).map(([value, label]) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: active
                      ? "0.5px solid rgba(255,255,255,0.14)"
                      : "0.5px solid transparent",
                    background: active ? "rgba(255,255,255,0.08)" : "transparent",
                    color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.42)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            border: "0.5px dashed rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "28px 24px",
            textAlign: "center",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.45)",
              margin: "0 0 8px",
            }}
          >
            {mode === "watchlist" ? emptyTitle : "No explore picks right now"}
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.28)",
              fontStyle: "italic",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {mode === "watchlist"
              ? emptyBody
              : "ReelShelf couldn't load a fresh explore pool just yet. Try again in a moment."}
          </p>
          <Link
            href={mode === "watchlist" ? emptyHref : "/movies"}
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 38,
              padding: "0 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "0.5px solid rgba(255,255,255,0.14)",
              color: "rgba(255,255,255,0.88)",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {mode === "watchlist" ? emptyCta : "Browse films"}
          </Link>
        </div>
      ) : null}

      {picked ? (
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
            padding: "16px",
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            transition: "opacity 0.2s ease",
            opacity: revealed ? 1 : 0,
          }}
        >
          <div
            style={{
              width: "72px",
              height: "108px",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#111122",
              flexShrink: 0,
              transition: "transform 0.15s ease",
              transform: spinning ? "scale(0.95)" : "scale(1)",
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
                  color: "rgba(255,255,255,0.12)",
                  fontSize: "22px",
                  fontWeight: 700,
                }}
              >
                {picked.title.charAt(0)}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "4px",
              }}
            >
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.92)",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {picked.title}
              </p>
              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.62)",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {getMediaLabel(picked.mediaType)}
              </span>
            </div>

            <p
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.4)",
                margin: "0 0 4px",
              }}
            >
              {picked.year}
              {picked.creator ? ` · ${picked.creator}` : ""}
            </p>

            <p
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.25)",
                margin: "0 0 14px",
              }}
            >
              Saved{" "}
              {new Date(picked.addedAt).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
              })}
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => router.push(picked.href)} style={actionBtn()}>
                Open details
              </button>

              <button
                onClick={() => {
                  if (openLog) {
                    openLog({
                      title: picked.title,
                      media_type: picked.mediaType,
                      year: picked.year,
                      poster: picked.poster ?? null,
                      creator: picked.creator ?? null,
                      genres: picked.genres ?? [],
                      runtime: picked.runtime ?? null,
                      ...(mode === "explore" && picked.tmdbId
                        ? { tmdb_id: picked.tmdbId }
                        : { media_id: picked.id }),
                    });
                  }
                }}
                style={actionBtn({ teal: true })}
              >
                Log now
              </button>

              <button
                onClick={spin}
                disabled={spinning || items.length <= 1}
                style={actionBtn({
                  muted: items.length <= 1,
                  spinning,
                })}
              >
                {spinning ? "…" : mode === "explore" ? "Spin again" : "Spin the Shelf"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
