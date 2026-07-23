import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListCard } from '@/components/lists/ListCard';
import { ListEditorModal } from '@/components/lists/ListEditorModal';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { createList, fetchSavedLists, fetchUserLists, type ListEditFields, type UserListSummary } from '@/lib/supabase/lists';
import { getMediaKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error';
type ListsTab = 'mine' | 'saved';

// The real website has no "My Lists"/"Saved Lists" tab split — its Lists
// section (components/profile/UserListsSection.tsx) is titled plainly
// "Lists" and only ever shows the profile owner's own lists; Saved Lists
// (list_saves) has no dedicated browsing view on web at all (confirmed —
// same audit finding as Home's Friends Activity). This tab structure is a
// deliberate mobile-only enhancement to surface list_saves, which the
// website's data model already supports but never gave its own screen.

export default function ListsScreen() {
  const { user, initializing } = useAuth();
  const [activeTab, setActiveTab] = useState<ListsTab>('mine');
  const [status, setStatus] = useState<Status>('loading');
  const [lists, setLists] = useState<UserListSummary[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    setStatus('loading');
    const fetcher = activeTab === 'mine' ? fetchUserLists(user.id, true) : fetchSavedLists(user.id);
    fetcher
      .then((data) => {
        setLists(data);
        setStatus('success');
      })
      .catch(() => {
        setStatus('error');
      });
  }, [user, activeTab]);

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

  const switchTab = (tab: ListsTab) => {
    if (tab === activeTab) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Lists</Text>
        <View style={styles.headerActions}>
          {/* Entry point into the real website's Lists Discovery (app/lists/
              page.tsx) — public lists across the whole community, distinct
              from this tab's own "My Lists"/"Saved Lists" (a deliberate
              mobile-only split, see the comment above ListsTab). */}
          <Pressable
            style={styles.discoverBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push('/list-discover');
            }}
          >
            <MaterialIcons name="explore" size={18} color={RS.colors.textSecondary} />
          </Pressable>
          {activeTab === 'mine' && (
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
          )}
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable style={[styles.tabPill, activeTab === 'mine' && styles.tabPillActive]} onPress={() => switchTab('mine')}>
          <Text style={[styles.tabLabel, activeTab === 'mine' && styles.tabLabelActive]}>My Lists</Text>
        </Pressable>
        <Pressable style={[styles.tabPill, activeTab === 'saved' && styles.tabPillActive]} onPress={() => switchTab('saved')}>
          <Text style={[styles.tabLabel, activeTab === 'saved' && styles.tabLabelActive]}>Saved Lists</Text>
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
          {activeTab === 'mine' ? (
            <>
              <Text style={styles.emptyText}>You haven&apos;t created any lists yet.</Text>
              <Pressable style={styles.emptyCta} onPress={() => setEditorOpen(true)}>
                <Text style={styles.emptyCtaLabel}>Create your first list</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyText}>Lists you save from other members will show up here.</Text>
          )}
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
    paddingBottom:     RS.spacing.sm,
  },
  header: {
    fontSize:      RS.typography.display - 8,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.sm,
  },
  discoverBtn: {
    width:  36,
    height: 36,
    borderRadius: 18,
    borderWidth:  0.5,
    borderColor:  RS.colors.border,
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  tabRow: {
    flexDirection:     'row',
    gap:               RS.spacing.xs,
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md,
  },
  tabPill: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: 14,
    paddingVertical:   7,
  },
  tabPillActive: {
    backgroundColor: RS.button.primaryFill,
    borderColor:      RS.button.primaryBorder,
  },
  tabLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.colors.textSecondary,
  },
  tabLabelActive: {
    color: RS.button.primaryText,
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
});
