import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { uploadReviewImage } from '@/lib/supabase/attachments';
import { fetchTmdbReviewArtwork, parseMediaRouteId, type TmdbImageOption } from '@/lib/tmdb';

export type ReviewCoverSource = 'default' | 'tmdb_poster' | 'tmdb_backdrop' | 'upload';

export interface ReviewCoverValue {
  url: string | null;
  source: ReviewCoverSource;
}

interface ReviewCoverPickerProps {
  mediaId: string;
  defaultPosterUrl: string | null;
  value: ReviewCoverValue;
  onChange: (value: ReviewCoverValue) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ReviewCoverPicker({ mediaId, defaultPosterUrl, value, onChange, onUploadingChange }: ReviewCoverPickerProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<TmdbImageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = parseMediaRouteId(mediaId);
  const tmdbKind = parsed?.kind;
  const tmdbId = parsed?.tmdbId;
  const displayUrl = value.url ?? defaultPosterUrl;

  useEffect(() => {
    if (!open || !tmdbKind || !tmdbId || images.length) return;
    let cancelled = false;
    setLoading(true);
    fetchTmdbReviewArtwork(tmdbKind, tmdbId)
      .then((next) => { if (!cancelled) setImages(next); })
      .catch(() => { if (!cancelled) setError('Artwork could not load. You can still use the original cover or upload one.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, tmdbKind, tmdbId, images.length]);

  const choose = (next: ReviewCoverValue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(next);
  };

  const pickUpload = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to choose artwork.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    onUploadingChange?.(true);
    const upload = await uploadReviewImage(asset.uri, asset.mimeType, asset.fileName ?? undefined);
    setUploading(false);
    onUploadingChange?.(false);
    if ('error' in upload) {
      setError(upload.error);
      return;
    }
    choose({ url: upload.url, source: 'upload' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View>
          <Text style={styles.label}>Review artwork</Text>
          <Text style={styles.hint}>Make this review look like yours.</Text>
        </View>
        <Pressable style={styles.changeButton} onPress={() => setOpen((current) => !current)}>
          <Text style={styles.changeLabel}>{open ? 'Done' : value.source === 'default' ? 'Change' : 'Edit'}</Text>
        </Pressable>
      </View>

      {open && (
        <View style={styles.panel}>
          {displayUrl && (
            <Image source={{ uri: displayUrl }} style={styles.preview} contentFit="cover" />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artworkRow}>
            <ArtworkOption
              imageUrl={defaultPosterUrl}
              selected={value.source === 'default'}
              label="Original"
              onPress={() => choose({ url: defaultPosterUrl, source: 'default' })}
            />
            {images.map((image) => (
              <ArtworkOption
                key={image.url}
                imageUrl={image.url}
                selected={value.url === image.url}
                label={image.type === 'backdrop' ? 'Still' : 'Poster'}
                wide={image.type === 'backdrop'}
                onPress={() => choose({ url: image.url, source: image.type === 'backdrop' ? 'tmdb_backdrop' : 'tmdb_poster' })}
              />
            ))}
            <Pressable style={styles.uploadOption} onPress={() => void pickUpload()} disabled={uploading}>
              {uploading ? <ActivityIndicator color={RS.colors.accent} /> : <MaterialIcons name="add-photo-alternate" size={22} color={RS.colors.accent} />}
              <Text style={styles.uploadLabel}>{uploading ? 'Uploading' : 'Your image'}</Text>
            </Pressable>
          </ScrollView>
          {loading ? <ActivityIndicator style={styles.loader} color={RS.colors.accent} /> : null}
          {!tmdbKind ? <Text style={styles.helper}>Use a personal image to set custom artwork for this review.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
    </View>
  );
}

function ArtworkOption({ imageUrl, selected, label, wide, onPress }: { imageUrl: string | null; selected: boolean; label: string; wide?: boolean; onPress: () => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <Pressable onPress={onPress} style={[styles.option, wide && styles.optionWide, selected && styles.optionSelected]}>
      {imageUrl && !broken ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBroken(true)} /> : <View style={[StyleSheet.absoluteFill, styles.optionFallback]} />}
      <View style={styles.optionLabel}><Text style={styles.optionLabelText}>{selected ? 'Selected' : label}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: RS.spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.textMuted, letterSpacing: RS.letterSpacing.wide, textTransform: 'uppercase' },
  hint: { fontSize: RS.typography.micro, color: RS.colors.textMuted, marginTop: 2 },
  changeButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: RS.button.radius, backgroundColor: RS.colors.elevated, borderWidth: 0.5, borderColor: RS.colors.border },
  changeLabel: { color: RS.colors.accent, fontSize: RS.typography.caption, fontWeight: '700' },
  panel: { gap: RS.spacing.sm, padding: RS.spacing.sm, borderRadius: RS.card.radius, backgroundColor: RS.colors.elevated, borderWidth: 0.5, borderColor: RS.colors.border },
  preview: { width: '100%', height: 84, borderRadius: 8 },
  artworkRow: { gap: 8, paddingRight: 2 },
  option: { width: 58, height: 84, overflow: 'hidden', borderRadius: 7, borderWidth: 2, borderColor: 'transparent', backgroundColor: RS.colors.card },
  optionWide: { width: 112 },
  optionSelected: { borderColor: RS.colors.accent },
  optionFallback: { backgroundColor: RS.colors.card },
  optionLabel: { position: 'absolute', left: 3, right: 3, bottom: 3, borderRadius: 3, paddingVertical: 2, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center' },
  optionLabelText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  uploadOption: { width: 76, height: 84, borderRadius: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: RS.colors.accent, alignItems: 'center', justifyContent: 'center', gap: 5 },
  uploadLabel: { fontSize: 9, fontWeight: '700', color: RS.colors.accent, textAlign: 'center' },
  loader: { alignSelf: 'flex-start' },
  helper: { fontSize: RS.typography.micro, color: RS.colors.textMuted },
  error: { fontSize: RS.typography.caption, color: '#f87171' },
});
