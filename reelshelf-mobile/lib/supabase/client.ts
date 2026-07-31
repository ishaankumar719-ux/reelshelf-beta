import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// No timeout existed anywhere on Supabase requests before this — on a bad
// connection, a hung fetch would leave a mutation's loading/disabled state
// (and any optimistic-update rollback, which only ever runs from a
// .catch()) stuck forever with no way for the user to recover short of
// force-quitting. This wraps every request the client makes (auth, table
// queries, RPCs, storage) in a single shared timeout, rejecting a hung
// request so existing .catch()/rollback logic runs like any other failure.
const REQUEST_TIMEOUT_MS = 15000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Respect a caller-supplied signal too (none of the current call sites
  // pass one, but this keeps the wrapper correct if that ever changes).
  const externalSignal = init?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

// Same production project the web app talks to (see reelshelf-mobile/.env) —
// AsyncStorage-backed session storage so login survives app restart.
// detectSessionInUrl MUST be false on React Native (no browser URL to read a
// session token out of); autoRefreshToken/persistSession keep the session
// alive and durable across cold starts.
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    })
  : null;
