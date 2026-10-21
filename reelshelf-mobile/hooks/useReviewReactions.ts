// Mobile port of the real website's hooks/useReviewReactions.ts, targeting
// the same review_reactions table. One deliberate mobile convention (see
// AGENTS.md-adjacent audit notes): target_type is hardcoded to 'diary_entry'
// rather than film_review/tv_review/book_review — the website's ReviewCard.tsx
// only ever writes those three values, yet every real row in review_reactions
// today has target_type='diary_entry' (confirmed via direct DB query), so
// 'diary_entry' is the only value that actually matches live data. Console
// log tags match the website hook's [REACTION] convention exactly, for
// cross-platform debugging consistency.
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

export type ReviewReactionType = 'love' | 'fire' | 'cinema' | 'funny' | 'mind_blown';

export const REVIEW_REACTION_TYPES: ReviewReactionType[] = [
  'love', 'fire', 'cinema', 'funny', 'mind_blown',
];

export type ReviewReactionCounts = Record<ReviewReactionType, number>;

function emptyReactionCounts(): ReviewReactionCounts {
  return { love: 0, fire: 0, cinema: 0, funny: 0, mind_blown: 0 };
}

// review_reactions.target_type allows film_review|tv_review|episode_review|
// book_review|diary_entry — mobile only ever uses 'diary_entry' (see header).
const TARGET_TYPE = 'diary_entry';

export function useReviewReactions({
  diaryEntryId,
  currentUserId,
  isOwn,
}: {
  diaryEntryId: string;
  currentUserId: string | null;
  /** True when the current user owns this diary entry — reacting to your
   *  own review is blocked client-side (review_reactions has no RLS-level
   *  self-react restriction, unlike diary_entry_likes). */
  isOwn: boolean;
}) {
  const [reactions, setReactions] = useState<ReviewReactionCounts>(emptyReactionCounts);
  const [userReactions, setUserReactions] = useState<Set<ReviewReactionType>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!diaryEntryId || !supabase) return;
    let cancelled = false;

    supabase
      .from('review_reactions')
      .select('reaction_type, user_id')
      .eq('target_type', TARGET_TYPE)
      .eq('target_id', diaryEntryId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.log('[REACTION] error', error);
          return;
        }
        const counts = emptyReactionCounts();
        const userSet = new Set<ReviewReactionType>();
        for (const row of data ?? []) {
          const type = row.reaction_type as ReviewReactionType;
          if (REVIEW_REACTION_TYPES.includes(type)) {
            counts[type] = (counts[type] ?? 0) + 1;
          }
          if (currentUserId && row.user_id === currentUserId) {
            userSet.add(type);
          }
        }
        setReactions(counts);
        setUserReactions(userSet);
      });

    return () => { cancelled = true; };
  }, [diaryEntryId, currentUserId]);

  const toggleReaction = useCallback(
    async (reactionType: ReviewReactionType) => {
      console.log('[REACTION] target', { targetType: TARGET_TYPE, targetId: diaryEntryId });
      console.log('[REACTION] user_id', currentUserId);

      if (!currentUserId || !supabase || isOwn) return;

      console.log('[REACTION] clicked', { targetType: TARGET_TYPE, targetId: diaryEntryId, reactionType });

      const isActive = userReactions.has(reactionType);

      // Optimistic update — applied before the DB round-trip.
      setReactions((prev) => ({
        ...prev,
        [reactionType]: Math.max(0, prev[reactionType] + (isActive ? -1 : 1)),
      }));
      setUserReactions((prev) => {
        const next = new Set(prev);
        if (isActive) next.delete(reactionType);
        else next.add(reactionType);
        return next;
      });

      setIsLoading(true);

      if (isActive) {
        console.log('[REACTION] remove started', { targetType: TARGET_TYPE, targetId: diaryEntryId, reactionType });
        const { error } = await supabase
          .from('review_reactions')
          .delete()
          .eq('target_type', TARGET_TYPE)
          .eq('target_id', diaryEntryId)
          .eq('user_id', currentUserId)
          .eq('reaction_type', reactionType);

        setIsLoading(false);

        if (error) {
          console.log('[REACTION] error', error);
          setReactions((prev) => ({ ...prev, [reactionType]: prev[reactionType] + 1 }));
          setUserReactions((prev) => { const next = new Set(prev); next.add(reactionType); return next; });
        } else {
          console.log('[REACTION] removed', { reactionType });
        }
      } else {
        console.log('[REACTION] insert started', { targetType: TARGET_TYPE, targetId: diaryEntryId, reactionType, userId: currentUserId });
        const { error } = await supabase.from('review_reactions').insert({
          target_type: TARGET_TYPE,
          target_id: diaryEntryId,
          user_id: currentUserId,
          reaction_type: reactionType,
        });

        setIsLoading(false);

        // 23505 = unique_violation (duplicate in-flight tap) — optimistic state is already correct.
        if (error && (error as { code?: string }).code !== '23505') {
          console.log('[REACTION] error', error);
          setReactions((prev) => ({ ...prev, [reactionType]: Math.max(0, prev[reactionType] - 1) }));
          setUserReactions((prev) => { const next = new Set(prev); next.delete(reactionType); return next; });
        } else {
          console.log('[REACTION] insert success', { reactionType });
        }
      }
    },
    [diaryEntryId, currentUserId, isOwn, userReactions],
  );

  return { reactions, userReactions, toggleReaction, isLoading };
}
