// Shared PII/sensitive-content scrubbing — used by both Sentry (beforeSend/
// beforeBreadcrumb) and PostHog (event property filtering) so the two
// services can't diverge on what counts as sensitive. Deliberately blunt and
// generic rather than trying to special-case every field shape: any object
// key whose name suggests it might hold user-authored or private content
// gets fully redacted (not partially masked — a partial mask can still leak
// a review's gist), and every surviving string still gets an email-pattern
// pass in case an address ends up somewhere unexpected (an error message
// that happened to interpolate one, a URL query string, etc).
//
// Exported as pure functions and unit-tested directly against constructed
// Sentry-event-shaped and PostHog-event-shaped objects — see
// scripts/_tmp_test_scrubbing.ts run during this task, since there's no
// live Sentry/PostHog project in this environment to observe real captures.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Substring match against lowercased key names — deliberately broad. Better
// to over-redact an innocuous key like "messageId" than under-redact
// "message" holding real review text.
const SENSITIVE_KEY_FRAGMENTS = [
  'password', 'passwd', 'pwd',
  'review', 'message', 'body', 'text', 'comment', 'bio', 'synopsis',
  'email', 'e_mail',
  'token', 'secret', 'authorization', 'auth_header', 'cookie',
];

export function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => k.includes(fragment));
}

export function scrubString(value: string): string {
  return value.replace(EMAIL_RE, '[redacted-email]');
}

const REDACTED = '[redacted]';

// Real error/breadcrumb .message strings are normally short and
// code-generated ("Network request failed", "Failed to save review") — genuinely
// useful for debugging, so they only get the email-pattern pass above, not
// full redaction. But a message CAN end up carrying raw user content (a
// caller interpolates a value into a log/error string) — proven by this
// module's own scrubbing test, which caught exactly that case. A message
// this long is far more likely to be interpolated free text than a genuine
// short diagnostic string, so it's redacted outright rather than trusted.
const FREE_TEXT_MESSAGE_LENGTH_THRESHOLD = 80;

export function scrubMessage(value: string): string {
  if (value.length > FREE_TEXT_MESSAGE_LENGTH_THRESHOLD) return REDACTED;
  return scrubString(value);
}

export function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED; // guard against pathological/circular-ish structures
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === 'object') return scrubObject(value as Record<string, unknown>, depth + 1);
  return value;
}

export function scrubObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    out[key] = isSensitiveKey(key) ? REDACTED : scrubValue(val, depth);
  }
  return out;
}

// ── Sentry event/breadcrumb scrubbing — pure, generically-typed logic lives
// here (not in sentry.ts) specifically so it can be unit-tested under plain
// Node via `npx tsx` without importing `@sentry/react-native`, which pulls
// in react-native itself and can't run outside the RN runtime. sentry.ts
// imports these two functions and applies Sentry's exact types at the
// beforeSend/beforeBreadcrumb call sites. ──────────────────────────────────

interface EventLike {
  message?: string;
  user?: { id?: string; email?: string; username?: string; [key: string]: unknown } | null;
  extra?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown> | undefined> | null;
  request?: { url?: string; data?: unknown; headers?: unknown; cookies?: unknown; [key: string]: unknown } | null;
  breadcrumbs?: BreadcrumbLike[];
  exception?: { values?: { type?: string; value?: string; [key: string]: unknown }[] };
  [key: string]: unknown;
}

interface BreadcrumbLike {
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export function scrubBreadcrumbLike<T extends BreadcrumbLike>(breadcrumb: T): T {
  const next = { ...breadcrumb };
  if (next.message) next.message = scrubMessage(next.message);
  if (next.data) next.data = scrubObject(next.data);
  return next;
}

export function scrubEventLike<T extends EventLike>(event: T): T {
  const next: T = { ...event };
  if (next.user) {
    next.user = next.user.id ? { id: next.user.id } : undefined;
  }
  if (next.extra) {
    next.extra = scrubObject(next.extra);
  }
  if (next.contexts) {
    const scrubbedContexts: NonNullable<T['contexts']> = {};
    for (const [key, value] of Object.entries(next.contexts)) {
      scrubbedContexts[key] = value ? scrubObject(value) : value;
    }
    next.contexts = scrubbedContexts;
  }
  if (next.request) {
    next.request = { ...next.request, data: undefined, headers: undefined, cookies: undefined };
  }
  if (next.breadcrumbs) {
    next.breadcrumbs = next.breadcrumbs.map(scrubBreadcrumbLike);
  }
  if (next.message) {
    next.message = scrubMessage(next.message);
  }
  if (next.exception?.values) {
    next.exception = {
      ...next.exception,
      values: next.exception.values.map((v) => ({ ...v, value: v.value ? scrubMessage(v.value) : v.value })),
    };
  }
  return next;
}
