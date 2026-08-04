// Push notification registration — explicit opt-in only, never auto-requested
// on launch. Real device required (Expo push tokens don't exist on
// simulators/emulators); real EAS projectId required (see
// PUSH_TOKEN_REQUIRES_EAS_PROJECT below — this app doesn't have one
// configured yet, a real, reportable gap, not something fabricated here).
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const PUSH_TOKEN_REQUIRES_EAS_PROJECT = !Constants.expoConfig?.extra?.eas?.projectId;

function optedInKey(userId: string): string {
  return `reelshelf:pushOptedIn:${userId}`;
}

function localTokenKey(userId: string): string {
  return `reelshelf:pushToken:${userId}`;
}

export async function isPushOptedIn(userId: string): Promise<boolean> {
  const flag = await AsyncStorage.getItem(optedInKey(userId));
  return flag === '1';
}

export async function setPushOptedIn(userId: string, value: boolean): Promise<void> {
  if (value) await AsyncStorage.setItem(optedInKey(userId), '1');
  else await AsyncStorage.removeItem(optedInKey(userId));
}

/** Remembers this device's own registered token locally, purely so toggling
 *  off can delete the exact right push_tokens row without guessing which of
 *  a user's (possibly several, multi-device) tokens belongs to this device. */
export async function getLocalPushToken(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(localTokenKey(userId));
}

export async function setLocalPushToken(userId: string, token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(localTokenKey(userId), token);
  else await AsyncStorage.removeItem(localTokenKey(userId));
}

// Called once at app root (see components/notifications/PushNotificationsSync.tsx)
// — governs whether a foreground push shows a banner/plays a sound. Current
// SDK 54 field names (shouldShowAlert is deprecated in favor of these two).
export function configureForegroundNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export interface RegisterResult {
  token: string | null;
  platform: 'ios' | 'android' | null;
  /** User-facing reason registration didn't produce a token — null on success. */
  error: string | null;
}

/** Requests permission (the real OS prompt, if not already decided) and
 *  returns a real Expo push token on success. Only ever called from an
 *  explicit user action (the Settings toggle) — never on app launch. */
export async function registerForPushNotificationsAsync(): Promise<RegisterResult> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { token: null, platform: null, error: 'Push notifications are only available on iOS and Android.' };
  }
  if (!Device.isDevice) {
    return { token: null, platform: null, error: 'Push notifications require a physical device (not a simulator).' };
  }
  if (PUSH_TOKEN_REQUIRES_EAS_PROJECT) {
    return { token: null, platform: null, error: 'This app isn’t linked to an EAS project yet — push notifications need that to be set up first.' };
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    return { token: null, platform: null, error: 'Permission was not granted.' };
  }

  try {
    const projectId = Constants.expoConfig!.extra!.eas.projectId as string;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token, platform: Platform.OS, error: null };
  } catch (e) {
    return { token: null, platform: null, error: e instanceof Error ? e.message : 'Could not get a push token.' };
  }
}

/** Silent check — never prompts. Used on launch to confirm an already-granted
 *  permission is still granted (the user could have revoked it in system
 *  settings since opting in). */
export async function hasGrantedPushPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}
