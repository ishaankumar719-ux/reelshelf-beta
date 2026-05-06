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
  vote_average?: number;
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

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <span style={{ ...sectionLabelStyle, margin: 0, flexShrink: 0 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: "0.5px",
          background: "rgba(255,255,255,0.07)",
        }}
      />
    </div>
  );
}

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
          minHeight: "clamp(220px, 38vw, 320px)",
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
              "linear-gradient(to bottom, rgba(8,8,20,0.15) 0%, rgba(8,8,20,0.5) 50%, rgba(8,8,20,1.0) 90%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 1020,
            margin: "0 auto",
            padding: "0 20px 24px",
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
                width: 130,
                height: 195,
                borderRadius: 10,
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
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
                    marginBottom: 8,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {person.known_for_department}
                </div>
              ) : null}

              <h1
                style={{
                  fontSize: "clamp(30px, 4vw, 36px)",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.97)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                {person.name}
              </h1>

              {(person.birthday || person.place_of_birth) && (
                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "nowrap",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.42)",
                    margin: "8px 0 0",
                  }}
                >
                  {person.birthday ? <span>Born {formatDate(person.birthday)}</span> : null}
                  {person.birthday && age ? (
                    <>
                      <span>·</span>
                      <span>Age {age}</span>
                    </>
                  ) : null}
                  {person.place_of_birth ? (
                    <>
                      {(person.birthday || age) ? <span>·</span> : null}
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {person.place_of_birth}
                      </span>
                    </>
                  ) : null}
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
          padding: "32px 20px 56px",
        }}
      >
        {knownFor.length > 0 ? (
          <section style={{ marginBottom: 48 }}>
            <SectionHeader label="Known for" />
            <div className="scroll-row" style={scrollRowStyle}>
              {knownFor.map((item) => (
                <KnownForCard
                  key={`${item.mediaType}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  poster_path={item.poster_path}
                  year={item.year}
                  vote_average={item.vote_average}
                  character={item.character}
                  mediaType={item.mediaType}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ marginBottom: 48 }}>
          <SectionHeader label="Biography" />
          <div style={{ maxWidth: 680 }}>
            {biography ? (
              <>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: "rgba(255,255,255,0.68)",
                    letterSpacing: "0.01em",
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
                    {bioExpanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                ) : null}
              </>
            ) : (
              <div
                style={{
                  padding: "20px 0",
                  borderLeft: "2px solid rgba(255,255,255,0.08)",
                  paddingLeft: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.25)",
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  No biography available for this person.
                </p>
              </div>
            )}
          </div>
        </section>

        {topMovies.length > 0 ? (
          <section style={{ marginBottom: 48 }}>
            <SectionHeader label="Films" />
            <div className="scroll-row" style={scrollRowStyle}>
              {topMovies.map((item) => (
                <KnownForCard
                  key={`movie-${item.id}`}
                  id={item.id}
                  title={item.title}
                  poster_path={item.poster_path}
                  year={item.year}
                  vote_average={item.vote_average}
                  character={item.character}
                  mediaType="movie"
                />
              ))}
            </div>
          </section>
        ) : null}

        {topTV.length > 0 ? (
          <section style={{ marginBottom: 48 }}>
            <SectionHeader label="TV shows" />
            <div className="scroll-row" style={scrollRowStyle}>
              {topTV.map((item) => (
                <KnownForCard
                  key={`tv-${item.id}`}
                  id={item.id}
                  title={item.title}
                  poster_path={item.poster_path}
                  year={item.year}
                  vote_average={item.vote_average}
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
