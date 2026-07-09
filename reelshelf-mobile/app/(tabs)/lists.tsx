import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserLists, type UserListSummary } from '@/lib/supabase/lists';

type Status = 'loading' | 'success' | 'error';

function ListCard({ list }: { list: UserListSummary }) {
  return (
    <View style={styles.card}>
      <View style={styles.posterRow}>
        {list.previewPosters.length > 0 ? (
          list.previewPosters.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.posterThumb} contentFit="cover" transition={150} />
          ))
        ) : (
          <View style={[styles.posterThumb, styles.posterFallback]} />
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{list.title}</Text>
      {list.description ? <Text style={styles.cardDescription} numberOfLines={2}>{list.description}</Text> : null}
      <Text style={styles.cardCount}>{list.itemCount} {list.itemCount === 1 ? 'title' : 'titles'}</Text>
    </View>
  );
}

export default function ListsScreen() {
  const { user, initializing } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [lists, setLists] = useState<UserListSummary[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus('loading');
    fetchUserLists(user.id)
      .then((data) => {
        if (cancelled) return;
        setLists(data);
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
          <SignInPrompt message="Sign in to see your lists." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.header}>Lists</Text>

      {status === 'loading' ? (
        <View style={styles.skeletonList}>
          {[0, 1].map((i) => (
            <SkeletonBlock key={i} height={140} radius={RS.card.radius} style={{ marginHorizontal: RS.spacing.md }} />
          ))}
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You haven&apos;t created any lists yet.</Text>
        </View>
      ) : (
        <FlatList<UserListSummary>
          data={lists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListCard list={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: RS.spacing.md }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  centered: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
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
    gap: RS.spacing.md,
  },
  listContent: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.tabBar.contentBottomPad,
  },
  card: {
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.card,
    padding:           RS.spacing.md,
    gap:               RS.spacing.xs,
  },
  posterRow: {
    flexDirection: 'row',
    gap:           6,
    marginBottom:  RS.spacing.xs,
  },
  posterThumb: {
    width:        48,
    height:       72,
    borderRadius: 6,
  },
  posterFallback: {
    backgroundColor: RS.colors.elevated,
  },
  cardTitle: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  cardDescription: {
    fontSize:   RS.typography.caption + 1,
    color:      RS.colors.textSecondary,
  },
  cardCount: {
    fontSize:      RS.typography.overline,
    fontWeight:    '600',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
    marginTop:     2,
  },
});
