"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  href: string;
  title: string;
  label: string;
  year: number;
  imageUrl: string | null;
  kind: "Book" | "Film" | "Series";
};

export default function CommunityTitleCard({ href, title, label, year, imageUrl, kind }: Props) {
  const [imgError, setImgError] = useState(false);
  const showImage = imageUrl && !imgError;

  return (
    <Link
      href={href}
      aria-label={`${title} (${year})`}
      className="group block min-w-0 rounded-[var(--rs-radius-card)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--rs-radius-card)] border border-white/10 bg-[#140d0c] shadow-lg shadow-black/40 transition duration-300 group-hover:-translate-y-1 group-hover:border-amber-300/40">
        {showImage ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-end bg-linear-to-b from-[#3a1d12] via-[#1c1110] to-[#0b0809] p-3">
            <span className="font-sans text-[10px] font-semibold tracking-widest text-amber-200/70 uppercase">{kind}</span>
            <span className="mt-1 line-clamp-4 text-sm leading-tight text-white/90">{label}</span>
          </div>
        )}
      </div>
      <p className="mt-2.5 line-clamp-2 font-sans text-sm leading-snug font-medium text-white/90 group-hover:text-white">
        {label}
      </p>
      <p className="mt-0.5 font-sans text-xs text-white/55">{year}</p>
    </Link>
  );
}
