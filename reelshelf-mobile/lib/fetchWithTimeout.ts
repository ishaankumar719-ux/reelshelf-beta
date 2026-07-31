// Shared timeout wrapper for the raw fetch() calls this app makes directly
// to third-party APIs (TMDB, Google Books, GIPHY) — mirrors the timeout
// lib/supabase/client.ts now applies to every Supabase request. Without
// this, a hung connection left these calls with no way to ever resolve,
// leaving loading states stuck indefinitely.
const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const externalSignal = init?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
