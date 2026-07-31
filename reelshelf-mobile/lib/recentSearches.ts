// Recent searches — local only (AsyncStorage), no backend write of any kind.
// Namespaced per userId (or a 'guest' bucket) — same cross-user-leak class
// as lib/mediaStorage.ts: on a shared device, an unnamespaced key would let
// a second account see (and silently inherit/clear) the first account's
// search history. Swept on sign-out by AuthContext's clearUserCache, which
// matches any 'reelshelf:'-prefixed key ending in ':<userId>'.
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX = 10;

function key(userId: string | null): string {
  return `reelshelf:recentSearches:${userId ?? 'guest'}`;
}

export async function getRecentSearches(userId: string | null): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function addRecentSearch(userId: string | null, query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches(userId);
  const existing = await getRecentSearches(userId);
  const next = [trimmed, ...existing.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX);
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(userId: string | null): Promise<void> {
  await AsyncStorage.removeItem(key(userId));
}
