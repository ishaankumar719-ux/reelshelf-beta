// Crash/error reporting — env-gated (no-ops entirely without a real DSN, so
// this environment reports nothing until one is supplied) and dev-mode-gated
// (never reports from a local dev build, so real dashboards don't fill with
// developer noise). Scrubbing (scrubEvent/scrubBreadcrumb) is mandatory, not
// optional config — every event and breadcrumb passes through it before
// Sentry ever sees it, per the hard privacy requirement that review text,
// passwords, emails, and other private content are never captured.
//
// Expo Go note: the React Native SDK's native layer (crash capture, native
// stack frames) requires a custom dev client / EAS build — it does not
// function inside Expo Go, which can only run Expo's own fixed native
// binary. init() is wrapped defensively so this is a silent no-op rather
// than a crash when running in Expo Go; JS-level error capture (the
// ErrorBoundary hook below, manual captureException calls) still works
// wherever Sentry.init() itself succeeds.
import * as Sentry from '@sentry/react-native';

import { scrubBreadcrumbLike, scrubEventLike, scrubObject } from './scrub';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function isSentryEnabled(): boolean {
  return Boolean(DSN) && !__DEV__;
}

// Thin wrappers around the pure, RN-independent logic in scrub.ts (kept
// there specifically so it can be unit-tested under plain Node without
// pulling in @sentry/react-native's RN runtime dependency).
function scrubSentryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  return scrubEventLike(event as unknown as Record<string, unknown>) as unknown as Sentry.ErrorEvent;
}

function scrubSentryBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  return scrubBreadcrumbLike(breadcrumb as unknown as Record<string, unknown>) as unknown as Sentry.Breadcrumb;
}

export function initSentry(): void {
  if (initialized) return;
  if (!DSN || __DEV__) {
    if (__DEV__) {
      console.log('[sentry] disabled — ' + (!DSN ? 'EXPO_PUBLIC_SENTRY_DSN not set' : 'dev build'));
    }
    return;
  }
  try {
    Sentry.init({
      dsn: DSN,
      beforeSend: (event) => scrubSentryEvent(event) as Sentry.ErrorEvent,
      beforeBreadcrumb: (breadcrumb) => scrubSentryBreadcrumb(breadcrumb),
      sendDefaultPii: false,
      tracesSampleRate: 0.2,
    });
    initialized = true;
  } catch (e) {
    // Never let observability setup take the app down with it — most likely
    // cause is running inside Expo Go, where the native module isn't linked.
    console.warn('[sentry] init failed (expected in Expo Go):', e);
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: scrubObject(context) } : undefined);
}

export { scrubSentryEvent, scrubSentryBreadcrumb };
