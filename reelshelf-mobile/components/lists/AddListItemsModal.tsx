import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RS } from '@/constants/theme';
import { resolveImageUrl } from '@/lib/resolveImageUrl';
import { searchBooks } from '@/lib/search';
import { toDbMediaId } from '@/lib/supabase/mediaActions';
import { addListItem, type ListMediaType } from '@/lib/supabase/lists';
import { searchMovies, searchTv } from '@/lib/tmdb';
import { getMediaKey } from '@/utils/listKeys';

type TypeFilter = 'all' | ListMediaType;
const TYPE_CHIPS: { key: TypeFilter; label: string }[] = [
  { key: 'all',   label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv',    label: 'TV' },
  { key: 'book',  label: 'Books' },
];

interface SearchHit {
  mediaType: ListMediaType;
  mediaId:   string; // already DB-form
  title:     string;
  subtitle:  string | null;
  posterUrl: string | null;
  year:      string | null;
}

const DEBOUNCE_MS = 300;

interface AddListItemsModalProps {
  visible:          boolean;
  onClose:          () => void;
  listId:           string;
  existingMediaIds: string[]; // DB-form ids already in the list
  onAdded:          () => void;
}

// Reuses the app's existing Universal Search infra (TMDB movies/TV, Google
// Books) — the same searchMovies/searchTv/searchBooks functions already
// used by the Search screen and Mount Rushmore's editor — rather than
// building a second search integration.
export function AddListItemsModal({ visible, onClose, listId, existingMediaIds, onAdded }: AddListItemsModalProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const existingSet = new Set(existingMediaIds);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setTypeFilter('all');
    }
  }, [visible]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const tasks: Promise<SearchHit[]>[] = [];
        if (typeFilter === 'all' || typeFilter === 'movie') {
          tasks.push(searchMovies(q).then((r) => r.map((m) => ({
            mediaType: 'movie' as const, mediaId: toDbMediaId(m.id), title: m.title,
            subtitle: null, posterUrl: m.posterUrl, year: m.year ? String(m.year) : null,
          }))));
        }
        if (typeFilter === 'all' || typeFilter === 'tv') {
          tasks.push(searchTv(q).then((r) => r.map((t) => ({
            mediaType: 'tv' as const, mediaId: toDbMediaId(t.id), title: t.title,
            subtitle: null, posterUrl: t.posterUrl, year: t.year ? String(t.year) : null,
          }))));
        }
        if (typeFilter === 'all' || typeFilter === 'book') {
          tasks.push(searchBooks(q).then((r) => r.map((b) => ({
            mediaType: 'book' as const, mediaId: toDbMediaId(b.id), title: b.title,
            subtitle: b.author, posterUrl: b.posterUrl, year: b.year ? String(b.year) : null,
          }))));
        }
        const settled = await Promise.all(tasks);
        if (!cancelled) setResults(settled.flat());
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [query, typeFilter]);

  const handleAdd = async (hit: SearchHit) => {
    const key = getMediaKey(hit.mediaType, hit.mediaId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAddingId(key);
    try {
      await addListItem(listId, {
        mediaType: hit.mediaType,
        mediaId:   hit.mediaId,
        title:     hit.title,
        posterUrl: hit.posterUrl,
        year:      hit.year,
        author:    hit.subtitle,
      });
      existingSet.add(hit.mediaId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onAdded();
    } catch {
      // Leave the result tappable again on failure — no optimistic list mutation happened yet.
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={RS.colors.textSecondary} />
            </Pressable>
            <Text style={styles.headerTitle}>Add Media</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.searchInputWrap}>
            <MaterialIcons name="search" size={18} color={RS.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search movies, TV, books…"
              placeholderTextColor={RS.colors.textMuted}
              autoFocus
              autoCapitalize="none"
            />
          </View>

          <View style={styles.chipRow}>
            {TYPE_CHIPS.map((chip) => {
              const active = typeFilter === chip.key;
              return (
                <Pressable
                  key={getMediaKey('add-list-chip', chip.key)}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setTypeFilter(chip.key)}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {query.trim().length < 2 ? (
            <Text style={styles.hintText}>Start typing to search</Text>
          ) : searching ? (
            <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.lg }} />
          ) : results.length === 0 ? (
            <Text style={styles.hintText}>No results for &quot;{query}&quot;</Text>
          ) : (
            <View style={styles.resultsGrid}>
              {results.map((hit, i) => {
                const key = getMediaKey(hit.mediaType, hit.mediaId);
                const already = existingSet.has(hit.mediaId);
                const resolvedUri = resolveImageUrl(hit.posterUrl, 'poster');
                return (
                  <Pressable
                    key={getMediaKey(hit.mediaType, `${hit.mediaId}-${i}`)}
                    style={[styles.resultCard, already && styles.resultCardDisabled]}
                    onPress={() => !already && handleAdd(hit)}
                    disabled={already || addingId === key}
                  >
                    {resolvedUri ? (
                      <Image source={{ uri: resolvedUri }} style={styles.resultPoster} contentFit="cover" />
                    ) : (
                      <View style={[styles.resultPoster, styles.resultPosterFallback]}>
                        <MaterialIcons name="image-not-supported" size={16} color={RS.colors.textMuted} />
                      </View>
                    )}
                    {addingId === key ? (
                      <View style={styles.resultOverlay}><ActivityIndicator size="small" color="#fff" /></View>
                    ) : already ? (
                      <View style={styles.resultOverlay}><MaterialIcons name="check-circle" size={20} color={RS.colors.accent} /></View>
                    ) : null}
                    <Text style={styles.resultTitle} numberOfLines={2}>{hit.title}</Text>
                    {hit.subtitle ? <Text style={styles.resultSubtitle} numberOfLines={1}>{hit.subtitle}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { height: '85%', borderTopLeftRadius: RS.card.radius + 8, borderTopRightRadius: RS.card.radius + 8, overflow: 'hidden', backgroundColor: RS.colors.card, padding: RS.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: RS.spacing.sm },
  headerTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.xs, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: RS.spacing.sm + 2, paddingVertical: RS.spacing.sm },
  searchInput: { flex: 1, fontSize: RS.typography.body, color: RS.colors.textPrimary },
  chipRow: { flexDirection: 'row', gap: RS.spacing.xs, marginTop: RS.spacing.sm, marginBottom: RS.spacing.sm },
  chip: { borderRadius: RS.button.radius, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: RS.colors.elevated },
  chipActive: { backgroundColor: RS.button.primaryFill, borderWidth: 1, borderColor: RS.button.primaryBorder },
  chipLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  chipLabelActive: { color: RS.button.primaryText, fontWeight: '700' },
  hintText: { fontSize: RS.typography.caption, color: RS.colors.textMuted, textAlign: 'center', paddingVertical: RS.spacing.xl },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.sm },
  resultCard: { width: '31%', gap: 4 },
  resultCardDisabled: { opacity: 0.5 },
  resultPoster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8 },
  resultPosterFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  resultOverlay: { position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: 2 / 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8 },
  resultTitle: { fontSize: 10, fontWeight: '600', color: RS.colors.textPrimary },
  resultSubtitle: { fontSize: 9, color: RS.colors.textMuted },
});
