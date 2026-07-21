import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RS } from '@/constants/theme';
import {
  deleteReviewAttachment,
  fetchGiphyGifs,
  hasGiphyKey,
  uploadReviewImage,
  type GiphyGif,
} from '@/lib/supabase/attachments';

export interface AttachmentValue {
  url:  string;
  type: 'image' | 'gif';
}

interface AttachmentPickerProps {
  value:    AttachmentValue | null;
  onChange: (v: AttachmentValue | null) => void;
  /** Fires whenever an image upload starts/finishes — lets the parent (Save
   *  button) block submission while an upload is in flight. GIF selection
   *  needs no separate upload step (just a URL), so this never fires for it. */
  onUploadingChange?: (uploading: boolean) => void;
}

const DEBOUNCE_MS = 300;

// Real image upload + real GIPHY search/trending — replaces the old shared
// paste-URL TextInput that funneled Image/GIF/Link into one generic field.
// "Link" is gone entirely (confirmed not a real website feature —
// WEBSITE_ATTACHMENT_SYSTEM_AUDIT.md §4). Same prop shape (`value`/`onChange`)
// as the website's own AttachmentPicker.tsx, this is a direct structural port
// of that component, not a parallel one.
export function AttachmentPicker({ value, onChange, onUploadingChange }: AttachmentPickerProps) {
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  const [gifSheetOpen, setGifSheetOpen] = useState(false);

  const [pendingAsset, setPendingAsset] = useState<{ uri: string; mimeType?: string; fileName?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifLoadingMore, setGifLoadingMore] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);
  const [gifOffset, setGifOffset] = useState(0);
  const [gifHasMore, setGifHasMore] = useState(false);
  const gifAbortRef = useRef<AbortController | null>(null);
  const gifRequestIdRef = useRef(0);

  // Deliberate mobile-side improvement over website parity (explicit product
  // decision, not silent): when the OLD attachment being replaced/removed was
  // an uploaded image, delete its Storage file — only this one exact known
  // path, never a bucket scan. GIFs are external URLs, nothing to clean up.
  const applyChange = (next: AttachmentValue | null) => {
    const previous = value;
    onChange(next);
    if (previous?.type === 'image' && previous.url !== next?.url) {
      deleteReviewAttachment(previous.url).catch(() => {});
    }
  };

  // ── Image flow ────────────────────────────────────────────────────────────
  const doUpload = async (asset: { uri: string; mimeType?: string; fileName?: string }) => {
    setUploading(true);
    onUploadingChange?.(true);
    setUploadError(null);
    const result = await uploadReviewImage(asset.uri, asset.mimeType, asset.fileName);
    setUploading(false);
    onUploadingChange?.(false);
    if ('error' in result) {
      setUploadError(result.error);
      return;
    }
    setPendingAsset(null);
    applyChange({ url: result.url, type: 'image' });
  };

  const pickFromLibrary = async () => {
    setImageSheetOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError('Photo library permission is required to attach an image.');
      return;
    }
    // No forced crop/aspect ratio — review attachments aren't square avatars.
    // quality: 0.6 is real JPEG re-compression via the native picker itself —
    // sufficient for the real 10MB bucket cap without adding a new dependency
    // (expo-image-manipulator isn't needed for this; expo-image-picker's own
    // quality option already does real work here). The 10MB check in
    // uploadReviewImage is the honest backstop matching the website's own
    // exact behavior for the rare case a compressed file is still too large.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const picked = { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName ?? undefined };
    setPendingAsset(picked);
    void doUpload(picked);
  };

  const pickFromCamera = async () => {
    setImageSheetOpen(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setUploadError('Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const picked = { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName ?? undefined };
    setPendingAsset(picked);
    void doUpload(picked);
  };

  // Re-attempts the SAME already-picked asset — no need to reopen the picker.
  const retryUpload = () => {
    if (pendingAsset) void doUpload(pendingAsset);
  };

  const openImageSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setUploadError(null);
    setImageSheetOpen(true);
  };

  // ── GIF flow ──────────────────────────────────────────────────────────────
  const openGifSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setGifQuery('');
    setGifResults([]);
    setGifOffset(0);
    setGifHasMore(false);
    setGifError(null);
    setGifSheetOpen(true);
  };

  // The abort happens here — right before a NEW request supersedes an old
  // one — never in the debounce effect's cleanup. That's the fix for the
  // "cancelled before it had a chance to resolve" failure mode: a keystroke
  // that only resets the debounce timer (no fetch started yet) triggers no
  // abort at all, since nothing is in flight yet to cancel.
  const runGifFetch = useCallback(async (query: string, offset: number, append: boolean) => {
    gifAbortRef.current?.abort();
    const controller = new AbortController();
    gifAbortRef.current = controller;
    const requestId = ++gifRequestIdRef.current;

    if (append) setGifLoadingMore(true);
    else setGifLoading(true);

    try {
      const { gifs, hasMore } = await fetchGiphyGifs(query, offset, controller.signal);
      if (requestId !== gifRequestIdRef.current) return; // superseded by a newer request
      setGifResults((prev) => (append ? [...prev, ...gifs] : gifs));
      setGifHasMore(hasMore);
      setGifOffset(offset + gifs.length);
      setGifError(null);
    } catch (e) {
      if (controller.signal.aborted) return; // intentional cancellation, not a real failure
      if (requestId !== gifRequestIdRef.current) return;
      if (append) {
        // Load-more failures degrade quietly — don't blow away already-loaded
        // results with a full error state, just stop offering more.
        setGifHasMore(false);
      } else {
        setGifError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      if (requestId === gifRequestIdRef.current) {
        setGifLoading(false);
        setGifLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!gifSheetOpen) return;
    if (!hasGiphyKey()) {
      if (__DEV__) {
        console.warn(
          '[AttachmentPicker] EXPO_PUBLIC_GIPHY_API_KEY is missing or empty — GIF search is unavailable.',
        );
      }
      return;
    }
    // Trending loads immediately (0ms) on open with no query; search debounces 300ms.
    const delay = gifQuery ? DEBOUNCE_MS : 0;
    const timer = setTimeout(() => {
      void runGifFetch(gifQuery, 0, false);
    }, delay);
    return () => clearTimeout(timer);
  }, [gifQuery, gifSheetOpen, runGifFetch]);

  const retryGifFetch = () => {
    void runGifFetch(gifQuery, 0, false);
  };

  const loadMoreGifs = () => {
    if (gifLoading || gifLoadingMore || !gifHasMore) return;
    void runGifFetch(gifQuery, gifOffset, true);
  };

  const selectGif = (gif: GiphyGif) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    applyChange({ url: gif.fullUrl, type: 'gif' });
    setGifSheetOpen(false);
    setGifQuery('');
    setGifResults([]);
  };

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    applyChange(null);
    setPendingAsset(null);
    setUploadError(null);
  };

  const handleReplace = () => {
    if (value?.type === 'gif') openGifSheet();
    else openImageSheet();
  };

  return (
    <View>
      {value ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: value.url }} style={styles.previewImage} contentFit="cover" />
          {value.type === 'gif' && (
            <View style={styles.gifBadge}>
              <Text style={styles.gifBadgeLabel}>GIF</Text>
            </View>
          )}
          <View style={styles.previewActions}>
            <Pressable style={styles.previewActionBtn} onPress={handleReplace}>
              <Text style={styles.previewActionLabel}>Replace</Text>
            </Pressable>
            <Pressable style={styles.previewRemoveBtn} onPress={handleRemove} hitSlop={6}>
              <MaterialIcons name="close" size={13} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.attachRow}>
          <Pressable style={styles.attachBtn} onPress={openImageSheet} disabled={uploading}>
            <MaterialIcons name="image" size={15} color={RS.colors.textSecondary} />
            <Text style={styles.attachBtnLabel}>Image</Text>
          </Pressable>
          <Pressable style={styles.attachBtn} onPress={openGifSheet}>
            <MaterialIcons name="gif" size={15} color={RS.colors.textSecondary} />
            <Text style={styles.attachBtnLabel}>GIF</Text>
          </Pressable>
        </View>
      )}

      {uploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator size="small" color={RS.colors.accent} />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      )}

      {uploadError && !uploading && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{uploadError}</Text>
          {pendingAsset && (
            <Pressable onPress={retryUpload} hitSlop={6}>
              <Text style={styles.retryLabel}>Retry</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Image source action sheet — Choose from Photos / Take Photo / Cancel */}
      <Modal visible={imageSheetOpen} transparent animationType="fade" onRequestClose={() => setImageSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setImageSheetOpen(false)}>
          <Pressable style={styles.actionSheet} onPress={(e) => e.stopPropagation()}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
            <Pressable style={styles.actionSheetBtn} onPress={pickFromLibrary}>
              <MaterialIcons name="photo-library" size={18} color={RS.colors.textPrimary} />
              <Text style={styles.actionSheetLabel}>Choose from Photos</Text>
            </Pressable>
            <View style={styles.actionSheetDivider} />
            <Pressable style={styles.actionSheetBtn} onPress={pickFromCamera}>
              <MaterialIcons name="photo-camera" size={18} color={RS.colors.textPrimary} />
              <Text style={styles.actionSheetLabel}>Take Photo</Text>
            </Pressable>
            <View style={styles.actionSheetDivider} />
            <Pressable style={styles.actionSheetBtn} onPress={() => setImageSheetOpen(false)}>
              <Text style={[styles.actionSheetLabel, styles.actionSheetCancel]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* GIF search/trending bottom sheet */}
      <Modal visible={gifSheetOpen} transparent animationType="slide" onRequestClose={() => setGifSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setGifSheetOpen(false)}>
          <Pressable style={styles.gifSheet} onPress={(e) => e.stopPropagation()}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
            <View style={styles.grabber} />
            {!hasGiphyKey() ? (
              <View style={styles.gifUnavailableWrap}>
                <Text style={styles.gifUnavailableText}>GIF search is unavailable.</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.gifSearchInput}
                  value={gifQuery}
                  onChangeText={setGifQuery}
                  placeholder="Search GIFs…"
                  placeholderTextColor={RS.colors.textMuted}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {gifError ? (
                  <View style={styles.gifErrorWrap}>
                    <Text style={styles.gifErrorText}>{gifError}</Text>
                    <Pressable onPress={retryGifFetch} hitSlop={8}>
                      <Text style={styles.retryLabel}>Retry</Text>
                    </Pressable>
                  </View>
                ) : gifLoading ? (
                  <ActivityIndicator color={RS.colors.accent} style={styles.gifLoadingIndicator} />
                ) : gifResults.length === 0 ? (
                  <Text style={styles.gifEmptyText}>
                    {gifQuery ? 'No results' : 'No trending GIFs right now'}
                  </Text>
                ) : (
                  <FlatList
                    style={styles.gifList}
                    data={gifResults}
                    keyExtractor={(gif) => `gif-${gif.provider}-${gif.id}`}
                    numColumns={2}
                    columnWrapperStyle={styles.gifRow}
                    contentContainerStyle={styles.gifGrid}
                    keyboardShouldPersistTaps="handled"
                    onEndReachedThreshold={0.5}
                    onEndReached={loadMoreGifs}
                    ListFooterComponent={
                      gifLoadingMore ? (
                        <ActivityIndicator color={RS.colors.accent} style={styles.gifFooterLoader} />
                      ) : null
                    }
                    renderItem={({ item }) => (
                      <Pressable style={styles.gifCell} onPress={() => selectGif(item)}>
                        <Image source={{ uri: item.previewUrl }} style={styles.gifCellImage} contentFit="cover" />
                      </Pressable>
                    )}
                  />
                )}
                <Text style={styles.giphyAttribution}>Powered by GIPHY</Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  attachRow: {
    flexDirection: 'row',
    gap:           RS.spacing.xs + 2,
  },
  attachBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.xs + 2,
    backgroundColor:   RS.colors.elevated,
  },
  attachBtnLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  previewWrap: {
    borderRadius: RS.card.radius,
    overflow:     'hidden',
    borderWidth:  0.5,
    borderColor:  RS.colors.border,
    maxWidth:     240,
  },
  previewImage: {
    width:      '100%',
    height:     160,
    backgroundColor: RS.colors.elevated,
  },
  gifBadge: {
    position:          'absolute',
    top:               6,
    left:              6,
    borderRadius:      4,
    backgroundColor:   'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  gifBadgeLabel: {
    fontSize:      9,
    fontWeight:    '700',
    letterSpacing: 0.5,
    color:         '#fff',
  },
  previewActions: {
    position:      'absolute',
    top:           6,
    right:         6,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  previewActionBtn: {
    borderRadius:      RS.button.radius,
    backgroundColor:   'rgba(0,0,0,0.65)',
    paddingHorizontal: 9,
    paddingVertical:   4,
  },
  previewActionLabel: {
    fontSize:   10,
    fontWeight: '700',
    color:      '#fff',
  },
  previewRemoveBtn: {
    width:            22,
    height:           22,
    borderRadius:     11,
    backgroundColor:  'rgba(0,0,0,0.65)',
    alignItems:       'center',
    justifyContent:   'center',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginTop:     RS.spacing.xs,
  },
  uploadingText: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.sm,
    marginTop:     RS.spacing.xs,
  },
  errorText: {
    fontSize: RS.typography.caption,
    color:    '#f87171',
    flex:     1,
  },
  retryLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.colors.accent,
  },
  sheetBackdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent:  'flex-end',
  },
  actionSheet: {
    borderRadius:    RS.card.radius + 6,
    overflow:        'hidden',
    marginHorizontal: RS.spacing.md,
    marginBottom:    RS.spacing.xl,
    backgroundColor: RS.colors.card,
    borderWidth:     0.5,
    borderColor:     RS.glass.border,
  },
  actionSheetBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               RS.spacing.sm,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.md,
  },
  actionSheetLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  actionSheetCancel: {
    color:          RS.colors.textMuted,
    textAlign:      'center',
    flex:           1,
  },
  actionSheetDivider: {
    height:          0.5,
    backgroundColor: RS.colors.border,
  },
  gifSheet: {
    height:               '70%',
    borderTopLeftRadius:  RS.card.radius + 8,
    borderTopRightRadius: RS.card.radius + 8,
    overflow:             'hidden',
    backgroundColor:      RS.colors.card,
    borderWidth:          0.5,
    borderColor:          RS.glass.border,
    borderBottomWidth:    0,
  },
  grabber: {
    alignSelf:       'center',
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginTop:       RS.spacing.sm,
    marginBottom:    RS.spacing.xs,
  },
  gifSearchInput: {
    marginHorizontal: RS.spacing.md,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.xs + 4,
    fontSize:          RS.typography.body,
    color:             RS.colors.textPrimary,
  },
  gifList: {
    flex: 1,
  },
  gifGrid: {
    gap:               10,
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.md,
  },
  gifRow: {
    gap: 10,
  },
  gifLoadingIndicator: {
    width:           '100%',
    paddingVertical: RS.spacing.xl,
  },
  gifFooterLoader: {
    paddingVertical: RS.spacing.md,
  },
  gifEmptyText: {
    width:      '100%',
    textAlign:  'center',
    fontSize:   RS.typography.caption,
    color:      RS.colors.textMuted,
    paddingVertical: RS.spacing.xl,
  },
  gifErrorWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               RS.spacing.sm,
    paddingHorizontal: RS.spacing.md,
    paddingVertical:   RS.spacing.xl,
  },
  gifErrorText: {
    fontSize:  RS.typography.caption,
    color:     '#f87171',
    textAlign: 'center',
  },
  gifUnavailableWrap: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: RS.spacing.xl,
  },
  gifUnavailableText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    textAlign: 'center',
  },
  gifCell: {
    width:           '48%',
    aspectRatio:     4 / 3,
    borderRadius:    8,
    overflow:        'hidden',
    backgroundColor: RS.colors.elevated,
  },
  gifCellImage: {
    width:  '100%',
    height: '100%',
  },
  giphyAttribution: {
    textAlign:     'right',
    paddingHorizontal: RS.spacing.md,
    paddingBottom: RS.spacing.sm,
    fontSize:      9,
    color:         RS.colors.textMuted,
  },
});
