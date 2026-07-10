import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PosterCard } from '@/components/poster-card';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { fetchPersonDetail, type TmdbPersonDetail } from '@/lib/tmdb';
import { getMediaKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error';

// Minimal Person Detail — photo, name, known-for, real TMDB data. A
// foundation for richer future work (full filmography, bio expansion), not
// an exhaustive feature — consistent with how Movie Detail started minimal
// in its own first phase.
export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [person, setPerson] = useState<TmdbPersonDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchPersonDetail(id)
      .then((data) => {
        if (cancelled) return;
        setPerson(data);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
        <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
      </Pressable>

      {status === 'loading' ? (
        <View style={styles.loadingWrap}>
          <SkeletonBlock width={120} height={120} radius={60} />
          <SkeletonBlock width={160} height={20} style={{ marginTop: RS.spacing.md }} />
        </View>
      ) : status === 'error' || !person ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load this person.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            {person.photoUrl ? (
              <Image source={{ uri: person.photoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.photoFallback]}>
                <MaterialIcons name="person" size={48} color={RS.colors.textMuted} />
              </View>
            )}
            <Text style={styles.name}>{person.name}</Text>
            {person.birthday ? <Text style={styles.birthday}>Born {person.birthday}</Text> : null}
          </View>

          {person.biography ? (
            <Text style={styles.bio} numberOfLines={8}>{person.biography}</Text>
          ) : null}

          {person.knownFor.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Known For</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={person.knownFor}
                keyExtractor={(item) => getMediaKey(item.mediaType, item.id)}
                contentContainerStyle={styles.posterRow}
                renderItem={({ item }) => (
                  <PosterCard
                    title={item.title}
                    mediaType={item.mediaType}
                    posterUrl={item.posterUrl}
                    onPress={() => router.push(`/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`)}
                  />
                )}
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  backBtn: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  scrollContent: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xl, gap: RS.spacing.md },
  header: { alignItems: 'center', gap: 4 },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary, marginTop: RS.spacing.sm },
  birthday: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  bio: { fontSize: RS.typography.body, color: RS.colors.textSecondary, lineHeight: 21 },
  section: { gap: RS.spacing.sm },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  posterRow: { gap: RS.spacing.sm },
});
