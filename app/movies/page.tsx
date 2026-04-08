"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { localMovies } from "../../lib/localMovies";

const films = localMovies;

type Film = (typeof films)[number];

function FilmCard({ film }: { film: Film }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/movies/${film.id}`} style={{ textDecoration: "none" }}>
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
          }}
        >
          <Image
            src={film.poster}
            alt={film.title}
            fill
            sizes="(max-width: 900px) 50vw, 20vw"
            style={{
              objectFit: "cover",
              transform: hovered ? "scale(1.03)" : "scale(1)",
              transition: "transform 0.45s ease",
            }}
          />

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
              }}
            >
              {film.title}
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
              {film.year}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function MoviesPage() {
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
          Films
        </h1>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {films.map((film) => (
          <FilmCard key={film.id} film={film} />
        ))}
      </section>
    </main>
  );
}
