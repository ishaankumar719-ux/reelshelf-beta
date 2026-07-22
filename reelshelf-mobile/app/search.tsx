import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ListCoverCollage } from '@/components/lists/ListCoverCollage';
import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { resolveImageUrl } from '@/lib/resolveImageUrl';
import { searchMovies, searchTv, searchPeople, type TmdbSearchResult, type TmdbPersonSearchResult } from '@/lib/tmdb';
import { searchBooks, searchCollections, searchLists, searchUsers,
  type BookSearchResult, type CollectionSearchResult, type ListSearchResult, type UserSearchResult } from '@/lib/search';
import { addRecentSearch, clearRecentSearches, getRecentSearches } from '@/lib/recentSearches';
import { getMediaKey } from '@/utils/listKeys';

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

// Crossfades the active-color fill in/out instead of an instant style swap —
// BlurView stays permanently mounted (never toggled) so there's no
// mount/unmount pop underneath the fade, matching the app's calm/non-bouncy
// motion convention (timing, not spring, for an opacity crossfade).
function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const activeOpacity = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    activeOpacity.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, activeOpacity]);
  const activeFillStyle = useAnimatedStyle(() => ({ opacity: activeOpacity.value }));

  return (
    <Pressable style={styles.chip} onPress={onPress}>
      <BlurView tint="dark" intensity={RS.blur.cardLight} style={StyleSheet.absoluteFill} />
      <View style={styles.chipFill} />
      <Animated.View style={[styles.chipFill, styles.chipFillActive, activeFillStyle]} />
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const VALID_CATEGORIES = new Set(CATEGORY_CHIPS.map((c) => c.key));

export default function SearchScreen() {
  // Supports deep-linking straight into a category, e.g. Home's Friends
  // Activity "Find Friends" button opening Search with Users pre-selected
  // (/search?category=users) — falls back to 'all' for a normal open or an
  // unrecognized value.
  const { category: initialCategory } = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>(
    initialCategory && VALID_CATEGORIES.has(initialCategory as Category) ? (initialCategory as Category) : 'all',
  );
  const [recent, setRecent] = useState<string[]>([]);

  const [movies, setMovies] = useState<SectionState<TmdbSearchResult>>(idleSection());
  const [tv, setTv] = useState<SectionState<TmdbSearchResult>>(idleSection());
  const [books, setBooks] = useState<SectionState<BookSearchResult>>(idleSection());
  const [people, setPeople] = useState<SectionState<TmdbPersonSearchResult>>(idleSection());
  const [collections, setCollections] = useState<SectionState<CollectionSearchResult>>(idleSection());
  const [lists, setLists] = useState<SectionState<ListSearchResult>>(idleSection());
  const [users, setUsers] = useState<SectionState<UserSearchResult>>(idleSection());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request-id guard — debouncing controls how OFTEN a search
  // fires, not the ORDER in which responses arrive. Without this, a fast
  // typer can have an earlier keystroke's slower network response resolve
  // AFTER a later, more current one, silently overwriting fresher results
  // with stale ones. Every async fetch below checks its own id against this
  // ref before committing state.
  const requestIdRef = useRef(0);

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
    const requestId = ++requestIdRef.current;
    const isStale = () => requestIdRef.current !== requestId;

    if (wantAll || category === 'movies') {
      setMovies({ status: 'loading', data: [] });
      searchMovies(q)
        .then((data) => { if (!isStale()) setMovies({ status: 'success', data }); })
        .catch(() => { if (!isStale()) setMovies({ status: 'error', data: [] }); });
    }
    if (wantAll || category === 'tv') {
      setTv({ status: 'loading', data: [] });
      searchTv(q)
        .then((data) => { if (!isStale()) setTv({ status: 'success', data }); })
        .catch(() => { if (!isStale()) setTv({ status: 'error', data: [] }); });
    }
    if (wantAll || category === 'books') {
      setBooks({ status: 'loading', data: [] });
      searchBooks(q)
        .then((data) => { if (!isStale()) setBooks({ status: 'success', data }); })
        .catch(() => { if (!isStale()) setBooks({ status: 'error', data: [] }); });
    }
    if (wantAll || category === 'people') {
      setPeople({ status: 'loading', data: [] });
      searchPeople(q)
        .then((data) => { if (!isStale()) setPeople({ status: 'success', data }); })
        .catch(() => { if (!isStale()) setPeople({ status: 'error', data: [] }); });
    }
    if (wantAll || category === 'collections') {
      setCollections({ status: 'loading', data: [] });
      searchCollections(q)
        .then((data) => { if (!isStale()) setCollections({ status: 'success', data }); })
        .catch(() => { if (!isStale()) setCollections({ status: 'error', data: [] }); });
    }
    if (wantAll || category === 'lists') {
      setLists({ status: 'loading', data: [] });
      searchLists(q)
        .then((data) => { if (!isStale()) setLists({ status: 'success', data }); })
        .catch(() => { if (!isStale()) setLists({ status: 'error', data: [] }); });
    }
    if (wantAll || category === 'users') {
      setUsers({ status: 'loading', data: [] });
      searchUsers(q)
        .then((data) => { if (!isStale()) setUsers({ status: 'success', data }); })
        .catch(() => { if (!isStale()) setUsers({ status: 'error', data: [] }); });
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
  const anyLoading = [movies, tv, books, people, collections, lists, users].some((s) => s.status === 'loading');
  const allSettled = [movies, tv, books, people, collections, lists, users].every((s) => s.status !== 'loading' && s.status !== 'idle');

  // Distinguishes "genuinely no results" from "the network call(s) actually
  // failed" — only the async sections relevant to the current filter count,
  // since switching category doesn't re-query the others (they just stay
  // hidden).
  const asyncSectionsByCategory: Record<string, SectionState<unknown>> = { movies, tv, books, people, collections, lists, users };
  const relevantErrorKeys = category === 'all'
    ? ['movies', 'tv', 'books', 'people', 'collections', 'lists', 'users']
    : [category];
  const relevantErrorSections = relevantErrorKeys.map((k) => asyncSectionsByCategory[k]);
  const allAttemptedErrored = relevantErrorSections.length > 0 && relevantErrorSections.every((s) => s.status === 'error');

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
      return { title: c.title, subtitle: `${c.storyCount} stories`, imageUrl: c.previewItems[0]?.posterUrl ?? null, onPress: () => router.push(`/collection/${c.id}`) };
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
          {CATEGORY_CHIPS.map((chip) => (
            <CategoryChip
              key={getMediaKey('chip', chip.key)}
              label={chip.label}
              active={category === chip.key}
              onPress={() => setCategory(chip.key)}
            />
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!hasQuery ? (
            <>
              {recent.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <Pressable onPress={() => clearRecentSearches().then(() => setRecent([]))} hitSlop={8}>
                      <Text style={styles.clearLabel}>Clear</Text>
                    </Pressable>
                  </View>
                  <View style={styles.pillWrap}>
                    {recent.map((q, i) => (
                      <Pressable key={getMediaKey('recent', `${q}-${i}`)} style={styles.pill} onPress={() => handleTapRecentOrTrending(q)}>
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
                    <Pressable key={getMediaKey('trending', `${q}-${i}`)} style={styles.pill} onPress={() => handleTapRecentOrTrending(q)}>
                      <MaterialIcons name="trending-up" size={14} color={RS.colors.accent} />
                      <Text style={styles.pillLabel}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Browse ReelShelf</Text>
                <View style={styles.browseGrid}>
                  {CATEGORY_CHIPS.filter((c) => c.key !== 'all').map((c) => (
                    <Pressable key={getMediaKey('browse', c.key)} style={styles.browseCard} onPress={() => setCategory(c.key)}>
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
          ) : allSettled && !anyResults && allAttemptedErrored ? (
            <View style={styles.centered}>
              <MaterialIcons name="cloud-off" size={28} color={RS.colors.textMuted} />
              <Text style={styles.emptyText}>Couldn&apos;t reach the network. Check your connection and try again.</Text>
              <Pressable style={styles.retryBtn} onPress={() => runSearch(query.trim())}>
                <Text style={styles.retryLabel}>Retry</Text>
              </Pressable>
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
                      <View key={getMediaKey('film', `${item.id}-${i}`)}>
                        <PosterCard title={item.title} year={item.year} mediaType="film" posterUrl={resolveImageUrl(item.posterUrl)}
                          onPress={() => openMedia(item.id, item.title, item.posterUrl, 'film')} />
                        {typeof item.rating === 'number' && (
                          <View style={styles.ratingPill}><Text style={styles.ratingPillText}>{item.rating.toFixed(1)}</Text></View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {(category === 'all' || category === 'tv') && tv.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>TV</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                    {tv.data.map((item, i) => (
                      <View key={getMediaKey('tv', `${item.id}-${i}`)}>
                        <PosterCard title={item.title} year={item.year} mediaType="tv" posterUrl={resolveImageUrl(item.posterUrl)}
                          onPress={() => openMedia(item.id, item.title, item.posterUrl, 'tv')} />
                        {typeof item.rating === 'number' && (
                          <View style={styles.ratingPill}><Text style={styles.ratingPillText}>{item.rating.toFixed(1)}</Text></View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {(category === 'all' || category === 'books') && books.data.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Books</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                    {books.data.map((item, i) => (
                      <View key={getMediaKey('book', `${item.id}-${i}`)} style={styles.bookCard}>
                        <PosterCard title={item.title} year={item.year} mediaType="book" posterUrl={resolveImageUrl(item.posterUrl)}
                          onPress={() => openMedia(item.id, item.title, item.posterUrl, 'book')} />
                        {item.author ? <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text> : null}
                      </View>
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
                      <Pressable key={getMediaKey('person', `${person.id}-${i}`)} style={styles.personCard} onPress={() => router.push(`/person/${person.id}`)}>
                        <Image source={{ uri: resolveImageUrl(person.photoUrl, 'profile')! }} style={styles.personPhoto} contentFit="cover" />
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
                    <Pressable key={getMediaKey('collection', `${c.id}-${i}`)} style={styles.listRow} onPress={() => router.push(`/collection/${c.id}`)}>
                      <View style={styles.collageThumbOuter}>
                        <ListCoverCollage items={c.previewItems.map((it, idx) => ({ url: resolveImageUrl(it.posterUrl), alt: `${c.title} preview ${idx + 1}` }))} />
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
                    <Pressable key={getMediaKey('list', `${l.id}-${i}`)} style={styles.listRow} onPress={() => router.push(`/list/${l.id}`)}>
                      <View style={styles.collageThumbOuter}>
                        <ListCoverCollage items={l.previewPosters.map((url, idx) => ({ url, alt: `${l.title} cover ${idx + 1}` }))} />
                      </View>
                      <View style={styles.listRowMeta}>
                        <Text style={styles.listRowTitle}>{l.title}</Text>
                        <Text style={styles.listRowSub}>{l.itemCount} titles{l.ownerName ? ` · by ${l.ownerName}` : ''}{l.likeCount > 0 ? ` · ♡ ${l.likeCount}` : ''}</Text>
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
                    <Pressable key={getMediaKey('user', `${u.id}-${i}`)} style={styles.listRow} onPress={() => router.push(`/profile/${u.id}`)}>
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
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  sectionCaption: { fontSize: RS.typography.overline, color: RS.colors.textMuted, marginTop: -6 },
  clearLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.accent },
  retryBtn: { marginTop: RS.spacing.md, borderRadius: RS.button.radius, backgroundColor: RS.button.filledBg, paddingHorizontal: RS.button.paddingH, paddingVertical: RS.button.paddingV },
  retryLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.button.filledText },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.xs + 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: RS.colors.elevated },
  pillLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  browseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.xs + 2 },
  browseCard: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm + 2 },
  browseLabel: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  posterRow: { gap: RS.spacing.sm },
  ratingPill: {
    position: 'absolute', top: RS.spacing.xs, right: RS.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: RS.button.radius,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingPillText: { fontSize: 10, fontWeight: '700', color: RS.colors.textPrimary },
  bookCard: { gap: 4 },
  bookAuthor: { fontSize: RS.typography.overline, color: RS.colors.textMuted, maxWidth: RS.card.posterWidth },
  collageThumbOuter: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden' },
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
