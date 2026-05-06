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
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.26)",
  margin: 0,
  display: "block",
  flexShrink: 0,
};

const scrollRowStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  overflowX: "auto",
  paddingBottom: 12,
  paddingTop: 4,
  paddingRight: 32,
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  scrollBehavior: "smooth",
};

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 20,
      }}
    >
      <span style={sectionLabelStyle}>{label}</span>
      <div
        style={{
          flex: 1,
          height: "0.5px",
          background:
            "linear-gradient(to right, rgba(255,255,255,0.07) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "24px 20px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.2)",
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
        /* Scrollbar hide */
        .scroll-row::-webkit-scrollbar { display: none; }

        /* Scroll-row right-edge fade — desktop only */
        @media (min-width: 640px) {
          .scroll-fade-wrap {
            -webkit-mask-image: linear-gradient(
              to right,
              black 0%,
              black calc(100% - 72px),
              transparent 100%
            );
            mask-image: linear-gradient(
              to right,
              black 0%,
              black calc(100% - 72px),
              transparent 100%
            );
          }
        }

        /* Card hover — spring lift */
        .credit-card {
          transition:
            transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.22s ease;
          will-change: transform;
        }
        .credit-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
        }

        /* Mobile hero layout */
        @media (max-width: 600px) {
          .person-hero-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .person-portrait {
            width: 110px !important;
            height: 165px !important;
          }
          .person-name {
            font-size: clamp(28px, 7.5vw, 38px) !important;
          }
          .person-meta {
            flex-wrap: wrap !important;
          }
          .person-hero-content {
            padding: 0 16px 24px !important;
          }
          .person-body {
            padding: 28px 16px 60px !important;
          }
        }
      `}</style>

      {/* ── Hero ── */}
      <section
        style={{
          position: "relative",
          minHeight: "clamp(420px, 62vw, 600px)",
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
              backgroundImage: `url(https://image.tmdb.org/t/p/w780${person.profile_path})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              filter: "blur(32px) brightness(0.15) saturate(1.4)",
              transform: "scale(1.14)",
            }}
          />
        ) : null}

        {/* Radial depth — brightens top-left where portrait sits */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 55% 70% at 12% 30%, rgba(255,255,255,0.03) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Primary gradient vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(8,8,20,0.06) 0%, rgba(8,8,20,0.0) 12%, rgba(8,8,20,0.45) 58%, rgba(8,8,20,0.9) 82%, rgba(8,8,20,1.0) 100%)",
          }}
        />

        {/* Hero content */}
        <div
          className="person-hero-content"
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 1060,
            margin: "0 auto",
            padding: "0 28px 36px",
          }}
        >
          <div
            className="person-hero-row"
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 28,
            }}
          >
            {/* Portrait */}
            <div
              className="person-portrait"
              style={{
                width: 180,
                height: 270,
                borderRadius: 16,
                overflow: "hidden",
                flexShrink: 0,
                boxShadow:
                  "0 28px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.1)",
                background: "linear-gradient(145deg, #1c1c30, #28284a)",
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
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 52,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {getInitials(person.name)}
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 220, paddingBottom: 6 }}>
              {/* Department pill */}
              {person.known_for_department ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    padding: "4px 13px",
                    background: "rgba(29,158,117,0.12)",
                    border: "1px solid rgba(29,158,117,0.26)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    marginBottom: 11,
                    color: "rgba(29,158,117,0.9)",
                  }}
                >
                  {person.known_for_department}
                </div>
              ) : null}

              {/* Name */}
              <h1
                className="person-name"
                style={{
                  fontSize: "clamp(38px, 6vw, 58px)",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.97)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.03em",
                  margin: 0,
                  textShadow:
                    "0 2px 28px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.4)",
                }}
              >
                {person.name}
              </h1>

              {/* Metadata row */}
              {metaItems.length > 0 ? (
                <div
                  className="person-meta"
                  style={{
                    display: "flex",
                    gap: "8px 0",
                    marginTop: 14,
                    alignItems: "center",
                  }}
                >
                  {metaItems.map((item, index) => (
                    <span
                      key={item.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "baseline",
                        gap: 5,
                      }}
                    >
                      {index > 0 ? (
                        <span
                          style={{
                            color: "rgba(255,255,255,0.12)",
                            margin: "0 10px",
                            fontSize: 11,
                            userSelect: "none",
                          }}
                        >
                          /
                        </span>
                      ) : null}
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.09em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,0.24)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: "rgba(255,255,255,0.62)",
                          letterSpacing: "0.005em",
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

      {/* ── Body ── */}
      <div
        className="person-body"
        style={{
          maxWidth: 1060,
          margin: "0 auto",
          padding: "40px 28px 80px",
        }}
      >
        {/* Known For */}
        {knownFor.length > 0 ? (
          <section style={{ marginBottom: 56 }}>
            <SectionHeader label="Known for" />
            <div className="scroll-fade-wrap">
              <div className="scroll-row" style={scrollRowStyle}>
                {knownFor.map((item) => (
                  <div
                    key={`${item.mediaType}-${item.id}`}
                    className="credit-card"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <KnownForCard
                      id={item.id}
                      title={item.title}
                      poster_path={item.poster_path}
                      year={item.year}
                      vote_average={item.vote_average}
                      character={item.character}
                      mediaType={item.mediaType}
                      showMediaBadge
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Biography */}
        <section style={{ marginBottom: 56 }}>
          <SectionHeader label="Biography" />
          <div style={{ maxWidth: 700 }}>
            {biography ? (
              <div
                style={{
                  borderLeft: "2px solid rgba(29,158,117,0.22)",
                  paddingLeft: 20,
                }}
              >
                <p
                  style={{
                    fontSize: 16,
                    lineHeight: 1.92,
                    color: "rgba(255,255,255,0.72)",
                    letterSpacing: "0.012em",
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
                      fontWeight: 600,
                      color: "rgba(29,158,117,0.82)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      marginTop: 12,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {bioExpanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                ) : null}
              </div>
            ) : (
              <EmptyState message="No biography available for this person." />
            )}
          </div>
        </section>

        {/* Films */}
        <section style={{ marginBottom: 56 }}>
          <SectionHeader label="Films" />
          {topMovies.length > 0 ? (
            <div className="scroll-fade-wrap">
              <div className="scroll-row" style={scrollRowStyle}>
                {topMovies.map((item) => (
                  <div
                    key={`movie-${item.id}`}
                    className="credit-card"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <KnownForCard
                      id={item.id}
                      title={item.title}
                      poster_path={item.poster_path}
                      year={item.year}
                      vote_average={item.vote_average}
                      character={item.character}
                      mediaType="movie"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No film credits found." />
          )}
        </section>

        {/* Series */}
        <section style={{ marginBottom: 56 }}>
          <SectionHeader label="Series" />
          {topTV.length > 0 ? (
            <div className="scroll-fade-wrap">
              <div className="scroll-row" style={scrollRowStyle}>
                {topTV.map((item) => (
                  <div
                    key={`tv-${item.id}`}
                    className="credit-card"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <KnownForCard
                      id={item.id}
                      title={item.title}
                      poster_path={item.poster_path}
                      year={item.year}
                      vote_average={item.vote_average}
                      character={item.character}
                      mediaType="tv"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No TV credits found." />
          )}
        </section>
      </div>
    </main>
  );
}
