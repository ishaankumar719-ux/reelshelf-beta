// On-device persistence for Movie Detail's Primary Actions — AsyncStorage
// only, keyed by media route id (e.g. "film-693134"). Deliberately NOT
// Supabase: no auth/accounts exist yet, so this is device-local state that
// survives app restart but does not sync across devices or tie to a real
// user. See RETURN's PERSISTENCE_IMPLEMENTATION note for the explicit scope
// decision behind this.
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAMESPACE   = 'reelshelf';
const HISTORY_KEY = `${NAMESPACE}:watchedHistory`;

const key = (prefix: string, id: string) => `${NAMESPACE}:${prefix}:${id}`;

export async function getShelfState(id: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key('shelf', id))) === '1';
}

export async function setShelfState(id: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key('shelf', id), value ? '1' : '0');
}

export async function getWatchedState(id: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key('watched', id))) === '1';
}

/** Watched-history entry — shape a future real Diary feature can read directly. */
export interface WatchedHistoryEntry {
  id:        string;
  watchedAt: number; // Date.now()
}

export async function getWatchedHistory(): Promise<WatchedHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? (JSON.parse(raw) as WatchedHistoryEntry[]) : [];
}

export async function setWatchedState(id: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key('watched', id), value ? '1' : '0');
  const history = await getWatchedHistory();
  const withoutId = history.filter(h => h.id !== id);
  const next = value ? [...withoutId, { id, watchedAt: Date.now() }] : withoutId;
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

/** 0–5 in 0.5 increments. 0 = unrated. */
export async function getRating(id: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key('rating', id));
  return raw ? Number(raw) : 0;
}

export async function setRating(id: string, value: number): Promise<void> {
  await AsyncStorage.setItem(key('rating', id), String(value));
}

export async function getReview(id: string): Promise<string> {
  return (await AsyncStorage.getItem(key('review', id))) ?? '';
}

export async function setReview(id: string, text: string): Promise<void> {
  if (text.trim().length === 0) {
    await AsyncStorage.removeItem(key('review', id));
  } else {
    await AsyncStorage.setItem(key('review', id), text);
  }
}
