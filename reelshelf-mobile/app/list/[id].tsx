import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { fetchListDetail, type ListDetail, type ListDetailItem } from '@/lib/supabase/lists';

type Status = 'loading' | 'success' | 'error' | 'not_found';

function ListItemRow({ item }: { item: ListDetailItem }) {
  const handlePress = () => {
    const mediaType = item.routeId.split('-')[0];
    router.push(`/media/${item.routeId}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${mediaType}`);
  };

  return (
    <Pressable style={styles.itemRow} onPress={handlePress}>
      <Text style={styles.rank}>{item.rankOrder}</Text>
      <View style={styles.thumbOuter}>
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
      </View>
      <View style={styles.itemMeta}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        {item.year ? <Text style={styles.itemYear}>{item.year}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// Minimal List Detail — a specific user_list's title/description/items,
// respecting existing visibility RLS (a private list viewed by a non-owner
// simply returns not_found — that's expected, not a bug to work around).
export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [list, setList] = useState<ListDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchListDetail(id)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setStatus('not_found');
          return;
        }
        setList(data);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
      </Pressable>

      {status === 'loading' ? (
        <View style={styles.centered} />
      ) : status === 'not_found' ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>This list isn&apos;t available.</Text>
        </View>
      ) : status === 'error' || !list ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load this list.</Text>
        </View>
      ) : (
        <FlatList<ListDetailItem>
          data={list.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListItemRow item={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.listTitle}>{list.title}</Text>
              {list.description ? <Text style={styles.listDescription}>{list.description}</Text> : null}
              {list.ownerName ? <Text style={styles.owner}>By {list.ownerName}</Text> : null}
              <Text style={styles.count}>{list.items.length} {list.items.length === 1 ? 'title' : 'titles'}</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>This list is empty.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  backRow: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  listContent: { paddingBottom: RS.spacing.xxxl },
  header: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.lg, gap: RS.spacing.xs },
  listTitle: { fontSize: RS.typography.display - 8, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: RS.letterSpacing.tight },
  listDescription: { fontSize: RS.typography.subheading, color: RS.colors.textSecondary, lineHeight: 21 },
  owner: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  count: { fontSize: RS.typography.overline, fontWeight: '600', color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginTop: RS.spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm },
  rank: { width: 20, fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textMuted, textAlign: 'center' },
  thumbOuter: { borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 56, height: 84 },
  thumbFallback: { backgroundColor: RS.colors.card },
  itemMeta: { flex: 1, gap: 2 },
  itemTitle: { fontSize: RS.typography.subheading, fontWeight: '600', color: RS.colors.textPrimary },
  itemYear: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  chevron: { fontSize: 20, color: RS.colors.textMuted },
  separator: { height: 0.5, marginHorizontal: RS.spacing.md, backgroundColor: RS.colors.border },
});
