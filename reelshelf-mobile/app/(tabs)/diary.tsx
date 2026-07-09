import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDiaryEntries, type DiaryListEntry } from '@/lib/supabase/diary';

type Status = 'loading' | 'success' | 'error';

function DiaryRow({ entry }: { entry: DiaryListEntry }) {
  const handlePress = () => {
    const mediaType = entry.routeId.split('-')[0];
    router.push(
      `/media/${entry.routeId}?title=${encodeURIComponent(entry.title)}&posterUrl=${encodeURIComponent(entry.poster ?? '')}&mediaType=${mediaType}`
    );
  };

  return (
    <Pressable style={styles.row} onPress={handlePress}>
      <View style={styles.thumbOuter}>
        {entry.poster ? (
          <Image source={{ uri: entry.poster }} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.title} numberOfLines={2}>{entry.title}</Text>
        <Text style={styles.watchedDate}>{entry.watchedDate}</Text>
        {entry.rating ? <Text style={styles.rating}>Rated {entry.rating.toFixed(1)}/5</Text> : null}
        {entry.review ? <Text style={styles.review} numberOfLines={2}>{entry.review}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function DiaryScreen() {
  const { user, initializing } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [entries, setEntries] = useState<DiaryListEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus('loading');
    fetchDiaryEntries(user.id)
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [user]);

  if (initializing) {
    return <SafeAreaView style={styles.root} edges={['top']} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <SignInPrompt message="Sign in to see your diary." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.header}>Diary</Text>

      {status === 'loading' ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <SkeletonBlock width={56} height={84} radius={8} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock width="70%" height={16} />
                <SkeletonBlock width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Mark something Watched from Movie Detail to start your diary.</Text>
        </View>
      ) : (
        <FlatList<DiaryListEntry>
          data={entries}
          keyExtractor={(item) => item.routeId}
          renderItem={({ item }) => <DiaryRow entry={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: RS.spacing.lg,
  },
  header: {
    fontSize:          RS.typography.display - 8,
    fontWeight:        '700',
    color:             RS.colors.textPrimary,
    letterSpacing:     RS.letterSpacing.tight,
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.md,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    textAlign: 'center',
  },
  skeletonList: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
  },
  listContent: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.tabBar.contentBottomPad,
  },
  row: {
    flexDirection: 'row',
    gap:           RS.spacing.sm + 4,
    paddingVertical: RS.spacing.sm + 2,
  },
  thumbOuter: {
    borderRadius: 8,
    overflow:     'hidden',
  },
  thumb: {
    width:  56,
    height: 84,
  },
  thumbFallback: {
    backgroundColor: RS.colors.card,
  },
  rowMeta: {
    flex: 1,
    gap:  2,
    justifyContent: 'center',
  },
  title: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '600',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  watchedDate: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
  rating: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.accent,
    marginTop:  2,
  },
  review: {
    fontSize:   RS.typography.caption + 1,
    color:      RS.colors.textSecondary,
    marginTop:  2,
  },
  separator: {
    height:           0.5,
    backgroundColor:  RS.colors.border,
  },
});
