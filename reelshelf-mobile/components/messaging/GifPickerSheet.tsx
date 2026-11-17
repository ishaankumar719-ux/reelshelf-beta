import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { RS } from '@/constants/theme';
import type { GifPick } from '@/lib/messaging/api';
import { GiphyFetchError, fetchGiphyGifs, hasGiphyKey, type GiphyGif } from '@/lib/supabase/attachments';

/** GIF search as a sheet, using the app's existing GIPHY integration (same
 *  key, endpoints and G rating as the review attachment picker). */
export function GifPickerSheet({ visible, onPick, onClose }: {
  visible: boolean; onPick: (gif: GifPick) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - RS.spacing.md * 2 - 12) / 3);

  useEffect(() => {
    if (!visible || !hasGiphyKey()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setError(null);
      fetchGiphyGifs(query, 0, controller.signal)
        .then(({ gifs: next }) => setGifs(next))
        .catch((e: unknown) => {
          if (e instanceof Error && e.name === 'AbortError') return;
          setError(e instanceof GiphyFetchError && e.kind === 'offline'
            ? "You're offline. Connect and try again."
            : "Couldn't load GIFs. Try again.");
        });
    }, query ? 300 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query, visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>GIFs</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close GIFs" style={styles.closeBtn}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.search}>
          <MaterialIcons name="search" size={20} color={RS.colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search GIPHY"
            placeholderTextColor={RS.colors.textMuted}
            style={styles.input}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search GIFs"
          />
        </View>
        {!hasGiphyKey() ? (
          <Text style={styles.notice}>GIF search isn&apos;t available in this build.</Text>
        ) : error ? (
          <Text style={styles.notice}>{error}</Text>
        ) : gifs === null ? (
          <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.xl }} />
        ) : (
          <FlatList
            data={gifs}
            keyExtractor={(g) => g.id}
            numColumns={3}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={{ gap: 6 }}
            contentContainerStyle={{ gap: 6, paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xl }}
            ListEmptyComponent={<Text style={styles.notice}>No GIFs for “{query}”.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick({
                  giphy_id: item.id,
                  url: item.fullUrl,
                  width: item.width || 200,
                  height: item.height || 200,
                  title: item.title || null,
                })}
                accessibilityRole="button"
                accessibilityLabel={`Send GIF${item.title ? `: ${item.title}` : ''}`}
                style={{ width: cell, height: cell, borderRadius: 10, overflow: 'hidden', backgroundColor: RS.colors.elevated }}
              >
                <Image source={{ uri: item.previewUrl }} style={StyleSheet.absoluteFill} contentFit="cover" autoplay />
              </Pressable>
            )}
          />
        )}
        <Text style={styles.attribution}>Powered by GIPHY</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: RS.colors.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.md, paddingBottom: RS.spacing.sm },
  title: { flex: 1, fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary },
  closeBtn: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  done: { color: RS.colors.accent, fontSize: 16, fontWeight: '600' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, marginHorizontal: RS.spacing.md, marginBottom: RS.spacing.sm,
    paddingHorizontal: 14, height: 44, borderRadius: 22, backgroundColor: RS.colors.elevated, borderWidth: 1, borderColor: RS.colors.border,
  },
  input: { flex: 1, color: RS.colors.textPrimary, fontSize: 16 },
  notice: { color: RS.colors.textSecondary, fontSize: RS.typography.body, textAlign: 'center', padding: RS.spacing.lg },
  attribution: {
    fontSize: RS.typography.overline, letterSpacing: RS.letterSpacing.wide, color: RS.colors.textMuted, textAlign: 'center',
    paddingVertical: RS.spacing.sm, textTransform: 'uppercase',
  },
});
