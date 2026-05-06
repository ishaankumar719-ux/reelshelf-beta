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
  const [isHovered, setIsHovered] = useState(false);
  const showImage = Boolean(member.profile_path) && !imgError;

  return (
    <Link
      href={`/people/${member.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 88,
        flexShrink: 0,
        cursor: "pointer",
        transform: "scale(1)",
        transition: "transform 0.15s ease, opacity 0.12s ease",
        opacity: isHovered ? 0.85 : 1,
        textDecoration: "none",
        display: "block",
      }}
      className="group"
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#111122",
          marginBottom: 8,
        }}
        className="transition duration-150 ease-out group-hover:scale-[1.05]"
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
              background: "linear-gradient(135deg, #1e1e35, #2a2a45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.4)",
              fontSize: 20,
              fontWeight: 500,
            }}
          >
            {getInitials(member.name)}
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "rgba(255,255,255,0.78)",
          textAlign: "center",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          margin: "0 0 3px",
        }}
      >
        {member.name}
      </p>
      <p
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontStyle: "italic",
          margin: 0,
        }}
      >
        {member.character}
      </p>
    </Link>
  );
}

export default function CastSection({ cast }: CastSectionProps) {
  if (!cast.length) {
    return null;
  }

  return (
    <section style={{ marginTop: 32, marginBottom: 40 }}>
      <style>{`.cast-scroll::-webkit-scrollbar { display: none; }`}</style>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          margin: "0 0 16px",
        }}
      >
        Cast
      </h2>
      <div
        className="cast-scroll"
        style={{
          display: "flex",
          gap: 12,
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
