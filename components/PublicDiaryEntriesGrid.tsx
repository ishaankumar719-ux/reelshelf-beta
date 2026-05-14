"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import type { PublicDiaryEntry } from "../lib/publicProfiles";
import {
  getCommentsForDiaryEntries,
  type PublicComment,
} from "../lib/supabase/comments";
import { getLikedDiaryEntryIds } from "../lib/supabase/likes";
import ReviewCard from "./reviews/ReviewCard";

export default function PublicDiaryEntriesGrid({
  entries,
  ownerUserId,
  ownerUsername,
  ownerDisplayName,
  ownerAvatarUrl,
}: {
  entries: PublicDiaryEntry[];
  ownerUserId: string;
  ownerUsername?: string | null;
  ownerDisplayName?: string | null;
  ownerAvatarUrl?: string | null;
}) {
  const { user } = useAuth();
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentsByEntry, setCommentsByEntry] = useState<Record<string, PublicComment[]>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  // Initialise like/comment counts from server-rendered entry data
  useEffect(() => {
    setLikeCounts(
      entries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.entryId] = entry.likeCount;
        return acc;
      }, {})
    );
    setCommentCounts(
      entries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.entryId] = entry.commentCount;
        return acc;
      }, {})
    );
  }, [entries]);

  // Load which entries the current user has liked
  useEffect(() => {
    if (!user) { setLikedIds([]); return; }
    let cancelled = false;
    void getLikedDiaryEntryIds(entries.map((e) => e.entryId)).then((ids) => {
      if (!cancelled) setLikedIds(ids);
    });
    return () => { cancelled = true; };
  }, [entries, user]);

  // Load all comments (roots + replies) for the visible entries
  useEffect(() => {
    let cancelled = false;
    void getCommentsForDiaryEntries(entries.map((e) => e.entryId)).then((all) => {
      if (cancelled) return;

      const byEntry = all.reduce<Record<string, PublicComment[]>>((acc, c) => {
        if (!acc[c.diaryEntryId]) acc[c.diaryEntryId] = [];
        acc[c.diaryEntryId].push(c);
        return acc;
      }, {});

      setCommentsByEntry(byEntry);
      setCommentCounts((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          // Root comments only for the displayed count
          next[entry.entryId] = (byEntry[entry.entryId] ?? []).filter((c) => !c.parentCommentId).length;
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [entries]);

  const likedIdSet = useMemo(() => new Set(likedIds), [likedIds]);

  if (entries.length === 0) {
    return (
      <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 14, fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif', margin: 0 }}>
        Nothing logged yet.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {entries.map((entry) => (
        <ReviewCard
          key={entry.entryId}
          entryId={entry.entryId}
          mediaId={entry.id}
          mediaType={entry.mediaType}
          title={entry.title}
          year={entry.year}
          poster={entry.poster}
          creator={entry.creator}
          href={entry.href}
          rating={entry.rating}
          reelshelfScore={entry.reelshelfScore}
          review={entry.review}
          watchedDate={entry.watchedDate}
          savedAt={entry.savedAt}
          favourite={entry.favourite}
          rewatch={entry.rewatch}
          containsSpoilers={entry.containsSpoilers}
          reviewLayers={entry.reviewLayers}
          ownerUserId={ownerUserId}
          ownerUsername={ownerUsername}
          ownerDisplayName={ownerDisplayName}
          ownerAvatarUrl={ownerAvatarUrl}
          initialLikeCount={likeCounts[entry.entryId] ?? entry.likeCount}
          initialCommentCount={commentCounts[entry.entryId] ?? entry.commentCount}
          isLiked={likedIdSet.has(entry.entryId)}
          initialComments={commentsByEntry[entry.entryId] ?? []}
          attachmentUrl={entry.attachmentUrl}
          attachmentType={entry.attachmentType}
          reviewCoverUrl={entry.reviewCoverUrl}
          reviewCoverSource={entry.reviewCoverSource}
        />
      ))}
    </div>
  );
}
