import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { getBadgeCount, subscribeToInbox } from '@/lib/messaging/api';
import { supabase } from '@/lib/supabase/client';

/** Unread messages + pending group invites, kept live by realtime and
 *  refreshed whenever the app returns to the foreground (realtime can drop
 *  while backgrounded). Mirrors the website's MessagesNavLink. */
export function useMessagingBadge(): number {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!supabase || !userId) { setCount(0); return; }
    const client = supabase;
    let cancelled = false;
    const refresh = () => {
      getBadgeCount(client)
        .then((n) => { if (!cancelled) setCount(n); })
        .catch(() => { /* keep the last known count */ });
    };
    refresh();
    const unsubscribe = subscribeToInbox(client, userId, refresh);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { cancelled = true; unsubscribe(); sub.remove(); };
  }, [userId]);

  return count;
}
