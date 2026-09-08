import { useEffect, useState } from 'react';

import type { MediaType } from '@/data/seedHomeContent';
import {
  fetchCommunityRatingSummary,
  type MediaRatingSummary,
} from '@/lib/supabase/mediaRatingSummary';

export function useCommunityRating(id: string, mediaType: MediaType, refreshKey?: number) {
  const [summary, setSummary] = useState<MediaRatingSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCommunityRatingSummary(id, mediaType)
      .then((next) => { if (!cancelled) setSummary(next); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [id, mediaType, refreshKey]);

  return summary;
}
