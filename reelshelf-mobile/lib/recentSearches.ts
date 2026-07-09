// Recent searches — local only (AsyncStorage), no backend write of any kind.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'reelshelf:recentSearches';
const MAX = 10;

export async function getRecentSearches(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function addRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();
  const existing = await getRecentSearches();
  const next = [trimmed, ...existing.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
