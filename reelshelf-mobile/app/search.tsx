import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { searchMovies, searchTv, searchPeople, type TmdbSearchResult, type TmdbPersonSearchResult } from '@/lib/tmdb';
import { searchBooks, searchCollections, searchLists, searchUsers,
  type BookSearchResult, type CollectionSearchResult, type ListSearchResult, type UserSearchResult } from '@/lib/search';
import { addRecentSearch, getRecentSearches } from '@/lib/recentSearches';

type Category = 'all' | 'movies' | 'tv' | 'books' | 'people' | 'collections' | 'lists' | 'users';
const CATEGORY_CHIPS: { key: Category; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'movies',      label: 'Movies' },
  { key: 'tv',          label: 'TV' },
  { key: 'books',       label: 'Books' },
  { key: 'people',      label: 'People' },
  { key: 'collections', label: 'Collections' },
  { key: 'lists',       label: 'Lists' },
  { key: 'users',       label: 'Users' },
];

// Static/editorial — there is no real trending-search analytics source wired
// into this app, so this is a curated, hand-picked list, same convention as
// other "Trending" sections elsewhere (which are also editorial, not
// algorithmic). Documented here, not fabricated as live data.
const TRENDING_SEARCHES = ['Dune: Part Two', 'The Bear', 'Shōgun', 'Oppenheimer', 'Fourth Wing'];

const DEBOUNCE_MS = 350;

type SectionStatus = 'idle' | 'loading' | 'success' | 'error';
interface SectionState<T> { status: SectionStatus; data: T[]; }
function idleSection<T>(): SectionState<T> { return { status: 'idle', data: [] }; }

interface BestMatchPreview {
  title:     string;
  subtitle?: string;
  imageUrl:  string | null;
  onPress:   () => void;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [recent, setRecent] = useState<string[]>([]);

