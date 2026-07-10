import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
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
import { resolveImageUrl } from '@/lib/resolveImageUrl';
import { toDbMediaId } from '@/lib/supabase/mediaActions';
import {
  saveMountRushmoreForType,
  type MountRushmoreSlot,
  type RushmoreMediaType,
} from '@/lib/supabase/mountRushmore';
import { searchBooks } from '@/lib/search';
import { searchMovies, searchTv } from '@/lib/tmdb';
import { getMediaKey } from '@/utils/listKeys';

const TABS: { key: RushmoreMediaType; label: string }[] = [
  { key: 'movie', label: 'Films' },
  { key: 'tv',    label: 'Series' },
  { key: 'book',  label: 'Books' },
];

interface SearchResultItem {
  mediaId:   string;
  title:     string;
  year:      string | null;
  posterUrl: string | null;
}

const DEBOUNCE_MS = 300;

// Mirrors the website's MountRushmoreEditor exactly (see
// WEBSITE_PROFILE_AUDIT.md §1b): three independent 4-slot sets (Films/
// Series/Books tabs), tap an empty slot to search-and-fill it immediately
// (no separate confirm step), tap "×" to clear a filled slot. No drag
// reorder exists on the website either — position is chosen by which slot
// you tap, not by dragging — so none is invented here. Save is scoped to
// only the tabs the user actually touched (`dirtyTypes`), matching the
// website's per-media-type delete+insert behavior exactly.
interface MountRushmoreEditorProps {
  visible:      boolean;
  onClose:      () => void;
  initialSlots: MountRushmoreSlot[];
  userId:       string;
  onSaved:      (allSlots: MountRushmoreSlot[]) => void;
}

