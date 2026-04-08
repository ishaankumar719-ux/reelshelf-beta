"use client";

import { useEffect } from "react";
import { trackRecentMedia } from "../lib/recentMedia";
import type { SavedMediaItem } from "../lib/media";

export default function TrackRecentView({ item }: { item: SavedMediaItem }) {
  useEffect(() => {
    trackRecentMedia(item);
  }, [
    item.id,
    item.mediaType,
    item.title,
    item.poster,
    item.year,
    item.director,
    item.runtime,
    item.voteAverage,
    JSON.stringify(item.genres || []),
  ]);

  return null;
}
