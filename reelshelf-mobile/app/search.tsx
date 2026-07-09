import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {CATEGORY_CHIPS.map((chip) => (
          <Pressable
            key={chip.key}
            style={[styles.chip, category === chip.key && styles.chipActive]}
            onPress={() => setCategory(chip.key)}
          >
            <Text style={[styles.chipLabel, category === chip.key && styles.chipLabelActive]}>{chip.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!hasQuery ? (
          <>
            {recent.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <View style={styles.pillWrap}>
                  {recent.map((q) => (
                    <Pressable key={q} style={styles.pill} onPress={() => handleTapRecentOrTrending(q)}>
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
                {TRENDING_SEARCHES.map((q) => (
                  <Pressable key={q} style={styles.pill} onPress={() => handleTapRecentOrTrending(q)}>
                    <MaterialIcons name="trending-up" size={14} color={RS.colors.accent} />
                    <Text style={styles.pillLabel}>{q}</Text>
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
            {(category === 'all' || category === 'movies') && movies.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Movies</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {movies.data.map((item) => (
                    <PosterCard key={item.id} title={item.title} year={item.year} mediaType="film" posterUrl={item.posterUrl}
                      onPress={() => openMedia(item.id, item.title, item.posterUrl, 'film')} />
                  ))}
                </ScrollView>
              </View>
            )}

            {(category === 'all' || category === 'tv') && tv.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TV</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {tv.data.map((item) => (
                    <PosterCard key={item.id} title={item.title} year={item.year} mediaType="tv" posterUrl={item.posterUrl}
                      onPress={() => openMedia(item.id, item.title, item.posterUrl, 'tv')} />
                  ))}
                </ScrollView>
              </View>
            )}

            {(category === 'all' || category === 'books') && books.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Books</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {books.data.map((item) => (
                    <PosterCard key={item.id} title={item.title} year={item.year} mediaType="book" posterUrl={item.posterUrl}
                      onPress={() => openMedia(item.id, item.title, item.posterUrl, 'book')} />
                  ))}
                </ScrollView>
              </View>
            )}

            {(category === 'all' || category === 'people') && people.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>People</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {people.data.map((person) => (
                    <Pressable key={person.id} style={styles.personCard} onPress={() => router.push(`/person/${person.id}`)}>
                      {person.photoUrl ? (
                        <Image source={{ uri: person.photoUrl }} style={styles.personPhoto} contentFit="cover" />
                      ) : (
                        <View style={[styles.personPhoto, styles.personPhotoFallback]}>
                          <MaterialIcons name="person" size={28} color={RS.colors.textMuted} />
                        </View>
                      )}
                      <Text style={styles.personName} numberOfLines={2}>{person.name}</Text>
                      {person.knownFor.length > 0 && (
                        <Text style={styles.personKnownFor} numberOfLines={1}>{person.knownFor.join(', ')}</Text>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {(category === 'all' || category === 'collections') && collections.data.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Collections</Text>
                {collections.data.map((c) => (
                  <Pressable key={c.id} style={styles.listRow} onPress={() => router.push(`/collection/${c.id}`)}>
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
                {lists.data.map((l) => (
                  <Pressable key={l.id} style={styles.listRow} onPress={() => router.push(`/list/${l.id}`)}>
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
                {users.data.map((u) => (
                  <Pressable key={u.id} style={styles.listRow} onPress={() => router.push(`/profile/${u.id}`)}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  searchBarRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.sm },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: RS.spacing.xs, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: RS.spacing.sm + 2, paddingVertical: RS.spacing.sm },
  input: { flex: 1, fontSize: RS.typography.body, color: RS.colors.textPrimary },
  cancelLabel: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.accent },
  chipsRow: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.xs + 2, paddingBottom: RS.spacing.sm },
  chip: { borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: RS.colors.elevated },
  chipActive: { borderColor: RS.button.primaryBorder, backgroundColor: RS.button.primaryFill, borderWidth: 1 },
  chipLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  chipLabelActive: { color: RS.button.primaryText },
  scrollContent: { paddingBottom: RS.spacing.xxxl, gap: RS.spacing.lg },
  loadingWrap: { paddingVertical: RS.spacing.xl, alignItems: 'center' },
  centered: { paddingVertical: RS.spacing.xl, alignItems: 'center', paddingHorizontal: RS.spacing.lg },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  sectionCaption: { fontSize: RS.typography.overline, color: RS.colors.textMuted, marginTop: -6 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.xs + 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: RS.colors.elevated },
  pillLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  posterRow: { gap: RS.spacing.sm },
  personCard: { width: 100, alignItems: 'center', gap: 6 },
  personPhoto: { width: 84, height: 84, borderRadius: 42 },
  personPhotoFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
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
