// Shelf browsing for iPhone: swipe sideways along a shelf, scroll down between shelves,
// tap a spine to lift its cover forward with a compact preview below the shelf.
// Rearranging only happens inside an explicit Arrange mode.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { posterAt, type Shelf, type ShelfItem, type Visibility } from '@/lib/supabase/shelves';

/* ───────── geometry ───────── */

const PAD_X = 16;
const GAP = 4;
const HEADROOM = 22;
const SPINE_H = 186;
const COVER_W = 128;
const COVER_H = 192;
const TRACK_H = HEADROOM + SPINE_H + 12;
const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const spineWidth = (key: string) => 38 + (hash(key) % 3) * 6;
const spineHeight = (key: string) => Math.round(SPINE_H * (0.9 + ((hash(key) >> 3) % 11) / 100));
function layout(items: ShelfItem[]) {
  const lefts: number[] = [];
  const widths: number[] = [];
  let x = PAD_X;
  for (const it of items) {
    const w = spineWidth(it.key);
    lefts.push(x);
    widths.push(w);
    x += w + GAP;
  }
  return { lefts, widths, width: x - GAP + PAD_X };
}
const fallbackColor = (seed: string) => `hsl(${hash(seed) % 360}, 26%, 22%)`;

const MEDIA_LABEL: Record<string, string> = { movie: 'FILM', tv: 'SERIES', book: 'BOOK', short_film: 'SHORT' };
const VIS_LABEL: Record<Visibility, string> = { public: 'Public', unlisted: 'Unlisted', private: 'Private' };

function openTitle(item: ShelfItem) {
  router.push(
    `/media/${item.routeId}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.poster ?? '')}&mediaType=${item.mediaType}`
  );
}

/* ───────── spine ───────── */

type SpineProps = {
  item: ShelfItem;
  index: number;
  total: number;
  left: number;
  width: number;
  selected: boolean;
  editing: boolean;
  onPress: (index: number) => void;
  onMove: (index: number, delta: number) => void;
};

const Spine = memo(function Spine({ item, index, total, left, width, selected, editing, onPress, onMove }: SpineProps) {
  const h = spineHeight(item.key);
  const fs = item.title.length <= 18 ? 12 : item.title.length <= 32 ? 11 : 10;
  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={[styles.spine, { left, width, height: h, top: HEADROOM + SPINE_H - h, opacity: selected ? 0 : 1 }]}
    >
      <Pressable
        onPress={() => onPress(index)}
        style={StyleSheet.absoluteFill}
        accessibilityRole={editing ? 'adjustable' : 'button'}
        accessibilityLabel={`${item.title}${item.year ? `, ${item.year}` : ''}`}
        accessibilityHint={editing ? 'Swipe up or down to move' : 'Shows a preview'}
        accessibilityValue={{ text: `${index + 1} of ${total}` }}
        accessibilityState={{ selected }}
        accessibilityActions={editing ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') onMove(index, 1);
          if (e.nativeEvent.actionName === 'decrement') onMove(index, -1);
        }}
      >
        {item.poster ? (
          <Image
            source={posterAt(item.poster, 'w154')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ top: '30%', left: '50%' }}
            cachePolicy="memory-disk"
            recyclingKey={item.key}
            transition={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor(item.title) }]} />
        )}
        <View style={styles.spineShade} />
        {/* Rotated title: a box as tall as the spine, turned on its side. */}
        <View
          style={[
            styles.spineTitleBox,
            { width: h - 34, height: width, left: (width - (h - 34)) / 2, top: (h - 34 - width) / 2 + 8 },
          ]}
        >
          <Text style={[styles.spineTitle, { fontSize: fs }]} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
        </View>
        <Text style={[styles.spineFoot, item.rank != null && { color: RS.colors.gold }]}>
          {item.rank != null ? item.rank : item.year ? item.year.slice(-2) : ''}
        </Text>
        {editing ? <View style={styles.spineEditing} /> : null}
      </Pressable>
    </Animated.View>
  );
});

/* ───────── lifted cover ───────── */

