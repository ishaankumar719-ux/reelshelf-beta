// iPhone side of photos and videos in Messages: picking, preparing,
// uploading straight from disk, and reading private files with the viewer's
// own token. Shared format and checks: lib/messaging/api.ts and
// supabase/migrations/20261117_message_media.sql.
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';

import { MEDIA_BUCKET, classifyMediaFile, mediaRequest } from '@/lib/messaging/api';
import { supabase } from '@/lib/supabase/client';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** The signed-in user's current access token, kept fresh as it refreshes. */
export function useAccessToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setToken(data.session?.access_token ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setToken(session?.access_token ?? null));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  return token;
}

/** Source for expo-image / expo-video: storage checks the token's owner is
 *  still an active member of the conversation on every request. */
export function mediaSource(path: string, token: string, nonce?: string) {
  return mediaRequest(SUPABASE_URL, SUPABASE_KEY, token, path, nonce);
}

export interface PickedMedia {
  kind: 'image' | 'video';
  uri: string;
  mime: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  /** Video only: a JPEG frame on disk, uploaded as the poster. */
  thumbUri: string | null;
}

/** Opens the photo library for one photo or video. Null if cancelled. */
export async function pickMedia(): Promise<PickedMedia | { error: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: false,
    quality: 0.85,
    // HEIC/HEVC become JPEG/H.264, so the website can show them too.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    videoMaxDuration: 600,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return prepareAsset(result.assets[0]);
}

export async function prepareAsset(asset: ImagePicker.ImagePickerAsset): Promise<PickedMedia | { error: string }> {
  const isVideo = asset.type === 'video';
  let mime = (asset.mimeType ?? '').toLowerCase();
  if (!mime) {
    const ext = (asset.fileName ?? asset.uri).split('.').pop()?.toLowerCase();
    mime = isVideo ? (ext === 'mp4' ? 'video/mp4' : 'video/quicktime')
      : ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  }
  if (mime === 'image/jpg') mime = 'image/jpeg';
  let size = asset.fileSize ?? null;
  if (size == null) {
    const info = await FileSystem.getInfoAsync(asset.uri).catch(() => null);
    size = info && info.exists && 'size' in info ? info.size : null;
  }
  const check = classifyMediaFile(mime, size);
  if ('error' in check) return { error: check.error };

  let thumbUri: string | null = null;
  if (check.kind === 'video') {
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 500, quality: 0.5 });
      thumbUri = thumb.uri;
    } catch {
      return { error: "Couldn't read that video. Try another one." };
    }
  }
  return {
    kind: check.kind,
    uri: asset.uri,
    mime,
    width: asset.width || null,
    height: asset.height || null,
    durationMs: check.kind === 'video' && asset.duration != null ? Math.round(asset.duration) : null,
    thumbUri,
  };
}

/** Uploads one file straight from disk (no 15 s request timeout, no copy in
 *  memory). An object already at the path, from an earlier attempt, counts
 *  as uploaded, so Retry is safe. */
export async function uploadFile(path: string, fileUri: string, contentType: string, token: string): Promise<void> {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${MEDIA_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  let res: FileSystem.FileSystemUploadResult;
  try {
    res = await FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_KEY,
        'Content-Type': contentType,
        'x-upsert': 'false',
      },
    });
  } catch {
    throw new Error("The upload didn't finish. Check your connection and try again.");
  }
  if (res.status >= 200 && res.status < 300) return;
  if (res.status === 409 || /already exists|duplicate/i.test(res.body ?? '')) return;
  if (res.status === 413) throw new Error('That file is too big. Photos up to 10 MB, videos up to 50 MB.');
  throw new Error("The upload didn't finish. Check your connection and try again.");
}
