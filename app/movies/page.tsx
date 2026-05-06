"use client";

import { MediaCard } from "../../src/components/ui/MediaCard";
import { localMovies } from "../../lib/localMovies";

const films = localMovies;

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
          <MediaCard
            key={film.id}
            title={film.title}
            year={film.year}
            posterUrl={film.poster}
            mediaType="film"
            size="md"
            href={`/films/${film.id}`}
          />
        ))}
      </section>
    </main>
  );
}
