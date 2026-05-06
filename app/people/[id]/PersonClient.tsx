"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import KnownForCard from "../../../components/person/KnownForCard";

interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  known_for_department: string;
  profile_path: string | null;
  place_of_birth: string | null;
  popularity: number;
}

interface CreditItem {
  id: number;
  title: string;
  character: string;
  poster_path: string;
  year: string;
  vote_average: number;
}

interface KnownForItem {
  id: number;
  title: string;
  poster_path: string;
  year: string;
  character?: string;
  mediaType: "movie" | "tv";
}

interface PersonClientProps {
  person: TMDBPerson;
  topMovies: CreditItem[];
  topTV: CreditItem[];
  knownFor: KnownForItem[];
}

const sectionLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.3)",
  margin: "0 0 16px",
  display: "block",
};

const scrollRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 8,
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PersonClient({
  person,
  topMovies,
  topTV,
  knownFor,
}: PersonClientProps) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const age =
    person.birthday && !person.deathday
      ? Math.floor(
          (Date.now() - new Date(person.birthday).getTime()) / 31557600000
        )
      : null;
  const biography = person.biography?.trim() ?? "";
  const collapsedBiography =
    biography.length > 400 ? `${biography.slice(0, 400)}…` : biography;

  return (
    <main style={{ background: "#08080f", minHeight: "100vh", color: "white" }}>
      <style>{`.scroll-row::-webkit-scrollbar { display: none; }`}</style>

      <section
        style={{
          position: "relative",
          minHeight: "clamp(220px, 34vw, 280px)",
          overflow: "hidden",
          background: person.profile_path ? "#08080f" : "#0d0d1a",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {person.profile_path ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(https://image.tmdb.org/t/p/w342${person.profile_path})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              filter: "blur(24px) brightness(0.25) saturate(1.1)",
              transform: "scale(1.1)",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(8,8,20,0.2) 0%, rgba(8,8,20,1) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 1020,
            margin: "0 auto",
            padding: "0 24px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 110,
                height: 165,
                borderRadius: 10,
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                background: "linear-gradient(135deg, #1e1e35, #2a2a45)",
              }}
            >
              {person.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w342${person.profile_path}`}
                  alt={person.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 40,
                    fontWeight: 700,
                  }}
                >
                  {getInitials(person.name)}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 240 }}>
              {person.known_for_department ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 20,
                    padding: "3px 10px",
                    background: "rgba(255,255,255,0.1)",
                    fontSize: 11,
                    marginBottom: 6,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {person.known_for_department}
                </div>
              ) : null}

              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                {person.name}
              </h1>

              {(person.birthday || person.place_of_birth) && (
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    margin: "6px 0 0",
                  }}
                >
                  {person.birthday
                    ? `Born ${formatDate(person.birthday)}${
                        age ? ` · age ${age}` : ""
                      }`
                    : ""}
                  {person.place_of_birth
                    ? `${person.birthday ? " · " : ""}${person.place_of_birth}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          maxWidth: 1020,
          margin: "0 auto",
          padding: "40px 20px 56px",
        }}
      >
        {knownFor.length > 0 ? (
          <section style={{ marginBottom: 40 }}>
            <p style={sectionLabelStyle}>Known for</p>
            <div className="scroll-row" style={scrollRowStyle}>
              {knownFor.map((item) => (
                <KnownForCard
                  key={`${item.mediaType}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  poster_path={item.poster_path}
                  year={item.year}
                  character={item.character}
                  mediaType={item.mediaType}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ marginBottom: 40 }}>
          <p style={sectionLabelStyle}>Biography</p>
          {biography ? (
            <>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.7)",
                  margin: 0,
                }}
              >
                {bioExpanded ? biography : collapsedBiography}
              </p>
              {biography.length > 400 ? (
                <button
                  type="button"
                  onClick={() => setBioExpanded((previous) => !previous)}
                  style={{
                    fontSize: 13,
                    color: "rgba(29,158,117,0.9)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    marginTop: 6,
                  }}
                >
                  {bioExpanded ? "Show less" : "Read more"}
                </button>
              ) : null}
            </>
          ) : (
            <p
              style={{
                fontStyle: "italic",
                color: "rgba(255,255,255,0.3)",
                fontSize: 14,
                margin: 0,
              }}
            >
              No biography available.
            </p>
          )}
        </section>

        {topMovies.length > 0 ? (
          <section style={{ marginBottom: 40 }}>
            <p style={sectionLabelStyle}>Films</p>
            <div className="scroll-row" style={scrollRowStyle}>
              {topMovies.map((item) => (
                <KnownForCard
                  key={`movie-${item.id}`}
                  id={item.id}
                  title={item.title}
                  poster_path={item.poster_path}
                  year={item.year}
                  character={item.character}
                  mediaType="movie"
                />
              ))}
            </div>
          </section>
        ) : null}

        {topTV.length > 0 ? (
          <section style={{ marginBottom: 40 }}>
            <p style={sectionLabelStyle}>TV shows</p>
            <div className="scroll-row" style={scrollRowStyle}>
              {topTV.map((item) => (
                <KnownForCard
                  key={`tv-${item.id}`}
                  id={item.id}
                  title={item.title}
                  poster_path={item.poster_path}
                  year={item.year}
                  character={item.character}
                  mediaType="tv"
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
