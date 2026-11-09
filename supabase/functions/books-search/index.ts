// Server-side Google Books search for the mobile app.
//
// The app used to call Google's keyless endpoint straight from each phone,
// which shares a small anonymous quota and starts answering HTTP 429. This
// function adds the project's Google Books API key, which stays a Supabase
// secret (GOOGLE_BOOKS_API_KEY) and never ships in the app binary.
//
//   GET /functions/v1/books-search?q=<query>&maxResults=<1-20>
//
// Responses:
//   200  Google's /volumes JSON, unchanged
//   400  missing/oversized query
//   429  Google is throttling the key (Retry-After passed through) — the app
//        shows "busy, try again", never "no books found"
//   503  GOOGLE_BOOKS_API_KEY not set — the app falls back to the keyless
//        endpoint, so deploying before the key is added is harmless
//
// Deploy with verify_jwt disabled: the app's publishable key is not a JWT.
// Public read-only proxy for one fixed upstream path; the query is the only
// caller-controlled input and is length-capped.

const GOOGLE_BOOKS = 'https://www.googleapis.com/books/v1/volumes';
const MAX_QUERY = 200;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });

  const key = Deno.env.get('GOOGLE_BOOKS_API_KEY');
  if (!key) return json(503, { error: 'not_configured' });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q || q.length > MAX_QUERY) return json(400, { error: 'bad_query' });
  const max = Math.min(Math.max(Number(url.searchParams.get('maxResults')) || 15, 1), 20);

  const upstream = new URL(GOOGLE_BOOKS);
  upstream.searchParams.set('q', q);
  upstream.searchParams.set('maxResults', String(max));
  upstream.searchParams.set('key', key);

  let res: Response;
  try {
    res = await fetch(upstream, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return json(502, { error: 'upstream_unreachable' });
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    return json(429, { error: 'rate_limited' }, retryAfter ? { 'Retry-After': retryAfter } : {});
  }
  if (!res.ok) {
    // Don't echo Google's error body: it can name the key's project.
    return json(502, { error: 'upstream_error', status: res.status });
  }

  return new Response(await res.text(), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
});
