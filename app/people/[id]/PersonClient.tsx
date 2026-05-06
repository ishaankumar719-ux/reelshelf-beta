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
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.28)",
  margin: "0 0 16px",
  display: "block",
};

const scrollRowStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  overflowX: "auto",
  paddingBottom: 10,
  paddingTop: 2,
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
        marginBottom: 18,
      }}
    >
      <span style={{ ...sectionLabelStyle, margin: 0, flexShrink: 0 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: "0.5px",
          background: "rgba(255,255,255,0.06)",
        }}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "28px 20px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.22)",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        {message}
      </p>
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
  const BIO_COLLAPSE_THRESHOLD = 700;
  const collapsedBiography =
    biography.length > BIO_COLLAPSE_THRESHOLD
      ? `${biography.slice(0, BIO_COLLAPSE_THRESHOLD)}…`
      : biography;

  const metaItems: { label: string; value: string }[] = [];
  if (person.birthday) {
    metaItems.push({ label: "Born", value: formatDate(person.birthday) });
  }
  if (person.deathday) {
    metaItems.push({ label: "Died", value: formatDate(person.deathday) });
  }
  if (age !== null) {
    metaItems.push({ label: "Age", value: String(age) });
  }
  if (person.place_of_birth) {
    metaItems.push({ label: "From", value: person.place_of_birth });
  }

  return (
    <main style={{ background: "#08080f", minHeight: "100vh", color: "white" }}>
      <style>{`
        .scroll-row::-webkit-scrollbar { display: none; }
        .known-for-card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .known-for-card-hover:hover { transform: scale(1.04); box-shadow: 0 8px 28px rgba(0,0,0,0.5); }
      `}</style>

      {/* Hero */}
      <section
        style={{
          position: "relative",
          minHeight: "clamp(360px, 55vw, 520px)",
          overflow: "hidden",
          background: "#08080f",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {/* Blurred portrait backdrop */}
        {person.profile_path ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(https://image.tmdb.org/t/p/w500${person.profile_path})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              filter: "blur(28px) brightness(0.2) saturate(1.2)",
              transform: "scale(1.12)",
            }}
          />
        ) : null}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(8,8,20,0.1) 0%, rgba(8,8,20,0.0) 20%, rgba(8,8,20,0.55) 65%, rgba(8,8,20,1.0) 92%)",
          }}
        />

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 1060,
            margin: "0 auto",
            padding: "0 24px 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            {/* Portrait */}
            <div
              style={{
                width: 170,
                height: 255,
                borderRadius: 14,
                overflow: "hidden",
                flexShrink: 0,
                boxShadow:
                  "0 20px 60px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.09)",
                background: "linear-gradient(135deg, #1e1e35, #2a2a45)",
              }}
            >
              {person.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
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
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 48,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {getInitials(person.name)}
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 240, paddingBottom: 4 }}>
              {/* Department pill */}
              {person.known_for_department ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    padding: "4px 12px",
                    background: "rgba(29,158,117,0.13)",
                    border: "1px solid rgba(29,158,117,0.28)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                    color: "rgba(29,158,117,0.95)",
                  }}
                >
                  {person.known_for_department}
                </div>
              ) : null}

              {/* Name */}
              <h1
                style={{
                  fontSize: "clamp(36px, 5.5vw, 54px)",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.97)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  textShadow: "0 2px 24px rgba(0,0,0,0.85)",
                }}
              >
                {person.name}
              </h1>

              {/* Metadata row */}
              {metaItems.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px 0",
                    marginTop: 12,
                    alignItems: "center",
                  }}
                >
                  {metaItems.map((item, index) => (
                    <span
                      key={item.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {index > 0 ? (
                        <span
                          style={{
                            color: "rgba(255,255,255,0.15)",
                            margin: "0 8px",
                            fontSize: 12,
                          }}
                        >
                          ·
                        </span>
                      ) : null}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,0.28)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.6)",
                          marginLeft: 3,
                        }}
                      >
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div
        style={{
          maxWidth: 1060,
          margin: "0 auto",
          padding: "36px 24px 72px",
        }}
      >
        {/* Known For */}
        {knownFor.length > 0 ? (
          <section style={{ marginBottom: 52 }}>
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
                  showMediaBadge
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Biography */}
        <section style={{ marginBottom: 52 }}>
          <SectionHeader label="Biography" />
          <div style={{ maxWidth: 700 }}>
            {biography ? (
              <>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.88,
                    color: "rgba(255,255,255,0.65)",
                    letterSpacing: "0.01em",
                    margin: 0,
                  }}
                >
                  {bioExpanded ? biography : collapsedBiography}
                </p>
                {biography.length > BIO_COLLAPSE_THRESHOLD ? (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((prev) => !prev)}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgba(29,158,117,0.85)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      marginTop: 10,
                    }}
                  >
                    {bioExpanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                ) : null}
              </>
            ) : (
              <EmptyState message="No biography available for this person." />
            )}
          </div>
        </section>

        {/* Films */}
        <section style={{ marginBottom: 52 }}>
          <SectionHeader label="Films" />
          {topMovies.length > 0 ? (
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
          ) : (
            <EmptyState message="No film credits found." />
          )}
        </section>

        {/* Series */}
        <section style={{ marginBottom: 52 }}>
          <SectionHeader label="Series" />
          {topTV.length > 0 ? (
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
          ) : (
            <EmptyState message="No TV credits found." />
          )}
        </section>
      </div>
    </main>
  );
}
