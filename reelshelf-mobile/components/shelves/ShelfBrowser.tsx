// Shelf browsing for iPhone: swipe sideways along a shelf, scroll down between shelves,
// tap a spine to pull the title out and turn it to its front cover (CoverStage).
// Pinch a shelf to fit more or fewer spines. Rearranging only happens in Arrange mode.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { posterAt, type Shelf, type ShelfItem, type Visibility } from '@/lib/supabase/shelves';
import { CoverStage, type Rect } from './CoverStage';

/* ───────── geometry ───────── */

const PAD_X = 16;
const GAP = 4;
const HEADROOM = 22;
const SPINE_H = 186;
const TRACK_H = HEADROOM + SPINE_H + 12;
const EDGE = 48; // drag near a shelf edge to scroll it
const VIRTUAL_FROM = 60; // render only nearby spines on shelves longer than this

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const spineWidth = (key: string) => 38 + (hash(key) % 3) * 6;
const spineHeight = (key: string) => Math.round(SPINE_H * (0.9 + ((hash(key) >> 3) % 11) / 100));
type Geo = { lefts: number[]; widths: number[]; width: number };
function layout(items: ShelfItem[], density: number): Geo {
  const lefts: number[] = [];
  const widths: number[] = [];
  const gap = Math.max(2, Math.round(GAP * density));
  let x = PAD_X;
  for (const it of items) {
    const w = Math.round(spineWidth(it.key) * density);
    lefts.push(x);
    widths.push(w);
    x += w + gap;
  }
  return { lefts, widths, width: x - gap + PAD_X };
}
/** First index whose spine ends after x. */
function firstAfter(geo: Geo, x: number) {
  let lo = 0;
  let hi = geo.lefts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (geo.lefts[mid] + geo.widths[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
const fallbackColor = (seed: string) => `hsl(${hash(seed) % 360}, 26%, 22%)`;

const VIS_LABEL: Record<Visibility, string> = { public: 'Public', unlisted: 'Unlisted', private: 'Private' };
const MEDIA_LABEL: Record<string, string> = { movie: 'FILM', tv: 'SERIES', book: 'BOOK', short_film: 'SHORT' };

function openTitle(item: ShelfItem) {
  router.push(
    `/media/${item.routeId}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.poster ?? '')}&mediaType=${item.mediaType}`
  );
}

/* ───────── spine density (pinch or the −/+ buttons), remembered on this device ───────── */

const DENSITIES = [0.7, 0.85, 1, 1.2];
const DENSITY_KEY = 'reelshelf.shelves.density';
let densityIndex = 2;
let densityLoaded = false;
const densityListeners = new Set<(i: number) => void>();
function setDensityIndex(i: number) {
  const next = Math.max(0, Math.min(DENSITIES.length - 1, i));
  if (next === densityIndex) return;
  densityIndex = next;
  densityListeners.forEach((l) => l(next));
  AsyncStorage.setItem(DENSITY_KEY, String(next)).catch(() => {});
}
function useDensity(): [number, (i: number) => void] {
  const [i, setI] = useState(densityIndex);
  useEffect(() => {
    densityListeners.add(setI);
    if (!densityLoaded) {
      densityLoaded = true;
      AsyncStorage.getItem(DENSITY_KEY)
        .then((v) => {
          const n = v == null ? NaN : Number(v);
          if (Number.isInteger(n) && n >= 0 && n < DENSITIES.length && n !== densityIndex) {
            densityIndex = n;
            densityListeners.forEach((l) => l(n));
          }
        })
        .catch(() => {});
    }
    return () => {
      densityListeners.delete(setI);
    };
  }, []);
  return [i, setDensityIndex];
}

/* ───────── spine ───────── */

type SpineProps = {
  item: ShelfItem;
  index: number;
  total: number;
  left: number;
  width: number;
  hidden: boolean;
  editing: boolean;
  animateLayout: boolean;
  onPress: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  dragging: boolean;
  scrollAdj: SharedValue<number>;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dx: number, absX: number) => void;
  onDragEnd: (index: number) => void;
};

const Spine = memo(function Spine({
  item, index, total, left, width, hidden, editing, animateLayout, onPress, onMove, dragging, scrollAdj, onDragStart, onDragMove, onDragEnd,
}: SpineProps) {
  const h = spineHeight(item.key);
  const fs = width < 32 ? 10 : item.title.length <= 18 ? 12 : item.title.length <= 32 ? 11 : 10;

  // Arrange mode: press and hold a spine, then drag it along the shelf. A quick swipe
  // still scrolls the shelf, and nothing can be dragged outside Arrange mode.
  const tx = useSharedValue(0);
  const lift = useSharedValue(0);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(editing)
        .activateAfterLongPress(220)
        .onStart(() => {
          lift.value = withTiming(1, { duration: 120 });
          runOnJS(onDragStart)(index);
        })
        .onUpdate((e) => {
          tx.value = e.translationX;
          runOnJS(onDragMove)(index, e.translationX, e.absoluteX);
        })
        .onEnd(() => {
          runOnJS(onDragEnd)(index);
        })
        .onFinalize(() => {
          tx.value = 0;
          lift.value = withTiming(0, { duration: 120 });
        }),
    [editing, index, onDragStart, onDragMove, onDragEnd, tx, lift]
  );
  const dragStyle = useAnimatedStyle(() => ({
    zIndex: lift.value > 0 ? 8 : 0,
    transform: [
      { translateX: tx.value + (dragging ? scrollAdj.value : 0) },
      { translateY: -14 * lift.value },
      { scale: 1 + 0.05 * lift.value },
    ],
    shadowOpacity: 0.7 * lift.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        layout={dragging || !animateLayout ? undefined : LinearTransition.duration(220)}
        style={[styles.spine, styles.spineShadow, { left, width, height: h, top: HEADROOM + SPINE_H - h, opacity: hidden ? 0 : 1 }, dragStyle]}
      >
        <Pressable
          onPress={() => onPress(index)}
          style={StyleSheet.absoluteFill}
          accessibilityRole={editing ? 'adjustable' : 'button'}
          accessibilityLabel={`${item.title}${item.year ? `, ${item.year}` : ''}`}
          accessibilityHint={editing ? 'Swipe up or down to move. Or hold and drag.' : 'Shows the cover'}
          accessibilityValue={{ text: `${index + 1} of ${total}` }}
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
              priority="low"
              transition={0}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor(item.title) }]} />
          )}
          <View style={styles.spineShade} />
          {/* Rotated title: a box as tall as the spine, turned on its side. */}
          <View style={[styles.spineTitleBox, { width: h - 34, height: width, left: (width - (h - 34)) / 2, top: (h - 34 - width) / 2 + 8 }]}>
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
    </GestureDetector>
  );
});

