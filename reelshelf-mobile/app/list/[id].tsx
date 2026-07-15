import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddListItemsModal } from '@/components/lists/AddListItemsModal';
import { ListCoverCollage } from '@/components/lists/ListCoverCollage';
import { ListEditorModal } from '@/components/lists/ListEditorModal';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  deleteList, fetchListDetail, fetchListEngagementState, likeList, removeListItem,
  reorderListItems, saveList, unlikeList, unsaveList, updateList,
  type ListDetail, type ListDetailItem, type ListEditFields,
} from '@/lib/supabase/lists';
import { getMediaKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error' | 'not_found';

const ROW_HEIGHT = 78; // fixed row height (incl. vertical padding) — required for the drag-index math below

// Placeholder deep-link format, matching the exact convention Movie Detail's
// share already established (`reelShelfShareUrl` in MediaPrimaryActions.tsx)
// — documents the intended shape, does not resolve to anything real yet.
function reelShelfListShareUrl(id: string): string {
  return `https://reelshelf.app/lists/${id}`;
}

const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  film: { bg: RS.badge.film.bg, text: RS.badge.film.text, label: 'FILM' },
  tv:   { bg: RS.badge.tv.bg,   text: RS.badge.tv.text,   label: 'TV' },
  book: { bg: RS.badge.book.bg, text: RS.badge.book.text, label: 'BOOK' },
};

interface DraggableRowProps {
  item:          ListDetailItem;
  index:         number;
  total:         number;
  isRanked:      boolean;
  canReorder:    boolean;
  canRemove:     boolean;
  dragActiveId:  string | null;
  dragFromIndex: number;
  dragTargetIdx: number;
  onDragStart:   (id: string, index: number) => void;
  onDragUpdate:  (translationY: number) => void;
  onDragEnd:     () => void;
  onPress:       () => void;
  onRemove:      () => void;
}

