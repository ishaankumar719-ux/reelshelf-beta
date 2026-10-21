// Single source for the public ReelShelf website address used in share
// messages, the invite link and Settings. Set EXPO_PUBLIC_WEB_URL once the
// Next.js site is deployed (e.g. https://reelshelf-beta.vercel.app).
//
// Until then this returns null and callers share plain text with no link.
// Never hard-code a domain here: https://reelshelf.app belongs to an
// unrelated product, and earlier builds sent every shared link there.
const RAW_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL?.trim() ?? '';

const WEB_URL: string | null = RAW_WEB_URL ? RAW_WEB_URL.replace(/\/+$/, '') : null;

/** Absolute website URL for `path` (e.g. `/lists/abc`), or null when no website is configured. */
export function webUrl(path = ''): string | null {
  if (!WEB_URL) return null;
  return path ? `${WEB_URL}${path.startsWith('/') ? path : `/${path}`}` : WEB_URL;
}

/** Host shown in UI labels (e.g. "reelshelf-beta.vercel.app"), or null when unset. */
export function webHost(): string | null {
  if (!WEB_URL) return null;
  return WEB_URL.replace(/^https?:\/\//, '');
}

export const BETA_LINE = 'ReelShelf is in private beta on iPhone.';
