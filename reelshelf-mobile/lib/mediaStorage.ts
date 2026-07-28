// On-device optimistic-paint cache for Movie Detail's Primary Actions —
// AsyncStorage only, keyed by BOTH the current user (or 'guest') and the
// media route id (e.g. "film-693134"). Real source of truth is Supabase
// (see useMediaPersistence.ts's reconciliation step); this is purely an
// instant-paint layer.
//
// Was keyed by media id alone with no user segment at all — on a shared
// device, that meant a second account opening a title the first account had
// interacted with would briefly (and, if the Supabase reconciliation fetch
// ever failed, indefinitely) paint the FIRST account's cached shelf/watched/
// rating/review state before real state loaded. Namespacing every key by
// userId (or the fixed 'guest' bucket when logged out) makes that
// structurally impossible — a different user id is simply a different,
// empty key, never the previous user's value.
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAMESPACE   = 'reelshelf';
const GUEST_NS    = 'guest';

const userKey = (prefix: string, userId: string | null, id: string) =>
  `${NAMESPACE}:${prefix}:${userId ?? GUEST_NS}:${id}`;
const historyKey = (userId: string | null) => `${NAMESPACE}:watchedHistory:${userId ?? GUEST_NS}`;

export async function getShelfState(userId: string | null, id: string): Promise<boolean> {
  return (await AsyncStorage.getItem(userKey('shelf', userId, id))) === '1';
}

export async function setShelfState(userId: string | null, id: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(userKey('shelf', userId, id), value ? '1' : '0');
}

export async function getWatchedState(userId: string | null, id: string): Promise<boolean> {
  return (await AsyncStorage.getItem(userKey('watched', userId, id))) === '1';
}

/** Watched-history entry — shape a future real Diary feature can read directly. */
export interface WatchedHistoryEntry {
  id:        string;
  watchedAt: number; // Date.now()
}

export async function getWatchedHistory(userId: string | null): Promise<WatchedHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(historyKey(userId));
  return raw ? (JSON.parse(raw) as WatchedHistoryEntry[]) : [];
}

export async function setWatchedState(userId: string | null, id: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(userKey('watched', userId, id), value ? '1' : '0');
  const history = await getWatchedHistory(userId);
  const withoutId = history.filter(h => h.id !== id);
  const next = value ? [...withoutId, { id, watchedAt: Date.now() }] : withoutId;
  await AsyncStorage.setItem(historyKey(userId), JSON.stringify(next));
}

/** 0–5 in 0.5 increments. 0 = unrated. */
export async function getRating(userId: string | null, id: string): Promise<number> {
  const raw = await AsyncStorage.getItem(userKey('rating', userId, id));
  return raw ? Number(raw) : 0;
}

export async function setRating(userId: string | null, id: string, value: number): Promise<void> {
  await AsyncStorage.setItem(userKey('rating', userId, id), String(value));
}

export async function getReview(userId: string | null, id: string): Promise<string> {
  return (await AsyncStorage.getItem(userKey('review', userId, id))) ?? '';
}

export async function setReview(userId: string | null, id: string, text: string): Promise<void> {
  if (text.trim().length === 0) {
    await AsyncStorage.removeItem(userKey('review', userId, id));
  } else {
    await AsyncStorage.setItem(userKey('review', userId, id), text);
  }
}