/* ───────── shelf row ───────── */

type RowProps = {
  shelf: Shelf;
  density: number;
  densityIndex: number;
  hiddenKey: string | null;
  editing: boolean;
  canEdit: boolean;
  registerTrack: (id: string, ref: ScrollView | null) => void;
  getScrollX: (id: string) => number;
  onOpen: (shelfId: string, key: string, rectFor: (key: string) => Rect | null) => void;
  onMove: (shelfId: string, index: number, delta: number) => void;
  onToggleEdit: (id: string) => void;
  onVisibility: (shelf: Shelf) => void;
  onTrackScroll: (id: string, x: number) => void;
  onPinchDensity: (shelfId: string, next: number, focalX: number) => void;
};

function moved<T>(arr: T[], from: number, to: number) {
  if (from === to) return arr;
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

const ShelfRow = memo(function ShelfRow(p: RowProps) {
  const { shelf, density } = p;
  const { width: screenW } = useWindowDimensions();
  // Gestures call through refs so they are never rebuilt in the middle of a drag or pinch.
  const pRef = useRef(p);
  pRef.current = p;
  const baseGeo = useMemo(() => layout(shelf.items, density), [shelf.items, density]);
  const geoRef = useRef(baseGeo);
  geoRef.current = baseGeo;
  const itemsRef = useRef(shelf.items);
  itemsRef.current = shelf.items;
  const wrapRef = useRef<View>(null);

  // Spines slide when the order changes, but snap when the density changes so the
  // spine under your fingers stays put.
  const [animateLayout, setAnimateLayout] = useState(true);
  const lastDensity = useRef(density);
  useEffect(() => {
    if (lastDensity.current === density) return;
    lastDensity.current = density;
    setAnimateLayout(false);
    const t = setTimeout(() => setAnimateLayout(true), 300);
    return () => clearTimeout(t);
  }, [density]);

  /* ── which spines to render: long shelves only render what's near the screen ── */
  const BUCKET = Math.max(160, Math.round(screenW / 2));
  const [bucket, setBucket] = useState(0);
  const range = useMemo<[number, number]>(() => {
    if (shelf.items.length <= VIRTUAL_FROM) return [0, shelf.items.length - 1];
    const x0 = bucket * BUCKET - screenW;
    const x1 = bucket * BUCKET + BUCKET + 2 * screenW;
    return [firstAfter(baseGeo, x0), Math.min(shelf.items.length - 1, firstAfter(baseGeo, x1))];
  }, [bucket, BUCKET, screenW, baseGeo, shelf.items.length]);

  /* ── drag to arrange ── */
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const dragRef = useRef<{ from: number; to: number; dx: number; absX: number; startScroll: number } | null>(null);
  const shelfId = shelf.id;
  const wrapBox = useRef({ x: 0, w: screenW });
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollAdj = useSharedValue(0);
  const justDragged = useRef(false);
  const order = useMemo(() => (drag ? moved(shelf.items, drag.from, drag.to) : shelf.items), [shelf.items, drag]);
  const geo = useMemo(() => (drag ? layout(order, density) : baseGeo), [drag, order, baseGeo, density]);
  const trackRef = useRef<ScrollView | null>(null);

  const retarget = useCallback(() => {
    const st = dragRef.current;
    if (!st) return;
    const adj = pRef.current.getScrollX(shelfId) - st.startScroll;
    const g = geoRef.current;
    const centre = g.lefts[st.from] + g.widths[st.from] / 2 + st.dx + adj;
    const rest = g.lefts.map((l, j) => ({ c: l + g.widths[j] / 2, j })).filter((x) => x.j !== st.from);
    let to = rest.findIndex((x) => x.c > centre);
    if (to === -1) to = rest.length;
    if (to !== st.to) {
      st.to = to;
      Haptics.selectionAsync().catch(() => {});
      setDrag({ from: st.from, to });
    }
  }, [shelfId]);

  const stopAuto = () => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = null;
  };
  const onDragStart = useCallback(
    (i: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      justDragged.current = true;
      const startScroll = pRef.current.getScrollX(shelfId);
      dragRef.current = { from: i, to: i, dx: 0, absX: 0, startScroll };
      scrollAdj.value = 0;
      setDrag({ from: i, to: i });
      wrapRef.current?.measureInWindow((x, _y, w) => (wrapBox.current = { x, w }));
      // Hold near an edge to keep scrolling the shelf while dragging.
      stopAuto();
      autoTimer.current = setInterval(() => {
        const st = dragRef.current;
        const track = trackRef.current;
        if (!st || !track || !st.absX) return;
        const { x, w } = wrapBox.current;
        let v = 0;
        if (st.absX < x + EDGE) v = -Math.ceil((x + EDGE - st.absX) / 4);
        else if (st.absX > x + w - EDGE) v = Math.ceil((st.absX - (x + w - EDGE)) / 4);
        if (!v) return;
        const cur = pRef.current.getScrollX(shelfId);
        const max = Math.max(0, geoRef.current.width - w);
        const next = Math.max(0, Math.min(max, cur + v));
        if (next === cur) return;
        track.scrollTo({ x: next, animated: false });
        pRef.current.onTrackScroll(shelfId, next);
        scrollAdj.value = next - st.startScroll;
        retarget();
      }, 16);
    },
    [shelfId, scrollAdj, retarget]
  );
  const onDragMove = useCallback(
    (_i: number, dx: number, absX: number) => {
      const st = dragRef.current;
      if (!st) return;
      st.dx = dx;
      st.absX = absX;
      retarget();
    },
    [retarget]
  );
  const onDragEnd = useCallback(
    (i: number) => {
      stopAuto();
      const to = dragRef.current?.to ?? i;
      dragRef.current = null;
      scrollAdj.value = 0;
      setDrag(null);
      if (to !== i) pRef.current.onMove(shelfId, i, to - i);
      setTimeout(() => (justDragged.current = false), 250);
    },
    [shelfId, scrollAdj]
  );
  useEffect(() => stopAuto, []);

  /* ── tap a spine: work out where every spine is on screen right now, then open ── */
  const onPress = useCallback(
    (i: number) => {
      if (justDragged.current) return;
      const key = itemsRef.current[i]?.key;
      if (!key) return;
      wrapRef.current?.measureInWindow((wx, wy, ww) => {
        const scrollX = p.getScrollX(shelf.id);
        const rectFor = (k: string): Rect | null => {
          const idx = itemsRef.current.findIndex((it) => it.key === k);
          const g = geoRef.current;
          if (idx < 0 || g.lefts[idx] == null) return null;
          const x = wx + g.lefts[idx] - scrollX;
          const w = g.widths[idx];
          if (x + w < wx + 2 || x > wx + ww - 2) return null;
          const h = spineHeight(k);
          return { x, y: wy + HEADROOM + SPINE_H - h, w, h };
        };
        p.onOpen(shelf.id, key, rectFor);
      });
    },
    [p, shelf.id]
  );
  const onMove = useCallback((i: number, d: number) => p.onMove(shelf.id, i, d), [p, shelf.id]);

  /* ── pinch to change spine density ── */
  const pinchTo = useCallback((next: number, focalX: number) => pRef.current.onPinchDensity(shelfId, next, focalX), [shelfId]);
  const pinchBase = useSharedValue(p.densityIndex);
  const pinchLevel = useSharedValue(p.densityIndex);
  const nativeScroll = useMemo(() => Gesture.Native(), []);
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .simultaneousWithExternalGesture(nativeScroll)
        .onStart(() => {
          pinchBase.value = pinchLevel.value;
        })
        .onUpdate((e) => {
          // Each ~25% of pinch steps one density level.
          const steps = Math.round(Math.log(e.scale) / Math.log(1.25));
          const next = Math.max(0, Math.min(DENSITIES.length - 1, pinchBase.value + steps));
          if (next !== pinchLevel.value) {
            pinchLevel.value = next;
            runOnJS(pinchTo)(next, e.focalX);
          }
        }),
    [nativeScroll, pinchTo, pinchBase, pinchLevel]
  );
  useEffect(() => {
    pinchLevel.value = p.densityIndex;
  }, [p.densityIndex, pinchLevel]);

  const onScroll = (x: number) => {
    p.onTrackScroll(shelf.id, x);
    const b = Math.max(0, Math.floor(x / BUCKET));
    if (b !== bucket) setBucket(b);
  };

  return (
    <View style={styles.shelf}>
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
            {shelf.items.length > 1 ? <Chip label={p.editing ? 'Done' : 'Arrange'} on={p.editing} onPress={() => p.onToggleEdit(shelf.id)} /> : null}
          </View>
        ) : null}
      </View>
      {p.editing ? <Text style={styles.editHint}>Hold a title and drag it, or tap it and use the Move buttons.</Text> : null}
      {shelf.items.length === 0 ? (
        <Text style={styles.empty}>Nothing here yet.</Text>
      ) : (
        <GestureDetector gesture={pinch}>
          <View ref={wrapRef} collapsable={false}>
            <GestureDetector gesture={nativeScroll}>
              <ScrollView
                ref={(r) => {
                  trackRef.current = r;
                  p.registerTrack(shelf.id, r);
                }}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="normal"
                scrollEventThrottle={32}
                scrollEnabled={!drag}
                onScroll={(e) => onScroll(e.nativeEvent.contentOffset.x)}
                contentContainerStyle={{ width: geo.width, height: TRACK_H }}
                accessibilityRole="list"
                accessibilityLabel={shelf.title}
              >
                {shelf.items.map((it, i) => {
                  const isDragged = drag?.from === i;
                  if (!isDragged && (i < range[0] || i > range[1])) return null;
                  return (
                    <Spine
                      key={it.key}
                      item={it}
                      index={i}
                      total={shelf.items.length}
                      left={isDragged ? baseGeo.lefts[i] : geo.lefts[drag ? order.indexOf(it) : i]}
                      width={baseGeo.widths[i]}
                      hidden={p.hiddenKey === it.key}
                      editing={p.editing}
                      animateLayout={animateLayout}
                      onPress={onPress}
                      onMove={onMove}
                      dragging={isDragged}
                      scrollAdj={scrollAdj}
                      onDragStart={onDragStart}
                      onDragMove={onDragMove}
                      onDragEnd={onDragEnd}
                    />
                  );
                })}
                <View style={[styles.plank, { width: geo.width }]} />
              </ScrollView>
            </GestureDetector>
          </View>
        </GestureDetector>
      )}
    </View>
  );
});