  const [movies, setMovies] = useState<SectionState<TmdbSearchResult>>(idleSection());
  const [tv, setTv] = useState<SectionState<TmdbSearchResult>>(idleSection());
  const [books, setBooks] = useState<SectionState<BookSearchResult>>(idleSection());
  const [people, setPeople] = useState<SectionState<TmdbPersonSearchResult>>(idleSection());
  const [collections, setCollections] = useState<SectionState<CollectionSearchResult>>(idleSection());
  const [lists, setLists] = useState<SectionState<ListSearchResult>>(idleSection());
  const [users, setUsers] = useState<SectionState<UserSearchResult>>(idleSection());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getRecentSearches().then(setRecent);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setMovies(idleSection()); setTv(idleSection()); setBooks(idleSection());
      setPeople(idleSection()); setCollections(idleSection()); setLists(idleSection()); setUsers(idleSection());
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category]);

  const runSearch = (q: string) => {
    const wantAll = category === 'all';

    if (wantAll || category === 'movies') {
      setMovies({ status: 'loading', data: [] });
      searchMovies(q).then((data) => setMovies({ status: 'success', data })).catch(() => setMovies({ status: 'error', data: [] }));
    }
    if (wantAll || category === 'tv') {
      setTv({ status: 'loading', data: [] });
      searchTv(q).then((data) => setTv({ status: 'success', data })).catch(() => setTv({ status: 'error', data: [] }));
    }
    if (wantAll || category === 'books') {
      setBooks({ status: 'loading', data: [] });
      searchBooks(q).then((data) => setBooks({ status: 'success', data })).catch(() => setBooks({ status: 'error', data: [] }));
    }
    if (wantAll || category === 'people') {
      setPeople({ status: 'loading', data: [] });
      searchPeople(q).then((data) => setPeople({ status: 'success', data })).catch(() => setPeople({ status: 'error', data: [] }));
    }
    if (wantAll || category === 'collections') {
      setCollections({ status: 'success', data: searchCollections(q) });
    }
    if (wantAll || category === 'lists') {
      setLists({ status: 'loading', data: [] });
      searchLists(q).then((data) => setLists({ status: 'success', data })).catch(() => setLists({ status: 'error', data: [] }));
    }
    if (wantAll || category === 'users') {
      setUsers({ status: 'loading', data: [] });
      searchUsers(q).then((data) => setUsers({ status: 'success', data })).catch(() => setUsers({ status: 'error', data: [] }));
    }
  };

  const commitSearch = async () => {
    if (!query.trim()) return;
    setRecent(await addRecentSearch(query));
  };

  const handleTapRecentOrTrending = (q: string) => {
    setQuery(q);
  };

  const openMedia = (id: string, title: string, poster: string | null, mediaType: string) => {
    commitSearch();
    router.push(`/media/${id}?title=${encodeURIComponent(title)}&posterUrl=${encodeURIComponent(poster ?? '')}&mediaType=${mediaType}`);
  };

  const hasQuery = query.trim().length > 0;
  const anyResults = movies.data.length || tv.data.length || books.data.length || people.data.length || collections.data.length || lists.data.length || users.data.length;
  const anyLoading = [movies, tv, books, people, lists, users].some((s) => s.status === 'loading');
  const allSettled = [movies, tv, books, people, collections, lists, users].every((s) => s.status !== 'loading' && s.status !== 'idle');

  // Best Match — no cross-category relevance signal exists (each source API
  // only ranks within its own category), so this is an honest, deterministic
  // "first result of the highest-priority non-empty category" rather than a
  // fabricated combined relevance score. Only shown in "All" mode — a single
  // category already IS the best-match list.
  const getBestMatch = (): BestMatchPreview | null => {
    if (movies.data.length > 0) {
      const m = movies.data[0];
      return { title: m.title, subtitle: m.year ? String(m.year) : undefined, imageUrl: m.posterUrl, onPress: () => openMedia(m.id, m.title, m.posterUrl, 'film') };
    }
    if (tv.data.length > 0) {
      const t = tv.data[0];
      return { title: t.title, subtitle: t.year ? String(t.year) : undefined, imageUrl: t.posterUrl, onPress: () => openMedia(t.id, t.title, t.posterUrl, 'tv') };
    }
    if (books.data.length > 0) {
      const b = books.data[0];
      return { title: b.title, subtitle: b.author ?? undefined, imageUrl: b.posterUrl, onPress: () => openMedia(b.id, b.title, b.posterUrl, 'book') };
    }
    if (people.data.length > 0) {
      const p = people.data[0];
      return { title: p.name, subtitle: p.knownFor.join(', ') || undefined, imageUrl: p.photoUrl, onPress: () => router.push(`/person/${p.id}`) };
    }
    if (collections.data.length > 0) {
      const c = collections.data[0];
      return { title: c.title, subtitle: `${c.storyCount} stories`, imageUrl: c.previewItem?.posterUrl ?? null, onPress: () => router.push(`/collection/${c.id}`) };
    }
    if (lists.data.length > 0) {
      const l = lists.data[0];
      return { title: l.title, subtitle: `${l.itemCount} titles${l.ownerName ? ` · by ${l.ownerName}` : ''}`, imageUrl: null, onPress: () => router.push(`/list/${l.id}`) };
    }
    if (users.data.length > 0) {
      const u = users.data[0];
      return { title: u.displayName || u.username, subtitle: `@${u.username}`, imageUrl: u.avatarUrl, onPress: () => router.push(`/profile/${u.id}`) };
    }
    return null;
  };
  const bestMatch = category === 'all' ? getBestMatch() : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.searchBarRow}>
          <View style={styles.inputWrap}>
            <MaterialIcons name="search" size={20} color={RS.colors.textMuted} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Search films, TV, books, people…"
              placeholderTextColor={RS.colors.textMuted}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={commitSearch}
            />
            {hasQuery && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={RS.colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </View>

        {/* Compact horizontal filter-chip row — one row, content-based width,
            36-42px height, green-accent active / dark-glass inactive. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {CATEGORY_CHIPS.map((chip) => {
            const active = category === chip.key;
            return (
              <Pressable key={`chip-${chip.key}`} style={styles.chip} onPress={() => setCategory(chip.key)}>
                {!active && <BlurView tint="dark" intensity={RS.blur.cardLight} style={StyleSheet.absoluteFill} />}
                <View style={[styles.chipFill, active && styles.chipFillActive]} />
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!hasQuery ? (
            <>
              {recent.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Searches</Text>
                  <View style={styles.pillWrap}>
                    {recent.map((q, i) => (
                      <Pressable key={`recent-${q}-${i}`} style={styles.pill} onPress={() => handleTapRecentOrTrending(q)}>
                        <MaterialIcons name="history" size={14} color={RS.colors.textMuted} />
                        <Text style={styles.pillLabel}>{q}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Searches</Text>
                <Text style={styles.sectionCaption}>Editorially curated, not live analytics.</Text>
                <View style={styles.pillWrap}>
                  {TRENDING_SEARCHES.map((q, i) => (
                    <Pressable key={`trending-${q}-${i}`} style={styles.pill} onPress={() => handleTapRecentOrTrending(q)}>
                      <MaterialIcons name="trending-up" size={14} color={RS.colors.accent} />
                      <Text style={styles.pillLabel}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Browse Categories</Text>
                <View style={styles.browseGrid}>
                  {CATEGORY_CHIPS.filter((c) => c.key !== 'all').map((c) => (
                    <Pressable key={`browse-${c.key}`} style={styles.browseCard} onPress={() => setCategory(c.key)}>
                      <Text style={styles.browseLabel}>{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : anyLoading && !anyResults ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={RS.colors.accent} />
            </View>
          ) : allSettled && !anyResults ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No results for &quot;{query}&quot;.</Text>
            </View>
          ) : (
            <>
              {bestMatch && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Best Match</Text>
                  <Pressable style={styles.listRow} onPress={bestMatch.onPress}>
                    <View style={styles.listRowThumbOuter}>
                      {bestMatch.imageUrl ? (
                        <Image source={{ uri: bestMatch.imageUrl }} style={styles.listRowThumb} contentFit="cover" />
                      ) : (
                        <View style={[styles.listRowThumb, styles.listRowThumbFallback]}>
                          <MaterialIcons name="auto-awesome" size={16} color={RS.colors.textMuted} />
                        </View>
                      )}
                    </View>
                    <View style={styles.listRowMeta}>
                      <Text style={styles.listRowTitle}>{bestMatch.title}</Text>
                      {bestMatch.subtitle ? <Text style={styles.listRowSub}>{bestMatch.subtitle}</Text> : null}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                </View>
              )}

              {(category === 'all' || category === 'movies') && movies.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Movies</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                    {movies.data.map((item, i) => (
                      <PosterCard key={`film-${item.id}-${i}`} title={item.title} year={item.year} mediaType="film" posterUrl={item.posterUrl}
                        onPress={() => openMedia(item.id, item.title, item.posterUrl, 'film')} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {(category === 'all' || category === 'tv') && tv.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>TV</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                    {tv.data.map((item, i) => (
                      <PosterCard key={`tv-${item.id}-${i}`} title={item.title} year={item.year} mediaType="tv" posterUrl={item.posterUrl}
                        onPress={() => openMedia(item.id, item.title, item.posterUrl, 'tv')} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {(category === 'all' || category === 'books') && books.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Books</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                    {books.data.map((item, i) => (
                      <PosterCard key={`book-${item.id}-${i}`} title={item.title} year={item.year} mediaType="book" posterUrl={item.posterUrl}
                        onPress={() => openMedia(item.id, item.title, item.posterUrl, 'book')} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* People — TMDB's /search/person returns a lot of non-entries
                  (crew stubs, fan joke names) with no real photo/credits;
                  lib/tmdb.ts's searchPeople already filters those out before
                  they ever reach this component, so every item rendered here
                  is guaranteed to have a real photo + known-for credit. */}
              {(category === 'all' || category === 'people') && people.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>People</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                    {people.data.map((person, i) => (
                      <Pressable key={`person-${person.id}-${i}`} style={styles.personCard} onPress={() => router.push(`/person/${person.id}`)}>
                        <Image source={{ uri: person.photoUrl! }} style={styles.personPhoto} contentFit="cover" />
                        <Text style={styles.personName} numberOfLines={2}>{person.name}</Text>
                        <Text style={styles.personKnownFor} numberOfLines={1}>{person.knownFor.join(', ')}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {(category === 'all' || category === 'collections') && collections.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Collections</Text>
                  {collections.data.map((c, i) => (
                    <Pressable key={`collection-${c.id}-${i}`} style={styles.listRow} onPress={() => router.push(`/collection/${c.id}`)}>
                      <View style={styles.listRowThumbOuter}>
                        {c.previewItem?.posterUrl ? (
                          <Image source={{ uri: c.previewItem.posterUrl }} style={styles.listRowThumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.listRowThumb, styles.listRowThumbFallback]} />
                        )}
                      </View>
                      <View style={styles.listRowMeta}>
                        <Text style={styles.listRowTitle}>{c.title}</Text>
                        <Text style={styles.listRowSub}>{c.storyCount} stories</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {(category === 'all' || category === 'lists') && lists.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Lists</Text>
                  {lists.data.map((l, i) => (
                    <Pressable key={`list-${l.id}-${i}`} style={styles.listRow} onPress={() => router.push(`/list/${l.id}`)}>
                      <View style={styles.listRowMeta}>
                        <Text style={styles.listRowTitle}>{l.title}</Text>
                        <Text style={styles.listRowSub}>{l.itemCount} titles{l.ownerName ? ` · by ${l.ownerName}` : ''}</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {(category === 'all' || category === 'users') && users.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Users</Text>
                  {users.data.map((u, i) => (
                    <Pressable key={`user-${u.id}-${i}`} style={styles.listRow} onPress={() => router.push(`/profile/${u.id}`)}>
                      <View style={styles.listRowThumbOuter}>
                        {u.avatarUrl ? (
                          <Image source={{ uri: u.avatarUrl }} style={styles.userAvatar} contentFit="cover" />
                        ) : (
                          <View style={[styles.userAvatar, styles.listRowThumbFallback]}>
                            <MaterialIcons name="person" size={18} color={RS.colors.textMuted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.listRowMeta}>
                        <Text style={styles.listRowTitle}>{u.displayName || u.username}</Text>
                        <Text style={styles.listRowSub}>@{u.username}</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  flex: { flex: 1 },
  searchBarRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.sm },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: RS.spacing.xs, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: RS.spacing.sm + 2, paddingVertical: RS.spacing.sm },
  input: { flex: 1, fontSize: RS.typography.body, color: RS.colors.textPrimary },
  cancelLabel: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.accent },
  // Filter chips — exact spec: 38px fixed height (within the 36-42px range),
  // content-based width, 16px horizontal padding, fully rounded, one
  // horizontally-scrollable row directly under the search bar. Inactive =
  // dark glass (BlurView + RS.glass tokens), active = the app's one green
  // accent token (RS.button.primaryFill/Border/Text) — no new color.
  chipsRow: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.xs + 2, paddingBottom: RS.spacing.sm, alignItems: 'center' },
  chip: {
    height:            38,
    borderRadius:      RS.button.radius,
    paddingHorizontal: 16,
    alignItems:        'center',
    justifyContent:    'center',
    overflow:          'hidden',
    borderWidth:       0.5,
    borderColor:       RS.glass.border,
  },
  chipFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RS.glass.surface,
  },
  chipFillActive: {
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
    borderColor:      RS.button.primaryBorder,
    borderRadius:     RS.button.radius,
  },
  chipLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  chipLabelActive: { color: RS.button.primaryText, fontWeight: '700' },
  scrollContent: { paddingBottom: RS.spacing.xxxl, gap: RS.spacing.md },
  loadingWrap: { paddingVertical: RS.spacing.xl, alignItems: 'center' },
  centered: { paddingVertical: RS.spacing.xl, alignItems: 'center', paddingHorizontal: RS.spacing.lg },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  sectionCaption: { fontSize: RS.typography.overline, color: RS.colors.textMuted, marginTop: -6 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.xs + 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: RS.colors.elevated },
  pillLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  browseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.xs + 2 },
  browseCard: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm + 2 },
  browseLabel: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  posterRow: { gap: RS.spacing.sm },
  personCard: { width: 100, alignItems: 'center', gap: 6 },
  personPhoto: { width: 84, height: 84, borderRadius: 42, backgroundColor: RS.colors.elevated },
  personName: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textPrimary, textAlign: 'center' },
  personKnownFor: { fontSize: RS.typography.overline, color: RS.colors.textMuted, textAlign: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
  listRowThumbOuter: { borderRadius: 8, overflow: 'hidden' },
  listRowThumb: { width: 44, height: 66 },
  listRowThumbFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  userAvatar: { width: 40, height: 40, borderRadius: 20 },
  listRowMeta: { flex: 1, gap: 2 },
  listRowTitle: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  listRowSub: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  chevron: { fontSize: 18, color: RS.colors.textMuted },
});
