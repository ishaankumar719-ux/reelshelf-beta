"use client";

import Link from "next/link";
import { useState } from "react";

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface CastSectionProps {
  cast: CastMember[];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word.trim()[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CastCard({ member }: { member: CastMember }) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(member.profile_path) && !imgError;

  return (
    <Link
      href={`/people/${member.id}`}
      style={{
        width: 108,
        flexShrink: 0,
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        style={{
          width: 108,
          aspectRatio: "2 / 3",
          borderRadius: 12,
          overflow: "hidden",
          background: "linear-gradient(135deg, #1e1e35, #2a2a45)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          marginBottom: 8,
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
        className="cast-card-img"
      >
        {showImage ? (
          <img
            src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
            alt={member.name}
            loading="lazy"
            onError={() => setImgError(true)}
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
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.5px",
            }}
          >
            {getInitials(member.name)}
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.82)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          margin: "0 0 3px",
          lineHeight: 1.35,
        }}
      >
        {member.name}
      </p>
      {member.character && (
        <p
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          {member.character}
        </p>
      )}
    </Link>
  );
}

export default function CastSection({ cast }: CastSectionProps) {
  if (!cast.length) {
    return null;
  }

  return (
    <section style={{ marginTop: 32, marginBottom: 36 }}>
      <style>{`
        .cast-scroll::-webkit-scrollbar { display: none; }
        .cast-card-img:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.5);
        }
      `}</style>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          margin: "0 0 14px",
        }}
      >
        Cast
      </h2>
      <div
        className="cast-scroll"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 8,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {cast.map((member) => (
          <CastCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  );
}
