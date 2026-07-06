import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContinueWatchingCard } from '@/components/continue-watching-card';
import { PosterCard } from '@/components/poster-card';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';

// static placeholder list — no data source yet
const POSTER_PLACEHOLDERS = Array.from({ length: 7 }, (_, i) => ({ id: String(i) }));

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Wordmark header ── */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>ReelShelf</Text>
        </View>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroHeading}>Discover your next story</Text>
          <Text style={styles.heroSub}>Track films, series and books you love.</Text>
        </View>

        {/* ── Trending poster row ── */}
        <SectionHeader title="Trending Now" />
        <FlatList
          data={POSTER_PLACEHOLDERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ width: RS.spacing.sm }} />}
          contentContainerStyle={styles.posterList}
          renderItem={() => <PosterCard />}
        />

        {/* ── Continue Watching ── */}
        <SectionHeader title="Continue Watching" />
        <ContinueWatchingCard />

        <View style={{ height: RS.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  header: {
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.xs,
  },
  wordmark: {
    fontSize:      RS.typography.display,
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: -1,
  },
  hero: {
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.md,
    gap:               RS.spacing.xs,
  },
  heroHeading: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.3,
    lineHeight:    28,
  },
  heroSub: {
    fontSize: RS.typography.body,
    color:    RS.colors.textSecondary,
  },
  posterList: {
    paddingHorizontal: RS.spacing.md,
  },
});
