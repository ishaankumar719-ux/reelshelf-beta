"use client";

import { MediaCard } from "../../src/components/ui/MediaCard";
import { localSeries } from "../../lib/localSeries";
import { getTMDBPosterUrl } from "../../lib/posters";

const seriesList = localSeries;

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
          <MediaCard
            key={series.id}
            title={series.title}
            year={series.year}
            posterUrl={getTMDBPosterUrl(series.posterPath ?? series.poster)}
            mediaType="series"
            size="md"
            href={`/series/${series.id}`}
          />
        ))}
      </section>
    </main>
  );
}
