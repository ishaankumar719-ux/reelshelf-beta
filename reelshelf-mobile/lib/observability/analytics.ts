// Product analytics — PostHog, chosen as the default "lightweight, privacy-
// conscious" option: self-hostable, generous free tier, first-class React
// Native SDK, no DOM-autocapture-style default data hoovering the way the
// web SDK has (this module also never enables session replay or navigation
// autocapture, so nothing beyond the 11 explicit trackX() calls below is
// ever sent). Swap-out point: replace the PostHog client construction and
// the two calls in captureEvent()/identifyUser() below — trackX() call
// sites elsewhere in the app don't need to change.
//
// Env-gated (no-ops without a real key) and dev-mode-gated (never reports
// from a local dev build). Every event property object passes through
// scrubObject() before capture() is called — this is the ONLY path any
// event property reaches PostHog through in this app (no autocapture), so
// this one wrapper is sufficient coverage, not just a best-effort filter.
import PostHog from 'posthog-react-native';

import { scrubObject } from './scrub';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let client: PostHog | null = null;

export function isAnalyticsEnabled(): boolean {
  return Boolean(API_KEY) && !__DEV__;
}

export function initAnalytics(): void {
  if (client) return;
  if (!API_KEY || __DEV__) {
    if (__DEV__) {
      console.log('[analytics] disabled — ' + (!API_KEY ? 'EXPO_PUBLIC_POSTHOG_API_KEY not set' : 'dev build'));
    }
    return;
  }
  try {
    client = new PostHog(API_KEY, {
      host: HOST,
      captureAppLifecycleEvents: false, // explicit — only the 11 named events below are ever sent
    });
  } catch (e) {
    console.warn('[analytics] init failed:', e);
  }
}

export function identifyUser(userId: string): void {
  if (!client) return;
  // Distinct id only — no email/name/profile fields attached.
  client.identify(userId);
}

export function resetAnalyticsUser(): void {
  client?.reset();
}

function capture(event: string, properties?: Record<string, unknown>): void {
  if (!client) return;
  client.capture(event, properties ? (scrubObject(properties) as Record<string, string | number | boolean>) : undefined);
}

// ── The 11 specified events — one function per event, called at its real
// trigger point. Every properties object here is already non-sensitive by
// construction (ids/types/counts, never free text) — scrubObject in
// capture() above is the backstop, not the only line of defense. ──────────

export function trackAppOpened(): void {
  capture('app_opened');
}

export function trackSignupCompleted(userId: string): void {
  capture('signup_completed', { user_id: userId });
}

export function trackLoginCompleted(userId: string): void {
  capture('login_completed', { user_id: userId });
}

export function trackSearchPerformed(queryLength: number, category: string): void {
  capture('search_performed', { query_length: queryLength, category });
}

export function trackProfileOpened(profileUserId: string, isOwnProfile: boolean): void {
  capture('profile_opened', { profile_user_id: profileUserId, is_own_profile: isOwnProfile });
}

export function trackFollowCompleted(targetUserId: string): void {
  capture('follow_completed', { target_user_id: targetUserId });
}

export function trackReviewPublished(mediaType: string, mediaId: string, hasRating: boolean): void {
  capture('review_published', { media_type: mediaType, media_id: mediaId, has_rating: hasRating });
}

export function trackListCreated(listId: string): void {
  capture('list_created', { list_id: listId });
}

export function trackDiaryEntryCreated(mediaType: string, mediaId: string, reviewScope: string): void {
  capture('diary_entry_created', { media_type: mediaType, media_id: mediaId, review_scope: reviewScope });
}

export function trackDailyReelOpened(): void {
  capture('daily_reel_opened');
}

export function trackNotificationOpened(notificationType: string): void {
  capture('notification_opened', { notification_type: notificationType });
}
