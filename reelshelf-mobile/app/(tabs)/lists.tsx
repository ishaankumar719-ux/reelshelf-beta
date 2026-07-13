import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListCoverCollage } from '@/components/lists/ListCoverCollage';
import { ListEditorModal } from '@/components/lists/ListEditorModal';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { createList, fetchUserLists, type ListEditFields, type UserListSummary } from '@/lib/supabase/lists';
import { getMediaKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error';

function ListCard({ list, onPress }: { list: UserListSummary; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.coverWrap}>
        <ListCoverCollage items={list.previewPosters.map((url, i) => ({ url, alt: `${list.title} cover ${i + 1}` }))} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{list.title}</Text>
          {list.isRanked && (
            <View style={styles.rankedBadge}>
              <Text style={styles.rankedBadgeLabel}>Ranked</Text>
            </View>
          )}
        </View>
        {list.description ? <Text style={styles.cardDescription} numberOfLines={2}>{list.description}</Text> : null}
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardCount}>{list.itemCount} {list.itemCount === 1 ? 'title' : 'titles'}</Text>
          {list.visibility !== 'public' && (
            <Text style={styles.cardVisibility}>
              {list.visibility === 'private' ? '🔒 Private' : '🔗 Unlisted'}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ListsScreen() {
  const { user, initializing } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [lists, setLists] = useState<UserListSummary[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setStatus('loading');
    fetchUserLists(user.id, true)
      .then((data) => {
        setLists(data);
        setStatus('success');
      })
      .catch(() => {
        setStatus('error');
      });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (fields: ListEditFields) => {
    if (!user) return;
    const newId = await createList(user.id, fields);
    await new Promise<void>((resolve) => { load(); resolve(); });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push(`/list/${newId}`);
  };

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
      <View style={styles.headerRow}>
        <Text style={styles.header}>Lists</Text>
        <Pressable
          style={styles.newListBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setEditorOpen(true);
          }}
        >
          <MaterialIcons name="add" size={16} color={RS.button.primaryText} />
          <Text style={styles.newListLabel}>New List</Text>
        </Pressable>
      </View>

      {status === 'loading' ? (
        <View style={styles.skeletonList}>
          {[0, 1].map((i) => (
            <SkeletonBlock key={getMediaKey('lists-skeleton', i)} height={220} radius={RS.card.radius} style={{ marginHorizontal: RS.spacing.md }} />
          ))}
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You haven&apos;t created any lists yet.</Text>
          <Pressable style={styles.emptyCta} onPress={() => setEditorOpen(true)}>
            <Text style={styles.emptyCtaLabel}>Create your first list</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<UserListSummary>
          data={lists}
          keyExtractor={(item) => getMediaKey('list', item.id)}
          renderItem={({ item }) => <ListCard list={item} onPress={() => router.push(`/list/${item.id}`)} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: RS.spacing.md }} />}
        />
      )}

      <ListEditorModal
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleCreate}
      />
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
    gap:               RS.spacing.md,
  },
  headerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.md,
  },
  header: {
    fontSize:      RS.typography.display - 8,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  newListBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.primaryFill,
    borderWidth:       1,
    borderColor:       RS.button.primaryBorder,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  newListLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.button.primaryText,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    textAlign: 'center',
  },
  emptyCta: {
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingHorizontal: RS.button.paddingH,
    paddingVertical:   RS.button.paddingV,
  },
  emptyCtaLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.button.filledText,
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
    overflow:          'hidden',
  },
  coverWrap: {
    width:  '100%',
    height: 140,
  },
  cardBody: {
    padding: RS.spacing.md,
    gap:     RS.spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.xs,
  },
  cardTitle: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    flexShrink:    1,
  },
  rankedBadge: {
    borderRadius:      4,
    borderWidth:       0.5,
    borderColor:       'rgba(251,191,36,0.3)',
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  rankedBadgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color:         'rgba(251,191,36,0.85)',
  },
  cardDescription: {
    fontSize: RS.typography.caption + 1,
    color:    RS.colors.textSecondary,
  },
  cardMetaRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:      2,
  },
  cardCount: {
    fontSize:      RS.typography.overline,
    fontWeight:    '600',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
  cardVisibility: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
  },
});