function DraggableRow({
  item, index, total, isRanked, canReorder, canRemove,
  dragActiveId, dragFromIndex, dragTargetIdx, onDragStart, onDragUpdate, onDragEnd, onPress, onRemove,
}: DraggableRowProps) {
  const dragY = useSharedValue(0);
  const isDragging = dragActiveId === item.id;

  const pan = Gesture.Pan()
    .enabled(canReorder)
    .onStart(() => {
      runOnJS(onDragStart)(item.id, index);
    })
    .onUpdate((e) => {
      dragY.value = e.translationY;
      runOnJS(onDragUpdate)(e.translationY);
    })
    .onEnd(() => {
      dragY.value = withSpring(0, { damping: 24, stiffness: 260, mass: 0.7 });
      runOnJS(onDragEnd)();
    });

  // Rows between the dragged row's start and its live target preview shift
  // out of the way by one row height — same "live reflow" feel as the
  // website's own touch-drag handler. This is purely a visual preview; the
  // actual array reorder + persistence happens once on release
  // (`handleDragEnd`), not continuously during the gesture.
  const shiftDirection = !isDragging && dragActiveId !== null
    ? (dragTargetIdx > dragFromIndex && index > dragFromIndex && index <= dragTargetIdx
        ? -1
        : dragTargetIdx < dragFromIndex && index >= dragTargetIdx && index < dragFromIndex
          ? 1
          : 0)
    : 0;

  const previewShift = useAnimatedStyle(() => {
    if (isDragging) {
      return { transform: [{ translateY: dragY.value }], zIndex: 10 };
    }
    return {
      transform: [{ translateY: withSpring(shiftDirection * ROW_HEIGHT, { damping: 24, stiffness: 260, mass: 0.7 }) }],
      zIndex: 0,
    };
  }, [isDragging, dragY, shiftDirection]);

  const badge = TYPE_BADGE[item.mediaType] ?? TYPE_BADGE.film;

  return (
    <Animated.View style={[styles.itemRow, isDragging && styles.itemRowDragging, previewShift]}>
      {canReorder && (
        <GestureDetector gesture={pan}>
          <View style={styles.gripHandle} hitSlop={8}>
            <MaterialIcons name="drag-indicator" size={20} color="rgba(255,255,255,0.28)" />
          </View>
        </GestureDetector>
      )}
      {isRanked && <Text style={styles.rank}>{item.rankOrder}</Text>}
      <Pressable style={styles.itemPressable} onPress={onPress}>
        <View style={styles.thumbOuter}>
          {item.posterUrl ? (
            <Image source={{ uri: item.posterUrl }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]} />
          )}
        </View>
        <View style={styles.itemMeta}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.itemMetaRow}>
            {item.year ? <Text style={styles.itemYear}>{item.year}</Text> : null}
            <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.typeBadgeLabel, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>
          {item.notes ? <Text style={styles.itemNotes} numberOfLines={2}>{item.notes}</Text> : null}
        </View>
      </Pressable>
      {canRemove && (
        <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8}>
          <MaterialIcons name="close" size={16} color={RS.colors.textMuted} />
        </Pressable>
      )}
    </Animated.View>
  );
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [list, setList] = useState<ListDetail | null>(null);
  const [items, setItems] = useState<ListDetailItem[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [engagementBusy, setEngagementBusy] = useState<'like' | 'save' | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [addItemsOpen, setAddItemsOpen] = useState(false);

  // Drag-reorder tracking (screen-level so all rows can preview-shift together)
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState(0);
  const [dragTargetIdx, setDragTargetIdx] = useState(0);

  const isOwner = !!user && !!list && user.id === list.ownerId;

  const load = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    try {
      const data = await fetchListDetail(id, user?.id ?? null);
      if (!data) { setStatus('not_found'); return; }
      setList(data);
      setItems(data.items);
      if (user && user.id !== data.ownerId) {
        const engagement = await fetchListEngagementState(id, user.id);
        setIsLiked(engagement.isLiked);
        setIsSaved(engagement.isSaved);
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const openMediaDetail = (item: ListDetailItem) => {
    router.push(`/media/${item.routeId}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=${item.mediaType}`);
  };

  const handleOpenCreator = () => {
    if (!list) return;
    router.push(`/profile/${list.ownerId}`);
  };

  const handleShare = () => {
    if (!list) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const url = reelShelfListShareUrl(list.id);
    Share.share({
      title: list.title,
      message: `${list.title}${list.description ? `\n\n${list.description}` : ''}\n\n${url}`,
      url,
    }).catch(() => {});
  };

  const handleToggleLike = async () => {
    if (!user || !list || isOwner || engagementBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setList((prev) => prev ? { ...prev, likeCount: prev.likeCount + (wasLiked ? -1 : 1) } : prev);
    setEngagementBusy('like');
    try {
      const counts = wasLiked ? await unlikeList(list.id, user.id) : await likeList(list.id, user.id);
      setList((prev) => prev ? { ...prev, likeCount: counts.likeCount, saveCount: counts.saveCount } : prev);
    } catch (err) {
      // Surfaced, not silently swallowed — a prior version of this handler
      // hid failures entirely, which is what made a real error indistinguishable
      // from "nothing happened" during diagnosis.
      console.error('[List Detail] like/unlike failed', err);
      setIsLiked(wasLiked);
      setList((prev) => prev ? { ...prev, likeCount: prev.likeCount + (wasLiked ? 1 : -1) } : prev);
    } finally {
      setEngagementBusy(null);
    }
  };

  const handleToggleSave = async () => {
    if (!user || !list || isOwner || engagementBusy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    setList((prev) => prev ? { ...prev, saveCount: prev.saveCount + (wasSaved ? -1 : 1) } : prev);
    setEngagementBusy('save');
    try {
      const counts = wasSaved ? await unsaveList(list.id, user.id) : await saveList(list.id, user.id);
      setList((prev) => prev ? { ...prev, likeCount: counts.likeCount, saveCount: counts.saveCount } : prev);
    } catch {
      setIsSaved(wasSaved);
      setList((prev) => prev ? { ...prev, saveCount: prev.saveCount + (wasSaved ? 1 : -1) } : prev);
    } finally {
      setEngagementBusy(null);
    }
  };

  const handleSaveEdit = async (fields: ListEditFields) => {
    if (!list) return;
    await updateList(list.id, fields);
    setList((prev) => prev ? { ...prev, ...fields, description: fields.description || null } : prev);
  };

  const handleDelete = () => {
    if (!list) return;
    Alert.alert('Delete list?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteList(list.id);
            router.back();
          } catch {
            Alert.alert('Could not delete this list', 'Please try again.');
          }
        },
      },
    ]);
  };

  const handleRemoveItem = async (item: ListDetailItem) => {
    if (!list) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const previous = items;
    const remaining = items.filter((i) => i.id !== item.id).map((i, idx) => ({ ...i, rankOrder: idx + 1 }));
    setItems(remaining);
    try {
      await removeListItem(list.id, item.id, remaining);
    } catch {
      setItems(previous);
    }
  };

  // ── Drag-reorder ──────────────────────────────────────────────────────────
  const handleDragStart = (itemId: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDragActiveId(itemId);
    setDragFromIndex(index);
    setDragTargetIdx(index);
  };

  const handleDragUpdate = (translationY: number) => {
    setDragTargetIdx((_) => {
      const raw = dragFromIndex + Math.round(translationY / ROW_HEIGHT);
      return Math.max(0, Math.min(items.length - 1, raw));
    });
  };

  const handleDragEnd = async () => {
    const fromIndex = dragFromIndex;
    const toIndex = dragTargetIdx;
    setDragActiveId(null);
    if (fromIndex === toIndex) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const withRanks = reordered.map((it, i) => ({ ...it, rankOrder: i + 1 }));
    const previous = items;
    setItems(withRanks);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await reorderListItems(withRanks);
    } catch {
      setItems(previous);
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <View style={styles.skeletonWrap}>
          <SkeletonBlock width="100%" height={220} radius={RS.card.radius} />
          <SkeletonBlock width={160} height={22} style={{ marginTop: RS.spacing.lg }} />
          <SkeletonBlock width={220} height={14} style={{ marginTop: RS.spacing.sm }} />
          {[0, 1, 2].map((i) => (
            <SkeletonBlock key={getMediaKey('list-skeleton-row', i)} width="100%" height={ROW_HEIGHT} style={{ marginTop: RS.spacing.sm }} radius={RS.card.radius} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'not_found' || status === 'error' || !list) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{status === 'not_found' ? "This list isn't available." : "Couldn't load this list."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const heroPoster = items[0]?.posterUrl ?? null;
  const canReorder = isOwner && list.isRanked;
  const listTypeLabel = list.isRanked ? 'Ranked List' : 'Unranked List';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Hero: blurred backdrop + cover collage ──────────────────────── */}
        <View style={styles.hero}>
          {heroPoster ? (
            <Image source={{ uri: heroPoster }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={40} />
          ) : null}
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
          <View style={styles.heroScrim} />
          <View style={styles.coverWrap}>
            <ListCoverCollage items={items.slice(0, 4).map((i) => ({ url: i.posterUrl, alt: i.title }))} />
          </View>
        </View>

        <View style={styles.body}>
          {/* ── Badges ─────────────────────────────────────────────────────── */}
          <View style={styles.badgeRow}>
            <View style={[styles.metaBadge, list.isRanked && styles.metaBadgeRanked]}>
              <Text style={[styles.metaBadgeLabel, list.isRanked && styles.metaBadgeLabelRanked]}>{listTypeLabel}</Text>
            </View>
            {list.visibility === 'private' && (
              <View style={[styles.metaBadge, styles.metaBadgePrivate]}>
                <Text style={[styles.metaBadgeLabel, styles.metaBadgeLabelPrivate]}>🔒 Private</Text>
              </View>
            )}
            {list.visibility === 'unlisted' && (
              <View style={[styles.metaBadge, styles.metaBadgeUnlisted]}>
                <Text style={[styles.metaBadgeLabel, styles.metaBadgeLabelUnlisted]}>🔗 Unlisted</Text>
              </View>
            )}
          </View>

          <Text style={styles.listTitle}>{list.title}</Text>

          {/* ── Creator row ──────────────────────────────────────────────── */}
          <Pressable style={styles.creatorRow} onPress={handleOpenCreator}>
            {list.ownerAvatarUrl ? (
              <Image source={{ uri: list.ownerAvatarUrl }} style={styles.creatorAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.creatorAvatar, styles.creatorAvatarFallback]}>
                <Text style={styles.creatorInitial}>{(list.ownerName || '?')[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View>
              <Text style={styles.curatedByLabel}>Curated by</Text>
              <Text style={styles.creatorName}>{list.ownerName || 'ReelShelf Member'}</Text>
            </View>
          </Pressable>

          {/* ── Description ──────────────────────────────────────────────── */}
          {list.description ? (
            <View>
              <Text style={styles.description} numberOfLines={descExpanded ? undefined : 3}>{list.description}</Text>
              {list.description.length > 120 && (
                <Pressable onPress={() => setDescExpanded((v) => !v)}>
                  <Text style={styles.readMore}>{descExpanded ? 'Show less' : 'Read more'}</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* ── Action bar: Like / Save / Share ──────────────────────────── */}
          <View style={styles.actionBar}>
            {isOwner ? (
              <View style={styles.ownerCounts}>
                <Text style={styles.ownerCountText}>♡ {list.likeCount}</Text>
                <Text style={styles.ownerCountText}>🔖 {list.saveCount}</Text>
                <Text style={styles.ownerCountHint}>· your list</Text>
              </View>
            ) : (
              <>
                <Pressable style={[styles.engageBtn, isLiked && styles.engageBtnLiked]} onPress={handleToggleLike} disabled={engagementBusy === 'like'}>
                  <Text style={[styles.engageLabel, isLiked && styles.engageLabelLiked]}>
                    {isLiked ? '♥' : '♡'} {isLiked ? 'Liked' : 'Like'}{list.likeCount > 0 ? ` · ${list.likeCount}` : ''}
                  </Text>
                </Pressable>
                <Pressable style={[styles.engageBtn, isSaved && styles.engageBtnSaved]} onPress={handleToggleSave} disabled={engagementBusy === 'save'}>
                  <Text style={[styles.engageLabel, isSaved && styles.engageLabelSaved]}>
                    🔖 {isSaved ? 'Saved' : 'Save'}{list.saveCount > 0 ? ` · ${list.saveCount}` : ''}
                  </Text>
                </Pressable>
              </>
            )}
            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <MaterialIcons name="ios-share" size={14} color={RS.colors.textSecondary} />
              <Text style={styles.shareLabel}>Share</Text>
            </Pressable>
          </View>

          {/* ── Owner controls ───────────────────────────────────────────── */}
          {isOwner && (
            <View style={styles.ownerControls}>
              <Pressable style={styles.ownerBtn} onPress={() => setEditorOpen(true)}>
                <Text style={styles.ownerBtnLabel}>Edit settings</Text>
              </Pressable>
              <Pressable style={[styles.ownerBtn, styles.ownerBtnPrimary]} onPress={() => setAddItemsOpen(true)}>
                <Text style={styles.ownerBtnPrimaryLabel}>+ Add media</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteLabel}>Delete</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.divider} />

          {/* ── Items ─────────────────────────────────────────────────────── */}
          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>This list is empty.</Text>
              <Text style={styles.emptySubtitle}>Add your favourite films, series, or books to build this list.</Text>
              {isOwner && (
                <Pressable style={styles.emptyCta} onPress={() => setAddItemsOpen(true)}>
                  <Text style={styles.emptyCtaLabel}>Add your first item</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {isOwner && list.isRanked && (
                <Text style={styles.reorderHint}>Hold the grip to drag and reorder</Text>
              )}
              <View>
                {items.map((item, index) => (
                  <DraggableRow
                    key={getMediaKey('list-item', item.id)}
                    item={item}
                    index={index}
                    total={items.length}
                    isRanked={list.isRanked}
                    canReorder={canReorder}
                    canRemove={isOwner}
                    dragActiveId={dragActiveId}
                    dragFromIndex={dragFromIndex}
                    dragTargetIdx={dragTargetIdx}
                    onDragStart={handleDragStart}
                    onDragUpdate={handleDragUpdate}
                    onDragEnd={handleDragEnd}
                    onPress={() => openMediaDetail(item)}
                    onRemove={() => handleRemoveItem(item)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {isOwner && (
        <>
          <ListEditorModal
            visible={editorOpen}
            onClose={() => setEditorOpen(false)}
            initial={{ title: list.title, description: list.description ?? '', visibility: list.visibility, isRanked: list.isRanked }}
            onSave={handleSaveEdit}
          />
          <AddListItemsModal
            visible={addItemsOpen}
            onClose={() => setAddItemsOpen(false)}
            listId={list.id}
            existingMediaIds={items.map((i) => i.mediaId)}
            onAdded={load}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  backRow: { position: 'absolute', top: RS.spacing.sm, left: RS.spacing.md, zIndex: 10, paddingHorizontal: RS.spacing.xs, paddingVertical: RS.spacing.xs },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  skeletonWrap: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.xxl },
  scrollContent: { paddingBottom: RS.spacing.xxxl },
  hero: { height: 260, position: 'relative', alignItems: 'center', justifyContent: 'center', backgroundColor: RS.colors.base, overflow: 'hidden' },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,7,11,0.35)' },
  coverWrap: { width: 168, height: 168, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 40, elevation: 10 },
  body: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.lg, gap: RS.spacing.sm },
  badgeRow: { flexDirection: 'row', gap: RS.spacing.xs, flexWrap: 'wrap' },
  metaBadge: { borderRadius: 5, borderWidth: 0.5, borderColor: RS.colors.border, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: RS.colors.elevated },
  metaBadgeLabel: { fontSize: 9, fontWeight: '700', letterSpacing: RS.letterSpacing.wide, textTransform: 'uppercase', color: RS.colors.textMuted },
  metaBadgeRanked: { borderColor: 'rgba(251,191,36,0.3)' },
  metaBadgeLabelRanked: { color: 'rgba(251,191,36,0.88)' },
  metaBadgePrivate: { borderColor: 'rgba(248,113,113,0.25)' },
  metaBadgeLabelPrivate: { color: 'rgba(248,113,113,0.9)' },
  metaBadgeUnlisted: { borderColor: 'rgba(147,197,253,0.2)' },
  metaBadgeLabelUnlisted: { color: 'rgba(147,197,253,0.85)' },
  listTitle: { fontSize: RS.typography.display - 8, fontWeight: '800', color: RS.colors.textPrimary, letterSpacing: RS.letterSpacing.tight },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, marginTop: RS.spacing.xs },
  creatorAvatar: { width: 32, height: 32, borderRadius: 16 },
  creatorAvatarFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  creatorInitial: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textMuted },
  curatedByLabel: { fontSize: 9, fontWeight: '700', letterSpacing: RS.letterSpacing.wide, textTransform: 'uppercase', color: RS.colors.textMuted },
  creatorName: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary, marginTop: 1 },
  description: { fontSize: RS.typography.body, color: RS.colors.textSecondary, lineHeight: 21, marginTop: RS.spacing.xs },
  readMore: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textMuted, marginTop: 4 },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, flexWrap: 'wrap', marginTop: RS.spacing.sm },
  ownerCounts: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm },
  ownerCountText: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  ownerCountHint: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  engageBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: 14, paddingVertical: 7 },
  engageBtnLiked: { borderColor: 'rgba(248,113,113,0.4)', backgroundColor: 'rgba(248,113,113,0.08)' },
  engageBtnSaved: { borderColor: 'rgba(96,165,250,0.4)', backgroundColor: 'rgba(96,165,250,0.08)' },
  engageLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary },
  engageLabelLiked: { color: 'rgba(248,113,113,0.9)' },
  engageLabelSaved: { color: 'rgba(96,165,250,0.9)' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: 14, paddingVertical: 7 },
  shareLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  ownerControls: { flexDirection: 'row', gap: RS.spacing.xs, flexWrap: 'wrap', marginTop: RS.spacing.sm },
  ownerBtn: { borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: 14, paddingVertical: 8 },
  ownerBtnLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  ownerBtnPrimary: { backgroundColor: RS.button.filledBg, borderWidth: 0 },
  ownerBtnPrimaryLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.button.filledText },
  deleteBtn: { marginLeft: 'auto', borderRadius: RS.button.radius, paddingHorizontal: 14, paddingVertical: 8 },
  deleteLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textMuted },
  divider: { height: 0.5, backgroundColor: RS.colors.border, marginVertical: RS.spacing.md },
  reorderHint: { fontSize: RS.typography.overline, color: RS.colors.textMuted, marginBottom: RS.spacing.xs },
  emptyWrap: { alignItems: 'center', paddingVertical: RS.spacing.xxl, gap: RS.spacing.sm },
  emptyTitle: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textSecondary },
  emptySubtitle: { fontSize: RS.typography.caption, color: RS.colors.textMuted, textAlign: 'center', maxWidth: 260 },
  emptyCta: { marginTop: RS.spacing.sm, borderRadius: RS.button.radius, backgroundColor: RS.button.filledBg, paddingHorizontal: RS.button.paddingH, paddingVertical: RS.button.paddingV },
  emptyCtaLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.button.filledText },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, height: ROW_HEIGHT, backgroundColor: RS.colors.base },
  itemRowDragging: { backgroundColor: RS.colors.elevated, borderRadius: RS.card.radius, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  gripHandle: { width: 32, alignItems: 'center', justifyContent: 'center', height: '100%' },
  rank: { width: 20, fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textMuted, textAlign: 'center' },
  itemPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm },
  thumbOuter: { borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 48, height: 72 },
  thumbFallback: { backgroundColor: RS.colors.card },
  itemMeta: { flex: 1, gap: 2 },
  itemTitle: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemYear: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  typeBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  typeBadgeLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.4 },
  itemNotes: { fontSize: RS.typography.overline, color: RS.colors.textMuted, fontStyle: 'italic' },
  removeBtn: { width: 32, alignItems: 'center', justifyContent: 'center', height: '100%' },
});