function LiftedCover({ item, left, reduced, onPress }: { item: ShelfItem; left: number; reduced: boolean; onPress: () => void }) {
  const x = useSharedValue(left);
  const lift = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    lift.value = reduced ? 1 : withTiming(1, { duration: 200, easing: EASE });
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    x.value = reduced ? left : withTiming(left, { duration: 220, easing: EASE });
  }, [left, reduced, x]);
  const style = useAnimatedStyle(() => ({
    left: x.value,
    opacity: 0.4 + lift.value * 0.6,
    transform: [{ translateY: -12 * lift.value }, { scale: 0.94 + 0.06 * lift.value }],
  }));
  return (
    <Animated.View style={[styles.cover, style]} pointerEvents="box-none">
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill} accessible={false}>
        {item.poster ? (
          <Image
            source={posterAt(item.poster, 'w342')}
            placeholder={posterAt(item.poster, 'w154')}
            placeholderContentFit="cover"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={reduced ? 0 : 140}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.coverFallback, { backgroundColor: fallbackColor(item.title) }]}>
            <Text style={styles.coverFallbackText}>{item.title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ───────── preview ───────── */

type PreviewProps = {
  shelf: Shelf;
  index: number;
  editing: boolean;
  canEdit: boolean;
  reduced: boolean;
  onIndex: (i: number) => void;
  onClose: () => void;
  onMove: (delta: number) => void;
};

function Preview({ shelf, index, editing, canEdit, reduced, onIndex, onClose, onMove }: PreviewProps) {
  const listRef = useRef<FlatList<ShelfItem>>(null);
  const [w, setW] = useState(0);
  const shown = useRef(index);

  // Follow selection changes made on the shelf.
  useEffect(() => {
    if (!w || shown.current === index) return;
    const near = Math.abs(shown.current - index) === 1;
    shown.current = index;
    listRef.current?.scrollToIndex({ index, animated: near && !reduced });
  }, [index, w, reduced]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!w) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i !== shown.current && i >= 0 && i < shelf.items.length) {
      shown.current = i;
      onIndex(i);
    }
  };

  const item = shelf.items[index];
  return (
    <View style={styles.preview} accessibilityViewIsModal={false}>
      <View style={styles.pvTop}>
        <Text style={styles.pvCount}>
          {index + 1} / {shelf.items.length}
        </Text>
        <View style={styles.pvNav}>
          <IconButton label="Previous title" glyph="‹" disabled={index === 0} onPress={() => onIndex(index - 1)} />
          <IconButton label="Next title" glyph="›" disabled={index === shelf.items.length - 1} onPress={() => onIndex(index + 1)} />
          <IconButton label="Close preview" glyph="×" onPress={onClose} />
        </View>
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))}>
        {w ? (
          <FlatList
            ref={listRef}
            data={shelf.items}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(it) => it.key}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: w, offset: w * i, index: i })}
            initialNumToRender={3}
            windowSize={3}
            onMomentumScrollEnd={onEnd}
            renderItem={({ item: it }) => (
              <View style={[styles.pvCard, { width: w }]}>
                <View style={styles.pvMeta}>
                  {it.rank != null ? <Text style={[styles.pvMetaText, { color: RS.colors.gold }]}>#{it.rank}</Text> : null}
                  <Text style={styles.pvMetaText}>{MEDIA_LABEL[it.mediaType] ?? 'TITLE'}</Text>
                  {it.year ? <Text style={styles.pvMetaText}>{it.year}</Text> : null}
                </View>
                <Text style={styles.pvTitle} numberOfLines={3}>
                  {it.title}
                </Text>
                {it.creator ? <Text style={styles.pvCreator} numberOfLines={1}>{it.creator}</Text> : null}
                {it.note ? <Text style={styles.pvNote} numberOfLines={2}>“{it.note}”</Text> : null}
              </View>
            )}
          />
        ) : (
          <View style={{ height: 96 }} />
        )}
      </View>
      <View style={styles.pvActions}>
        <Pressable
          onPress={() => item && openTitle(item)}
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item?.title ?? 'title'}`}
        >
          <Text style={styles.openLabel}>Open title</Text>
        </Pressable>
        {canEdit && editing ? (
          <View style={styles.moveRow}>
            <Chip label="← Move" disabled={index === 0} onPress={() => onMove(-1)} a11y="Move left" />
            <Chip label="Move →" disabled={index === shelf.items.length - 1} onPress={() => onMove(1)} a11y="Move right" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function IconButton({ label, glyph, disabled, onPress }: { label: string; glyph: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.08)' }, disabled && { opacity: 0.25 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

function Chip({ label, onPress, disabled, on, a11y }: { label: string; onPress: () => void; disabled?: boolean; on?: boolean; a11y?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, on && styles.chipOn, disabled && { opacity: 0.35 }]}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !!disabled, selected: !!on }}
    >
      <Text style={[styles.chipLabel, on && { color: '#141210' }]}>{label}</Text>
    </Pressable>
  );
}

/* ───────── shelf row ───────── */

type RowProps = {
  shelf: Shelf;
  selectedIndex: number | null;
  editing: boolean;
  canEdit: boolean;
  reduced: boolean;
  registerTrack: (id: string, ref: ScrollView | null) => void;
  onSelect: (shelfId: string, index: number) => void;
  onMove: (shelfId: string, index: number, delta: number) => void;
  onToggleEdit: (id: string) => void;
  onVisibility: (shelf: Shelf) => void;
  onLayoutY: (id: string, y: number) => void;
  onTrackScroll: (id: string, x: number) => void;
  preview: React.ReactNode;
};

const ShelfRow = memo(function ShelfRow(p: RowProps) {
  const { shelf } = p;
  const geo = useMemo(() => layout(shelf.items), [shelf.items]);
  const sel = p.selectedIndex;
  const selItem = sel != null ? shelf.items[sel] : null;
  let coverLeft = 0;
  if (sel != null && geo.lefts[sel] != null) {
    const centre = geo.lefts[sel] + geo.widths[sel] / 2;
    coverLeft = Math.min(Math.max(centre - COVER_W / 2, 6), geo.width - COVER_W - 6);
  }
  const onPress = useCallback((i: number) => p.onSelect(shelf.id, i), [p, shelf.id]);
  const onMove = useCallback((i: number, d: number) => p.onMove(shelf.id, i, d), [p, shelf.id]);

  return (
    <View
      style={[styles.shelf, sel != null && { zIndex: 10 }]}
      onLayout={(e) => p.onLayoutY(shelf.id, e.nativeEvent.layout.y)}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle} numberOfLines={1} accessibilityRole="header">
            {shelf.title}
          </Text>
          <Text style={styles.headSub}>
            {shelf.items.length} {shelf.items.length === 1 ? 'title' : 'titles'}
            {shelf.ranked ? ' · Ranked' : ''}
            {p.canEdit ? ` · ${VIS_LABEL[shelf.visibility]}` : ''}
          </Text>
        </View>
        {p.canEdit ? (
          <View style={styles.headActions}>
            <Chip label={VIS_LABEL[shelf.visibility]} onPress={() => p.onVisibility(shelf)} a11y={`Who can see ${shelf.title}: ${VIS_LABEL[shelf.visibility]}`} />
            {shelf.items.length > 1 ? (
              <Chip label={p.editing ? 'Done' : 'Arrange'} on={p.editing} onPress={() => p.onToggleEdit(shelf.id)} />
            ) : null}
          </View>
        ) : null}
      </View>
      {shelf.items.length === 0 ? (
        <Text style={styles.empty}>Nothing here yet.</Text>
      ) : (
        <ScrollView
          ref={(r) => p.registerTrack(shelf.id, r)}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="normal"
          scrollEventThrottle={64}
          onScroll={(e) => p.onTrackScroll(shelf.id, e.nativeEvent.contentOffset.x)}
          contentContainerStyle={{ width: geo.width, height: TRACK_H }}
          accessibilityRole="list"
          accessibilityLabel={shelf.title}
        >
          {shelf.items.map((it, i) => (
            <Spine
              key={it.key}
              item={it}
              index={i}
              total={shelf.items.length}
              left={geo.lefts[i]}
              width={geo.widths[i]}
              selected={sel === i}
              editing={p.editing}
              onPress={onPress}
              onMove={onMove}
            />
          ))}
          {selItem ? <LiftedCover key={shelf.id} item={selItem} left={coverLeft} reduced={p.reduced} onPress={() => openTitle(selItem)} /> : null}
          <View style={[styles.plank, { width: geo.width }]} />
        </ScrollView>
      )}
      {p.preview}
    </View>
  );
});

/* ───────── browser ───────── */

type Selection = { shelfId: string; key: string } | null;

export type ShelfBrowserProps = {
  shelves: Shelf[];
  canEdit: boolean;
  header?: React.ReactNode;
  bottomInset?: number;
  onReorder?: (shelf: Shelf, items: ShelfItem[]) => void;
  onVisibility?: (shelf: Shelf, v: Visibility) => void;
};

export function ShelfBrowser({ shelves, canEdit, header, bottomInset = 0, onReorder, onVisibility }: ShelfBrowserProps) {
  const reduced = useReducedMotion();
  const [selection, setSelection] = useState<Selection>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<'shelf' | 'grid' | 'list'>('shelf');
  const tracks = useRef(new Map<string, ScrollView>());
  const trackX = useRef(new Map<string, number>());
  const rowY = useRef(new Map<string, number>());
  const outer = useRef<ScrollView>(null);
  const outerY = useRef(0);
  const viewportH = useRef(0);

  const selShelf = selection ? shelves.find((s) => s.id === selection.shelfId) ?? null : null;
  const selIndex = selShelf && selection ? selShelf.items.findIndex((i) => i.key === selection.key) : -1;

  const registerTrack = useCallback((id: string, ref: ScrollView | null) => {
    if (ref) tracks.current.set(id, ref);
    else tracks.current.delete(id);
  }, []);
  const onLayoutY = useCallback((id: string, y: number) => rowY.current.set(id, y), []);
  const onTrackScroll = useCallback((id: string, x: number) => trackX.current.set(id, x), []);
  const { width: screenW } = useWindowDimensions();

  const reveal = useCallback(
    (shelf: Shelf, index: number) => {
      const track = tracks.current.get(shelf.id);
      if (!track) return;
      const geo = layout(shelf.items);
      const centre = geo.lefts[index] + geo.widths[index] / 2;
      // Centre the lifted cover when it would sit under an edge; otherwise leave the shelf still.
      const x = trackX.current.get(shelf.id) ?? 0;
      const half = COVER_W / 2 + 20;
      const vw = screenW;
      if (centre - half < x || centre + half > x + vw) {
        track.scrollTo({ x: Math.max(0, centre - vw / 2), animated: !reduced });
      }
      // Bring the preview into view without a big jump.
      const y = rowY.current.get(shelf.id);
      if (y != null && viewportH.current) {
        const bottom = y + 46 + TRACK_H + 196;
        const top = y;
        if (bottom > outerY.current + viewportH.current - bottomInset) {
          outer.current?.scrollTo({ y: bottom - viewportH.current + bottomInset + 8, animated: !reduced });
        } else if (top < outerY.current) {
          outer.current?.scrollTo({ y: top, animated: !reduced });
        }
      }
    },
    [reduced, bottomInset, screenW]
  );

  const select = useCallback(
    (shelfId: string, index: number) => {
      const shelf = shelves.find((s) => s.id === shelfId);
      const item = shelf?.items[index];
      if (!shelf || !item) return;
      setSelection((cur) => {
        if (cur?.shelfId === shelfId && cur.key === item.key) return cur;
        Haptics.selectionAsync().catch(() => {});
        return { shelfId, key: item.key };
      });
      AccessibilityInfo.announceForAccessibility(`${item.title}. ${index + 1} of ${shelf.items.length}.`);
      // Warm the neighbouring covers so swiping never shows a blank.
      Image.prefetch(
        shelf.items.slice(Math.max(0, index - 2), index + 3).map((i) => posterAt(i.poster, 'w342')).filter(Boolean) as string[]
      ).catch(() => {});
      requestAnimationFrame(() => reveal(shelf, index));
    },
    [shelves, reveal]
  );

  const clear = useCallback(() => setSelection(null), []);

  const move = useCallback(
    (shelfId: string, index: number, delta: number) => {
      const shelf = shelves.find((s) => s.id === shelfId);
      if (!shelf || !onReorder) return;
      const to = index + delta;
      if (to < 0 || to >= shelf.items.length) return;
      const next = [...shelf.items];
      const [it] = next.splice(index, 1);
      next.splice(to, 0, it);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onReorder(shelf, next);
      AccessibilityInfo.announceForAccessibility(`Moved ${it.title} to position ${to + 1}.`);
    },
    [shelves, onReorder]
  );

  const chooseVisibility = useCallback(
    (shelf: Shelf) => {
      const options: Visibility[] = ['public', 'unlisted', 'private'];
      const apply = (v: Visibility) => v !== shelf.visibility && onVisibility?.(shelf, v);
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: `Who can see “${shelf.title}”?`,
            message: 'Unlisted shelves open by direct link but are left off your profile.',
            options: [...options.map((o) => VIS_LABEL[o]), 'Cancel'],
            cancelButtonIndex: 3,
          },
          (i) => i < 3 && apply(options[i])
        );
      } else {
        Alert.alert(`Who can see “${shelf.title}”?`, undefined, [
          ...options.map((o) => ({ text: VIS_LABEL[o], onPress: () => apply(o) })),
          { text: 'Cancel', style: 'cancel' as const },
        ]);
      }
    },
    [onVisibility]
  );

  const preview =
    selShelf && selIndex >= 0 ? (
      <Preview
        key={selShelf.id}
        shelf={selShelf}
        index={selIndex}
        editing={editingId === selShelf.id}
        canEdit={canEdit}
        reduced={reduced}
        onIndex={(i) => select(selShelf.id, i)}
        onClose={clear}
        onMove={(d) => move(selShelf.id, selIndex, d)}
      />
    ) : null;

  return (
    <ScrollView
      ref={outer}
      onLayout={(e) => (viewportH.current = e.nativeEvent.layout.height)}
      onScroll={(e) => (outerY.current = e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={32}
      contentContainerStyle={{ paddingBottom: bottomInset + 220 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Tapping anywhere that isn't a title or a control closes the preview. */}
      <Pressable onPress={clear} accessible={false} style={{ flex: 1 }}>
        {header}
        <View style={styles.segment} accessibilityRole="tablist">
          {(['shelf', 'grid', 'list'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => {
                setView(v);
                setSelection(null);
              }}
              style={[styles.segBtn, view === v && styles.segOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: view === v }}
            >
              <Text style={[styles.segLabel, view === v && { color: '#fff' }]}>{v === 'shelf' ? 'Shelf' : v === 'grid' ? 'Grid' : 'List'}</Text>
            </Pressable>
          ))}
        </View>
        {view === 'shelf'
          ? shelves.map((shelf) => (
              <ShelfRow
                key={shelf.id}
                shelf={shelf}
                selectedIndex={selShelf?.id === shelf.id && selIndex >= 0 ? selIndex : null}
                editing={editingId === shelf.id}
                canEdit={canEdit}
                reduced={reduced}
                registerTrack={registerTrack}
                onTrackScroll={onTrackScroll}
                onSelect={select}
                onMove={move}
                onToggleEdit={(id) => setEditingId((cur) => (cur === id ? null : id))}
                onVisibility={chooseVisibility}
                onLayoutY={onLayoutY}
                preview={selShelf?.id === shelf.id ? preview : null}
              />
            ))
          : shelves.map((shelf) => <FlatShelf key={shelf.id} shelf={shelf} view={view} />)}
      </Pressable>
    </ScrollView>
  );
}

/* ───────── grid & list ───────── */

function FlatShelf({ shelf, view }: { shelf: Shelf; view: 'grid' | 'list' }) {
  return (
    <View style={styles.flatShelf}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle} accessibilityRole="header">{shelf.title}</Text>
          <Text style={styles.headSub}>
            {shelf.items.length} {shelf.items.length === 1 ? 'title' : 'titles'}
          </Text>
        </View>
      </View>
      {view === 'grid' ? (
        <View style={styles.grid}>
          {shelf.items.map((it) => (
            <Pressable key={it.key} style={styles.gridCell} onPress={() => openTitle(it)} accessibilityRole="button" accessibilityLabel={it.title}>
              <View style={styles.gridArt}>
                {it.poster ? (
                  <Image source={posterAt(it.poster, 'w342')} placeholder={posterAt(it.poster, 'w154')} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor(it.title) }]} />
                )}
              </View>
              <Text style={styles.gridTitle} numberOfLines={2}>
                {it.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        shelf.items.map((it, i) => (
          <Pressable key={it.key} style={styles.listRow} onPress={() => openTitle(it)} accessibilityRole="button" accessibilityLabel={it.title}>
            <Text style={styles.listN}>{it.rank ?? i + 1}</Text>
            <View style={styles.listArt}>
              {it.poster ? <Image source={posterAt(it.poster, 'w154')} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle} numberOfLines={2}>{it.title}</Text>
              <Text style={styles.listSub} numberOfLines={1}>
                {[MEDIA_LABEL[it.mediaType], it.year, it.creator].filter(Boolean).join(' · ')}
              </Text>
              {it.note ? <Text style={styles.listNote} numberOfLines={2}>“{it.note}”</Text> : null}
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 14, padding: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  segBtn: { minHeight: 34, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' },
  segOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  segLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

  shelf: { marginBottom: 22 },
  head: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, gap: 10 },
  headTitle: { fontSize: 17, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: -0.2 },
  headSub: { fontSize: 12.5, color: RS.colors.textSecondary, marginTop: 2 },
  headActions: { flexDirection: 'row', gap: 6 },
  empty: { marginHorizontal: 16, marginTop: 10, fontSize: 13, color: RS.colors.textMuted },

  spine: { position: 'absolute', borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden', backgroundColor: '#26211d' },
  spineShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  spineTitleBox: { position: 'absolute', justifyContent: 'center', transform: [{ rotate: '-90deg' }] },
  spineTitle: { color: '#fff', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  spineFoot: { position: 'absolute', bottom: 7, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  spineEditing: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(232,195,122,0.5)', borderRadius: 3 },
  plank: { position: 'absolute', left: 0, top: HEADROOM + SPINE_H, height: 9, borderRadius: 2, backgroundColor: '#2d261f' },

  cover: {
    position: 'absolute', top: HEADROOM + SPINE_H - COVER_H, width: COVER_W, height: COVER_H, borderRadius: 5, backgroundColor: '#1b1815',
    shadowColor: '#000', shadowOpacity: 0.65, shadowRadius: 14, shadowOffset: { width: 0, height: 12 }, zIndex: 5,
  },
  coverFallback: { justifyContent: 'flex-end', padding: 10, borderRadius: 5 },
  coverFallbackText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  preview: {
    position: 'absolute', left: 12, right: 12, top: 46 + TRACK_H - 6, zIndex: 20,
    backgroundColor: '#1c1916', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
  },
  pvTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pvCount: { fontSize: 12, color: RS.colors.textMuted, fontVariant: ['tabular-nums'] },
  pvNav: { flexDirection: 'row' },
  iconBtn: { width: 44, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconGlyph: { fontSize: 24, color: 'rgba(255,255,255,0.8)', lineHeight: 26 },
  pvCard: { minHeight: 92, paddingRight: 8 },
  pvMeta: { flexDirection: 'row', gap: 8 },
  pvMetaText: { fontSize: 11, letterSpacing: 0.6, color: RS.colors.textSecondary, fontWeight: '600' },
  pvTitle: { marginTop: 5, fontSize: 18, lineHeight: 23, fontWeight: '700', color: '#fff' },
  pvCreator: { marginTop: 3, fontSize: 13, color: RS.colors.textSecondary },
  pvNote: { marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' },
  pvActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  openBtn: { minHeight: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: '#f4f1ea', justifyContent: 'center' },
  openLabel: { color: '#141210', fontWeight: '700', fontSize: 15 },
  moveRow: { flexDirection: 'row', gap: 6 },

  chip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center' },
  chipOn: { backgroundColor: '#e8c37a', borderColor: '#e8c37a' },
  chipLabel: { fontSize: 12.5, fontWeight: '600', color: '#fff' },

  flatShelf: { marginBottom: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 10 },
  gridCell: { width: '33.333%', padding: 4, marginBottom: 6 },
  gridArt: { aspectRatio: 2 / 3, borderRadius: 5, overflow: 'hidden', backgroundColor: '#1b1815' },
  gridTitle: { marginTop: 5, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: RS.colors.border },
  listN: { width: 22, textAlign: 'right', fontSize: 12, color: RS.colors.textMuted },
  listArt: { width: 40, height: 60, borderRadius: 3, overflow: 'hidden', backgroundColor: '#1b1815' },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  listSub: { fontSize: 12, color: RS.colors.textSecondary, marginTop: 2 },
  listNote: { fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontStyle: 'italic' },
});