/* ───────── browser ───────── */

type Stage = { shelfId: string; startKey: string; key: string; rectFor: (key: string) => Rect | null } | null;

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
  const [stage, setStage] = useState<Stage>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<'shelf' | 'grid' | 'list'>('shelf');
  const [dIndex, setDIndex] = useDensity();
  const density = DENSITIES[dIndex];
  const tracks = useRef(new Map<string, ScrollView>());
  const trackX = useRef(new Map<string, number>());

  const registerTrack = useCallback((id: string, ref: ScrollView | null) => {
    if (ref) tracks.current.set(id, ref);
    else tracks.current.delete(id);
  }, []);
  const onTrackScroll = useCallback((id: string, x: number) => trackX.current.set(id, x), []);
  const getScrollX = useCallback((id: string) => trackX.current.get(id) ?? 0, []);

  const onOpen = useCallback((shelfId: string, key: string, rectFor: (key: string) => Rect | null) => {
    setStage((cur) => cur ?? { shelfId, startKey: key, key, rectFor });
  }, []);

  /* density: keep the spine under the pinch where it is; other shelves keep their place proportionally */
  const changeDensity = useCallback(
    (next: number, pinned?: { shelfId: string; focalX: number }) => {
      const from = DENSITIES[dIndex];
      const to = DENSITIES[Math.max(0, Math.min(DENSITIES.length - 1, next))];
      if (from === to) return;
      Haptics.selectionAsync().catch(() => {});
      const ratio = to / from;
      const nextX = new Map<string, number>();
      tracks.current.forEach((_t, id) => {
        const x = trackX.current.get(id) ?? 0;
        const focal = pinned?.shelfId === id ? pinned.focalX : 0;
        nextX.set(id, Math.max(0, PAD_X + (x + focal - PAD_X) * ratio - focal));
      });
      setDIndex(next);
      requestAnimationFrame(() =>
        nextX.forEach((x, id) => {
          tracks.current.get(id)?.scrollTo({ x, animated: false });
          trackX.current.set(id, x);
        })
      );
      AccessibilityInfo.announceForAccessibility(next < dIndex ? 'More titles per shelf' : 'Fewer titles per shelf');
    },
    [dIndex, setDIndex]
  );
  const onPinchDensity = useCallback((shelfId: string, next: number, focalX: number) => changeDensity(next, { shelfId, focalX }), [changeDensity]);

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

  const stageShelf = stage ? shelves.find((s) => s.id === stage.shelfId) ?? null : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomInset + 40 }} keyboardShouldPersistTaps="handled">
        {header}
        <View style={styles.toolbar}>
          <View style={styles.segment} accessibilityRole="tablist">
            {(['shelf', 'grid', 'list'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={[styles.segBtn, view === v && styles.segOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: view === v }}
              >
                <Text style={[styles.segLabel, view === v && { color: '#fff' }]}>{v === 'shelf' ? 'Shelf' : v === 'grid' ? 'Grid' : 'List'}</Text>
              </Pressable>
            ))}
          </View>
          {view === 'shelf' ? (
            <View style={styles.density} accessibilityLabel="Spine size">
              <DensityBtn glyph="−" label="Fit more titles on each shelf" disabled={dIndex === 0} onPress={() => changeDensity(dIndex - 1)} />
              <DensityBtn glyph="+" label="Show bigger spines" disabled={dIndex === DENSITIES.length - 1} onPress={() => changeDensity(dIndex + 1)} />
            </View>
          ) : null}
        </View>
        {view === 'shelf'
          ? shelves.map((shelf) => (
              <ShelfRow
                key={shelf.id}
                shelf={shelf}
                density={density}
                densityIndex={dIndex}
                hiddenKey={stage?.shelfId === shelf.id ? stage.key : null}
                editing={editingId === shelf.id}
                canEdit={canEdit}
                registerTrack={registerTrack}
                getScrollX={getScrollX}
                onTrackScroll={onTrackScroll}
                onOpen={onOpen}
                onMove={move}
                onToggleEdit={(id) => setEditingId((cur) => (cur === id ? null : id))}
                onVisibility={chooseVisibility}
                onPinchDensity={onPinchDensity}
              />
            ))
          : shelves.map((shelf) => <FlatShelf key={shelf.id} shelf={shelf} view={view} />)}
      </ScrollView>

      {stage && stageShelf ? (
        <CoverStage
          key={`${stage.shelfId}:${stage.startKey}`}
          shelf={stageShelf}
          startKey={stage.startKey}
          spineRect={stage.rectFor}
          reduced={reduced}
          canEdit={canEdit}
          editing={editingId === stage.shelfId}
          onKeyChange={(k) => setStage((cur) => (cur ? { ...cur, key: k } : cur))}
          onMove={(k, d) => {
            const i = stageShelf.items.findIndex((it) => it.key === k);
            if (i >= 0) move(stageShelf.id, i, d);
          }}
          onOpenTitle={(it) => {
            setStage(null);
            openTitle(it);
          }}
          onClosed={() => setStage(null)}
        />
      ) : null}
    </View>
  );
}

