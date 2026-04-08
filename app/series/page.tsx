"use client";

import Link from "next/link";
import { useState } from "react";
import { localSeries } from "../../lib/localSeries";
import { getTMDBPosterUrl } from "../../lib/posters";

const seriesList = localSeries;

type Series = (typeof seriesList)[number];

function FallbackPoster() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 14,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 50%), linear-gradient(180deg, #171717 0%, #0b0b0b 100%)",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.38)",
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
        }}
      >
        ReelShelf
      </span>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.58)",
          fontSize: 18,
        }}
      >
        TV
      </div>
    </div>
  );
}

function SeriesCard({ series }: { series: Series }) {
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const posterUrl = getTMDBPosterUrl(series.posterPath ?? series.poster);

  return (
    <Link href={`/series/${series.id}`} style={{ textDecoration: "none" }}>
      <article
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          border: hovered
            ? "1px solid rgba(255,255,255,0.18)"
            : "1px solid rgba(255,255,255,0.08)",
          background: "#111",
          boxShadow: hovered
            ? "0 20px 50px rgba(0,0,0,0.55), 0 0 30px rgba(255,255,255,0.06)"
            : "0 10px 30px rgba(0,0,0,0.35)",
          transform: hovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
          transition:
            "transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "2 / 3",
            overflow: "hidden",
            background: "#111",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          {!imageFailed && posterUrl ? (
            <img
              src={posterUrl}
              alt={series.title}
              onError={() => setImageFailed(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: hovered ? "scale(1.03)" : "scale(1)",
                transition: "transform 0.45s ease",
              }}
            />
          ) : (
            <FallbackPoster />
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background: hovered
                ? "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.42) 35%, rgba(0,0,0,0.04) 65%, rgba(255,255,255,0.04) 100%)"
                : "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.02) 100%)",
              transition: "background 0.28s ease",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 14,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              minHeight: 62,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                margin: 0,
                letterSpacing: "-0.5px",
                fontWeight: 600,
                lineHeight: 1.15,
                color: "white",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {series.title}
            </h2>

            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: hovered ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.7)",
                fontSize: 12,
                transition: "color 0.28s ease",
                fontFamily: "Arial, sans-serif",
              }}
            >
              {series.year}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function SeriesPage() {
  return (
    <main style={{ padding: "0 0 80px" }}>
      <section style={{ marginBottom: 14 }}>
        <p
          style={{
            color: "#8a8a8a",
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: 4,
            fontFamily: "Arial, sans-serif",
          }}
        >
          Discover
        </p>

        <h1
          style={{
            fontSize: 30,
            margin: 0,
            letterSpacing: "-0.8px",
            fontWeight: 500,
          }}
        >
          Series
        </h1>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {seriesList.map((series) => (
          <SeriesCard key={series.id} series={series} />
        ))}
      </section>
    </main>
  );
}
