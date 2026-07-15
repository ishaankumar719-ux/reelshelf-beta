import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { localBooks } from '@/data/localBooks';
import { getGenreConfig } from '@/lib/genreConfig';
import { resolveImageUrl } from '@/lib/resolveImageUrl';
import { fetchTmdbDiscoverByGenre, type GenreDiscoverItem } from '@/lib/tmdb';
import { getMediaKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error';

interface GenreBookItem {
  id:    string; // local book slug, e.g. "dune-book"
  title: string;
  year:  string;
}

// Genre Detail — a direct port of the website's /discover/genre/[genre] page:
// same 12 genres, same TMDB genre-id mapping, same book-keyword matching
// (lib/genreConfig.ts + data/localBooks.ts). Movies/TV capped at 12 each,
// matching the website's `slice(0, 12)`; books show every keyword match, same
// as the website (no cap there either).
export default function GenreDetailScreen() {
  const { genre } = useLocalSearchParams<{ genre: string }>();
  const config = getGenreConfig(genre ?? '');

  const [status, setStatus] = useState<Status>('loading');
  const [movies, setMovies] = useState<GenreDiscoverItem[]>([]);
  const [tv, setTv] = useState<GenreDiscoverItem[]>([]);

  useEffect(() => {
    if (!config) { setStatus('error'); return; }
    let cancelled = false;
    setStatus('loading');
    Promise.all([
      fetchTmdbDiscoverByGenre('movie', config.movieId),
      fetchTmdbDiscoverByGenre('tv', config.tvId),
    ])
      .then(([movieResults, tvResults]) => {
        if (cancelled) return;
        setMovies(movieResults.slice(0, 12));
        setTv(tvResults.slice(0, 12));
        setStatus('success');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [config]);

  const openMediaDetail = (routeId: string, title: string, poster: string | null, mediaType: string) => {
    router.push(`/media/${routeId}?title=${encodeURIComponent(title)}&posterUrl=${encodeURIComponent(poster ?? '')}&mediaType=${mediaType}`);
  };

  if (!config) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Unknown genre.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const genreBooks: GenreBookItem[] = localBooks.filter((b) =>
    config.bookKeywords.some((kw) => b.genre.toLowerCase().includes(kw.toLowerCase())),
  );

  const hasAnyContent = movies.length > 0 || tv.length > 0 || genreBooks.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
        <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Genre</Text>
          <Text style={styles.title}>{config.emoji}  {config.label}</Text>
        </View>

        {status === 'loading' ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={RS.colors.accent} />
          </View>
        ) : status === 'error' ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Couldn&apos;t load this genre right now.</Text>
          </View>
        ) : !hasAnyContent ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No results found for this genre right now.</Text>
          </View>
        ) : (
          <>
            {movies.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Films</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {movies.map((item, i) => (
                    <PosterCard
                      key={getMediaKey('film', `${item.id}-${i}`)}
                      title={item.title}
                      year={item.year}
                      mediaType="film"
                      posterUrl={resolveImageUrl(item.posterUrl)}
                      onPress={() => openMediaDetail(item.id, item.title, item.posterUrl, 'film')}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {tv.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TV Shows</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {tv.map((item, i) => (
                    <PosterCard
                      key={getMediaKey('tv', `${item.id}-${i}`)}
                      title={item.title}
                      year={item.year}
                      mediaType="tv"
                      posterUrl={resolveImageUrl(item.posterUrl)}
                      onPress={() => openMediaDetail(item.id, item.title, item.posterUrl, 'tv')}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {genreBooks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Books</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                  {genreBooks.map((book, i) => (
                    <PosterCard
                      key={getMediaKey('book', `${book.id}-${i}`)}
                      title={book.title}
                      year={Number(book.year)}
                      mediaType="book"
                      posterUrl={null}
                      onPress={() => openMediaDetail(`book-${book.id}`, book.title, null, 'book')}
                    />
                  ))}
                </ScrollView>
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
  backBtn: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs },
  scrollContent: { paddingBottom: RS.tabBar.contentBottomPad, gap: RS.spacing.lg },
  header: { paddingHorizontal: RS.spacing.md, gap: 4 },
  eyebrow: { fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
  title: { fontSize: RS.typography.display - 6, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: RS.letterSpacing.tight },
  loadingWrap: { paddingVertical: RS.spacing.xl, alignItems: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg, paddingVertical: RS.spacing.xl },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  posterRow: { gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
});
