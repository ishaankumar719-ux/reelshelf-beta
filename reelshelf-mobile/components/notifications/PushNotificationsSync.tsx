// Root-level, no-UI side-effect component (same pattern as AppOpenBadgeSync/
// OnboardingGate) — mounted exactly once in app/_layout.tsx. Three jobs:
// 1. Configure the foreground notification handler once.
// 2. On launch, if the user previously opted in AND permission is still
//    granted, silently re-register (handles token rotation) — never prompts.
// 3. Listen for a tap on a delivered notification and navigate to the same
//    destination the in-app bell would (getNotificationDestination), exactly
//    once app-wide — this listener is NOT re-created per screen.
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  configureForegroundNotificationHandler,
  hasGrantedPushPermission,
  isPushOptedIn,
  registerForPushNotificationsAsync,
  setLocalPushToken,
} from '@/lib/pushNotifications';
import { getNotificationDestination, type ReelShelfNotificationType } from '@/lib/supabase/notifications';
import { upsertPushToken } from '@/lib/supabase/pushTokens';

let handlerConfigured = false;

export function PushNotificationsSync() {
  const { user } = useAuth();
  const silentRegisterRanForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!handlerConfigured) {
      configureForegroundNotificationHandler();
      handlerConfigured = true;
    }
  }, []);

  useEffect(() => {
    if (!user || silentRegisterRanForUserRef.current === user.id) return;
    silentRegisterRanForUserRef.current = user.id;

    (async () => {
      const optedIn = await isPushOptedIn(user.id);
      if (!optedIn) return;
      const stillGranted = await hasGrantedPushPermission();
      if (!stillGranted) return; // revoked in system settings since opting in — respect it, don't re-prompt
      const { token, platform } = await registerForPushNotificationsAsync();
      if (token && platform) {
        await upsertPushToken(user.id, token, platform).catch(() => {});
        await setLocalPushToken(user.id, token).catch(() => {});
      }
    })();
  }, [user]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; actorId?: string; mediaRouteId?: string | null; mediaType?: string | null; mediaTitle?: string | null; mediaPoster?: string | null; collectionSlug?: string }
        | undefined;
      if (!data?.type) return;

      // Collection of the Week announcement — a broadcast, push-only type
      // that never appears in the 7-type in-app bell (see
      // send-push-notification's collection_announcement request shape),
      // so it's handled here directly rather than through
      // getNotificationDestination, which is scoped to the bell's real types.
      if (data.type === 'collection_of_the_week' && data.collectionSlug) {
        router.push(`/collection/${data.collectionSlug}` as Parameters<typeof router.push>[0]);
        return;
      }

      if (!data.actorId) return;
      const destination = getNotificationDestination({
        type: data.type as ReelShelfNotificationType,
        actorId: data.actorId,
        mediaRouteId: data.mediaRouteId ?? null,
        mediaType: (data.mediaType as never) ?? null,
        mediaTitle: data.mediaTitle ?? null,
        mediaPoster: data.mediaPoster ?? null,
      });
      router.push(destination as Parameters<typeof router.push>[0]);
    });
    return () => sub.remove();
  }, []);

  return null;
}