function DensityBtn({ glyph, label, disabled, onPress }: { glyph: string; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.densityBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.12)' }, disabled && { opacity: 0.3 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.densityGlyph}>{glyph}</Text>
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
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 14 },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  segBtn: { minHeight: 34, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' },
  segOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  segLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  density: { flexDirection: 'row', gap: 4 },
  densityBtn: { width: 40, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  densityGlyph: { fontSize: 20, lineHeight: 22, color: 'rgba(255,255,255,0.85)' },

  shelf: { marginBottom: 22 },
  head: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, gap: 10 },
  headTitle: { fontSize: 17, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: -0.2 },
  headSub: { fontSize: 12.5, color: RS.colors.textSecondary, marginTop: 2 },
  headActions: { flexDirection: 'row', gap: 6 },
  editHint: { marginHorizontal: 16, marginTop: 4, fontSize: 12, color: 'rgba(232,195,122,0.9)' },
  spineShadow: { shadowColor: '#000', shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0 },
  empty: { marginHorizontal: 16, marginTop: 10, fontSize: 13, color: RS.colors.textMuted },

  spine: { position: 'absolute', borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden', backgroundColor: '#26211d' },
  spineShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  spineTitleBox: { position: 'absolute', justifyContent: 'center', transform: [{ rotate: '-90deg' }] },
  spineTitle: { color: '#fff', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  spineFoot: { position: 'absolute', bottom: 7, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  spineEditing: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(232,195,122,0.5)', borderRadius: 3 },
  plank: { position: 'absolute', left: 0, top: HEADROOM + SPINE_H, height: 9, borderRadius: 2, backgroundColor: '#2d261f' },

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
