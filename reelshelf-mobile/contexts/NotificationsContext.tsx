import type { RealtimeChannel } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import {
  fetchNotifications,
  getUnreadNotificationCount,
  NOTIFICATION_POLL_INTERVAL_MS,
  readNotificationLastReadAt,
  writeNotificationLastReadAt,
  type ReelShelfNotification,
} from '@/lib/supabase/notifications';

interface NotificationsContextValue {
  notifications: ReelShelfNotification[];
  loading: boolean;
  unreadCount: number;
  lastReadAt: string | null;
  refresh: () => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  loading: false,
  unreadCount: 0,
  lastReadAt: null,
  refresh: () => {},
  markAllRead: () => {},
});

// Mounted exactly ONCE, at the app root (app/_layout.tsx) alongside
// AuthProvider/SettingsProvider — never per-screen. This is what actually
// guarantees a single poll interval + single Realtime channel app-wide,
// regardless of how many screens ever render a bell icon consuming this
// context (today: only Home's Header, but this holds even if that changes).
//
// Realtime scope (a documented, deliberate MOBILE-ONLY enhancement, not
// website parity — the real website has no genuine cross-account Realtime
// anywhere; its "follow subscription" is a same-tab CustomEvent that only
// fires when the CURRENT user performs a follow action themselves, so on
// web even a new-follower notification only ever appears via the 90s poll,
// confirmed by reading lib/supabase/social.ts in full): a single
// postgres_changes channel on the notifications table, filtered server-side
// to this user's own recipient_id (Realtime filters are a single equality
// expression — no server-side AND on type), narrowed to new_follower
// client-side in the callback. Every other type still only refreshes on the
// 90s poll, matching the website's real (non-Realtime) behavior exactly.
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ReelShelfNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const loadSeqRef = useRef(0);

  const load = useCallback((userId: string) => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    fetchNotifications(userId)
      .then((data) => {
        if (loadSeqRef.current !== seq) return; // superseded by a newer load — discard
        setNotifications(data);
      })
      .catch(() => {
        // Leave whatever was last successfully loaded rather than clearing it.
      })
      .finally(() => {
        if (loadSeqRef.current === seq) setLoading(false);
      });
  }, []);

  const refresh = useCallback(() => {
    if (userIdRef.current) load(userIdRef.current);
  }, [load]);

  const markAllRead = useCallback(() => {
    const userId = userIdRef.current;
    if (!userId) return;
    const now = new Date().toISOString();
    setLastReadAt(now);
    writeNotificationLastReadAt(userId, now).catch(() => {});
  }, []);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;

    if (!user) {
      setNotifications([]);
      setLastReadAt(null);
      return;
    }

    let cancelled = false;
    readNotificationLastReadAt(user.id).then((stored) => {
      if (!cancelled) setLastReadAt(stored);
    });

    load(user.id);
    const intervalId = setInterval(() => load(user.id), NOTIFICATION_POLL_INTERVAL_MS);

    let channel: RealtimeChannel | null = null;
    if (supabase) {
      channel = supabase
        .channel(`notifications:new-follower:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
          (payload) => {
            if ((payload.new as { type?: string })?.type === 'new_follower') {
              load(user.id);
            }
          },
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [user, load]);

  const unreadCount = getUnreadNotificationCount(notifications, lastReadAt);

  return (
    <NotificationsContext.Provider value={{ notifications, loading, unreadCount, lastReadAt, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