export function MountRushmoreEditor({ visible, onClose, initialSlots, userId, onSaved }: MountRushmoreEditorProps) {
  const [allSlots, setAllSlots] = useState<MountRushmoreSlot[]>(initialSlots);
  const [dirtyTypes, setDirtyTypes] = useState<Set<RushmoreMediaType>>(new Set());
  const [activeTab, setActiveTab] = useState<RushmoreMediaType>('movie');
  const [activePosition, setActivePosition] = useState<1 | 2 | 3 | 4 | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAllSlots(initialSlots);
    setDirtyTypes(new Set());
    setActivePosition(null);
    setQuery('');
    setResults([]);
    setError(null);
  }, [visible, initialSlots]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        let mapped: SearchResultItem[] = [];
        if (activeTab === 'movie') {
          const r = await searchMovies(query);
          mapped = r.map((m) => ({ mediaId: toDbMediaId(m.id), title: m.title, year: m.year ? String(m.year) : null, posterUrl: m.posterUrl }));
        } else if (activeTab === 'tv') {
          const r = await searchTv(query);
          mapped = r.map((t) => ({ mediaId: toDbMediaId(t.id), title: t.title, year: t.year ? String(t.year) : null, posterUrl: t.posterUrl }));
        } else {
          const r = await searchBooks(query);
          mapped = r.map((b) => ({ mediaId: toDbMediaId(b.id), title: b.title, year: b.year ? String(b.year) : null, posterUrl: b.posterUrl }));
        }
        if (!cancelled) setResults(mapped);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [query, activeTab]);

  const tabSlots = ([1, 2, 3, 4] as const).map((position) =>
    allSlots.find((s) => s.position === position && s.mediaType === activeTab) ?? null,
  );

  const handleSlotPress = (position: 1 | 2 | 3 | 4) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActivePosition(position);
    setQuery('');
    setResults([]);
  };

  const handleSelect = (result: SearchResultItem) => {
    if (activePosition === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newSlot: MountRushmoreSlot = {
      position:   activePosition,
      mediaId:    result.mediaId,
      mediaType:  activeTab,
      title:      result.title,
      year:       result.year,
      posterPath: result.posterUrl,
    };
    setAllSlots((prev) => [
      ...prev.filter((s) => !(s.position === activePosition && s.mediaType === activeTab)),
      newSlot,
    ]);
    setDirtyTypes((prev) => new Set(prev).add(activeTab));
    setActivePosition(null);
    setQuery('');
    setResults([]);
  };

  const handleRemove = (position: 1 | 2 | 3 | 4) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAllSlots((prev) => prev.filter((s) => !(s.position === position && s.mediaType === activeTab)));
    setDirtyTypes((prev) => new Set(prev).add(activeTab));
    if (activePosition === position) {
      setActivePosition(null);
      setQuery('');
      setResults([]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const type of dirtyTypes) {
        await saveMountRushmoreForType(userId, type, allSlots);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSaved(allSlots);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save Mount Rushmore.');
    } finally {
      setSaving(false);
    }
  };

  const searchPlaceholder = activeTab === 'movie' ? 'Search films…' : activeTab === 'tv' ? 'Search series…' : 'Search books…';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={RS.colors.textSecondary} />
            </Pressable>
            <Text style={styles.headerTitle}>Mount Rushmore</Text>
            <Pressable onPress={handleSave} hitSlop={8} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={RS.colors.accent} /> : <Text style={styles.saveLabel}>Save</Text>}
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={getMediaKey('rushmore-tab', tab.key)}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                  onPress={() => {
                    setActiveTab(tab.key);
                    setActivePosition(null);
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={[{ key: 'content' }]}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            renderItem={() => (
              <>
                <View style={styles.grid}>
                  {tabSlots.map((slot, i) => {
                    const position = (i + 1) as 1 | 2 | 3 | 4;
                    const active = activePosition === position;
                    const resolvedUri = slot ? resolveImageUrl(slot.posterPath, 'poster') : null;
                    return (
                      <Pressable
                        key={getMediaKey('rushmore-slot', `${activeTab}-${position}`)}
                        style={[styles.slot, active && styles.slotActive, !slot && styles.slotEmpty]}
                        onPress={() => handleSlotPress(position)}
                      >
                        {slot ? (
                          <>
                            {resolvedUri ? (
                              <Image source={{ uri: resolvedUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            ) : (
                              <View style={[StyleSheet.absoluteFill, styles.slotFallback]}>
                                <MaterialIcons name="image-not-supported" size={20} color={RS.colors.textMuted} />
                              </View>
                            )}
                            <Pressable
                              style={styles.removeBtn}
                              onPress={(e) => { e.stopPropagation(); handleRemove(position); }}
                              hitSlop={8}
                            >
                              <MaterialIcons name="close" size={12} color="#fff" />
                            </Pressable>
                            <View style={styles.slotCaption}>
                              <Text style={styles.slotTitle} numberOfLines={1}>{slot.title}</Text>
                              <Text style={styles.slotYear}>{slot.year || '—'}</Text>
                            </View>
                          </>
                        ) : (
                          <MaterialIcons name="add" size={22} color={RS.colors.textMuted} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {tabSlots.every((s) => s === null) && (
                  <Text style={styles.emptyTabMessage}>
                    {activeTab === 'movie' ? 'Build your top 4 films' : activeTab === 'tv' ? 'Build your top 4 series' : 'Build your top 4 books'}
                  </Text>
                )}

                {activePosition !== null && (
                  <View style={styles.searchPanel}>
                    <Text style={styles.pickingLabel}>Picking for slot {activePosition}</Text>
                    <View style={styles.searchInputWrap}>
                      <MaterialIcons name="search" size={16} color={RS.colors.textMuted} />
                      <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={RS.colors.textMuted}
                        autoFocus
                        autoCapitalize="none"
                      />
                    </View>

                    {query.trim().length < 2 ? (
                      <Text style={styles.searchHint}>Start typing to search</Text>
                    ) : searching ? (
                      <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.md }} />
                    ) : results.length === 0 ? (
                      <Text style={styles.searchHint}>No results for &quot;{query}&quot;</Text>
                    ) : (
                      <View style={styles.resultsGrid}>
                        {results.map((result, i) => {
                          const resolvedUri = resolveImageUrl(result.posterUrl, 'poster');
                          return (
                            <Pressable
                              key={getMediaKey('rushmore-result', `${result.mediaId}-${i}`)}
                              style={styles.resultCard}
                              onPress={() => handleSelect(result)}
                            >
                              {resolvedUri ? (
                                <Image source={{ uri: resolvedUri }} style={styles.resultPoster} contentFit="cover" />
                              ) : (
                                <View style={[styles.resultPoster, styles.slotFallback]}>
                                  <MaterialIcons name="add" size={16} color={RS.colors.textMuted} />
                                </View>
                              )}
                              <Text style={styles.resultTitle} numberOfLines={2}>{result.title}</Text>
                              {result.year ? <Text style={styles.resultYear}>{result.year}</Text> : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { height: '88%', borderTopLeftRadius: RS.card.radius + 8, borderTopRightRadius: RS.card.radius + 8, overflow: 'hidden', backgroundColor: RS.colors.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.md, paddingBottom: RS.spacing.sm },
  headerTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  saveLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.accent },
  tabRow: { flexDirection: 'row', gap: RS.spacing.xs, paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.sm },
  tabBtn: { borderRadius: RS.button.radius, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: RS.colors.elevated },
  tabBtnActive: { backgroundColor: RS.button.primaryFill, borderWidth: 1, borderColor: RS.button.primaryBorder },
  tabLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  tabLabelActive: { color: RS.button.primaryText, fontWeight: '700' },
  scrollContent: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.sm },
  slot: { width: '48%', aspectRatio: 2 / 3, borderRadius: RS.card.radius, overflow: 'hidden', backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: RS.colors.border },
  slotActive: { borderColor: RS.button.primaryBorder, borderWidth: 2 },
  slotEmpty: { borderStyle: 'dashed' },
  slotFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  slotCaption: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 6 },
  slotTitle: { fontSize: RS.typography.caption, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  slotYear: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  emptyTabMessage: { fontSize: RS.typography.body, color: RS.colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: RS.spacing.md },
  searchPanel: { marginTop: RS.spacing.lg, borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, padding: RS.spacing.md },
  pickingLabel: { fontSize: RS.typography.caption, color: RS.colors.textMuted, marginBottom: RS.spacing.sm },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.xs, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, paddingHorizontal: RS.spacing.sm + 2, paddingVertical: RS.spacing.sm },
  searchInput: { flex: 1, fontSize: RS.typography.body, color: RS.colors.textPrimary },
  searchHint: { fontSize: RS.typography.caption, color: RS.colors.textMuted, textAlign: 'center', paddingVertical: RS.spacing.lg },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.sm, marginTop: RS.spacing.md },
  resultCard: { width: '31%', gap: 4 },
  resultPoster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8 },
  resultTitle: { fontSize: 10, fontWeight: '600', color: RS.colors.textPrimary },
  resultYear: { fontSize: 9, color: RS.colors.textMuted },
  errorText: { fontSize: RS.typography.caption + 1, color: '#f87171', marginTop: RS.spacing.md, textAlign: 'center' },
});
