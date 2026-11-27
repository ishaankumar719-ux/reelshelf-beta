// The cover stage: tapping a spine pulls the title out of the shelf, turns it to show
// its front cover and settles it in the middle of the screen. Swipe sideways through
// the neighbouring covers; swipe down, tap outside or press Close to put it back.
// The shelf underneath never scrolls, so closing returns to exactly where you were.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { posterAt, type Shelf, type ShelfItem } from '@/lib/supabase/shelves';

export type Rect = { x: number; y: number; w: number; h: number };

const EASE = Easing.bezier(0.22, 0.8, 0.2, 1);
const OPEN_MS = 560;
const CLOSE_MS = 440;
const MEDIA_LABEL: Record<string, string> = { movie: 'FILM', tv: 'SERIES', book: 'BOOK', short_film: 'SHORT' };
const fallbackColor = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return `hsl(${(h >>> 0) % 360}, 26%, 22%)`;
};

type Props = {
  shelf: Shelf;
  startKey: string;
  /** Where a title's spine sits on screen right now, or null when it's scrolled out of view. */
  spineRect: (key: string) => Rect | null;
  reduced: boolean;
  canEdit: boolean;
  editing: boolean;
  onKeyChange: (key: string) => void;
  onMove: (key: string, delta: number) => void;
  onOpenTitle: (item: ShelfItem) => void;
  onClosed: () => void;
};

export function CoverStage(p: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const CW = Math.round(Math.min(W * 0.64, 320, ((H - insets.top - insets.bottom) * 0.5) / 1.5));
  const CH = Math.round(CW * 1.5);
  const ITEM = CW + 28;
  const target: Rect = { x: (W - CW) / 2, y: insets.top + 58, w: CW, h: CH };

  const items = p.shelf.items;
  const [key, setKey] = useState(p.startKey);
  const index = Math.max(0, items.findIndex((i) => i.key === key));
  const item = items[index];

  // 0 = on the shelf, 1 = settled on stage. `settled` swaps the flying cover for the swipeable strip.
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const [settled, setSettled] = useState(false);
  const [from, setFrom] = useState<Rect | null>(() => p.spineRect(p.startKey));
  const closing = useRef(false);

  const land = useCallback(() => {
    setSettled(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  }, []);

  useEffect(() => {
    Haptics.selectionAsync().catch(() => {});
    const it = items.find((i) => i.key === p.startKey);
    if (it) AccessibilityInfo.announceForAccessibility(`${it.title}. Swipe left or right for other titles.`);
    if (p.reduced || !from) {
      progress.value = withTiming(1, { duration: p.reduced ? 160 : 260 }, (f) => f && runOnJS(land)());
    } else {
      progress.value = withTiming(1, { duration: OPEN_MS, easing: EASE }, (f) => f && runOnJS(land)());
    }
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm the covers either side so swiping never shows a blank.
  useEffect(() => {
    const urls = items
      .slice(Math.max(0, index - 3), index + 4)
      .map((i) => posterAt(i.poster, 'w500'))
      .filter(Boolean) as string[];
    Image.prefetch(urls).catch(() => {});
  }, [index, items]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    // Fly back to the spine of whatever cover is showing now, if it's on screen.
    const back = p.spineRect(key);
    setFrom(back);
    setSettled(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const done = (f?: boolean) => {
      'worklet';
      if (f) runOnJS(p.onClosed)();
    };
    drag.value = withTiming(0, { duration: p.reduced ? 120 : CLOSE_MS, easing: EASE });
    progress.value = withTiming(0, { duration: p.reduced || !back ? 200 : CLOSE_MS, easing: EASE }, done);
  }, [key, p, progress, drag]);

  const choose = useCallback(
    (k: string) => {
      if (k === key) return;
      setKey(k);
      p.onKeyChange(k);
      Haptics.selectionAsync().catch(() => {});
      const it = items.find((i) => i.key === k);
      if (it) AccessibilityInfo.announceForAccessibility(`${it.title}. ${items.indexOf(it) + 1} of ${items.length}.`);
    },
    [key, items, p]
  );

  /* ── strip of covers ── */
  const listRef = useRef<FlatList<ShelfItem>>(null);
  const scrollX = useSharedValue(index * ITEM);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });
  useAnimatedReaction(
    () => Math.round(scrollX.value / ITEM),
    (i, prev) => {
      if (prev !== null && i !== prev && i >= 0 && i < items.length) runOnJS(choose)(items[i].key);
    },
    [items, ITEM, choose]
  );
  // Keep the strip on the selected cover when it changes from a button or a move.
  useEffect(() => {
    if (!settled) return;
    const cur = Math.round(scrollX.value / ITEM);
    if (cur !== index) listRef.current?.scrollToOffset({ offset: index * ITEM, animated: !p.reduced && Math.abs(cur - index) === 1 });
  }, [index, settled, ITEM, scrollX, p.reduced]);

  /* ── swipe down to put it back ── */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(14)
        .failOffsetX([-14, 14])
        .onUpdate((e) => {
          drag.value = Math.max(0, e.translationY);
        })
        .onEnd((e) => {
          if (drag.value > 110 || e.velocityY > 900) runOnJS(close)();
          else drag.value = withSpring(0, { damping: 18, stiffness: 220 });
        }),
    [close, drag]
  );

  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [0, 0.7, 1]) * interpolate(drag.value, [0, 260], [1, 0.35], Extrapolation.CLAMP),
  }));
  const stage = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.value }, { scale: interpolate(drag.value, [0, 300], [1, 0.86], Extrapolation.CLAMP) }],
  }));
  const chrome = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [0, 1], Extrapolation.CLAMP) * interpolate(drag.value, [0, 120], [1, 0], Extrapolation.CLAMP),
  }));

  const flyItem = settled ? null : items.find((i) => i.key === key) ?? null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={close} supportedOrientations={['portrait']}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Put the title back on the shelf" accessibilityRole="button" />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[StyleSheet.absoluteFill, stage]} pointerEvents="box-none" accessibilityViewIsModal>
            {/* top bar */}
            <Animated.View style={[styles.top, { top: insets.top + 8 }, chrome]}>
              <Text style={styles.count} accessibilityLabel={`${index + 1} of ${items.length}`}>
                {index + 1} / {items.length}
              </Text>
              <Pressable onPress={close} hitSlop={8} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={styles.closeGlyph}>×</Text>
              </Pressable>
            </Animated.View>

            {/* swipeable covers (shown once the pulled-out cover has landed) */}
            <View style={{ position: 'absolute', top: target.y, left: 0, right: 0, height: CH, opacity: settled ? 1 : 0 }} pointerEvents={settled ? 'auto' : 'none'}>
              <Animated.FlatList
                ref={listRef}
                data={items}
                horizontal
                keyExtractor={(it) => it.key}
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM}
                decelerationRate="fast"
                disableIntervalMomentum
                initialScrollIndex={index}
                getItemLayout={(_, i) => ({ length: ITEM, offset: ITEM * i, index: i })}
                contentContainerStyle={{ paddingHorizontal: (W - ITEM) / 2 }}
                initialNumToRender={5}
                windowSize={5}
                maxToRenderPerBatch={4}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item: it, index: i }) => (
                  <StripCover item={it} i={i} itemW={ITEM} cw={CW} ch={CH} scrollX={scrollX} reduced={p.reduced} selected={it.key === key} onPress={() => (it.key === key ? p.onOpenTitle(it) : listRef.current?.scrollToOffset({ offset: i * ITEM, animated: !p.reduced }))} total={items.length} onStep={(d) => { const n = items[i + d]; if (n) choose(n.key); }} />
                )}
              />
            </View>

            {/* title details */}
            {item ? (
              <Animated.View style={[styles.info, { top: target.y + CH + 22, paddingBottom: insets.bottom + 16 }, chrome]}>
                <View style={styles.meta}>
                  {item.rank != null ? <Text style={[styles.metaText, { color: RS.colors.gold }]}>#{item.rank}</Text> : null}
                  <Text style={styles.metaText}>{MEDIA_LABEL[item.mediaType] ?? 'TITLE'}</Text>
                  {item.year ? <Text style={styles.metaText}>{item.year}</Text> : null}
                </View>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {item.creator ? <Text style={styles.creator} numberOfLines={1}>{item.creator}</Text> : null}
                {item.note ? <Text style={styles.note} numberOfLines={2}>“{item.note}”</Text> : null}
                <View style={styles.actions}>
                  <Pressable onPress={() => p.onOpenTitle(item)} style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
                    <Text style={styles.openLabel}>Open title</Text>
                  </Pressable>
                  {p.canEdit && p.editing ? (
                    <View style={styles.moveRow}>
                      <Chip label="← Move" disabled={index === 0} onPress={() => p.onMove(key, -1)} a11y="Move left on the shelf" />
                      <Chip label="Move →" disabled={index === items.length - 1} onPress={() => p.onMove(key, 1)} a11y="Move right on the shelf" />
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            ) : null}

            {/* the title being pulled out (or put back) */}
            {flyItem ? <Flyer item={flyItem} from={from} to={target} progress={progress} reduced={p.reduced} /> : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

/* ───────── the pull-out and turn ─────────
   One book with two faces. The spine face turns away around its right edge while the
   cover face turns in around the same edge, like taking a book off a shelf and turning
   it to face you. Phases on one 0→1 timeline: pull up out of the row, turn, then glide
   to the middle of the screen at full size. Played backwards to put it back. */

function Flyer({ item, from, to, progress, reduced }: { item: ShelfItem; from: Rect | null; to: Rect; progress: SharedValue<number>; reduced: boolean }) {
  // Reduced motion, or a spine that's scrolled out of view: no flight, the cover just fades in place.
  const start: Rect = !reduced && from ? from : { x: to.x - 1, y: to.y, w: 1, h: to.h };
  const pull = Math.min(36, start.h * 0.2);
  const bookW = start.h / 1.5; // the cover's width at the spine's height
  const turn = !reduced && !!from;

  const box = useAnimatedStyle(() => {
    const t = progress.value;
    const glide = interpolate(t, [0.45, 1], [0, 1], Extrapolation.CLAMP);
    const lifted = interpolate(t, [0, 0.25], [0, 1], Extrapolation.CLAMP);
    const edgeX = start.x + start.w; // the spine's right edge is the hinge (or the cover's left edge)
    const x = interpolate(glide, [0, 1], [edgeX, to.x]);
    const y = interpolate(glide, [0, 1], [start.y - pull * lifted, to.y]);
    const h = interpolate(glide, [0, 1], [start.h, to.h]);
    return {
      left: x,
      top: y,
      height: h,
      width: interpolate(glide, [0, 1], [bookW, to.w]),
      opacity: turn ? 1 : interpolate(t, [0, 1], [0, 1]),
    };
  });
  const spineFace = useAnimatedStyle(() => {
    const a = turn ? interpolate(progress.value, [0.18, 0.62], [0, 90], Extrapolation.CLAMP) : 90;
    return { opacity: a >= 89 ? 0 : 1, transform: [{ perspective: 700 }, { rotateY: `${a}deg` }] };
  });
  const coverFace = useAnimatedStyle(() => {
    const a = turn ? interpolate(progress.value, [0.18, 0.62], [-90, 0], Extrapolation.CLAMP) : 0;
    return {
      opacity: a <= -89 ? 0 : 1,
      transform: [{ perspective: 700 }, { rotateY: `${a}deg` }],
      shadowOpacity: interpolate(progress.value, [0.3, 1], [0.2, 0.7], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[styles.flyer, box]} pointerEvents="none" accessible={false}>
      {/* spine face: sits just left of the hinge */}
      <Animated.View style={[styles.spineFace, { width: start.w, height: start.h, left: -start.w, transformOrigin: 'right center' }, spineFace]}>
        {item.poster ? (
          <Image source={posterAt(item.poster, 'w154')} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: '30%', left: '50%' }} cachePolicy="memory-disk" transition={0} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fallbackColor(item.title) }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.52)' }]} />
      </Animated.View>
      {/* cover face: fills the box, hinged on its left edge */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.coverFace, { transformOrigin: 'left center' }, coverFace]}>
        <CoverImage item={item} />
      </Animated.View>
    </Animated.View>
  );
}

function CoverImage({ item }: { item: ShelfItem }) {
  return item.poster ? (
    <Image
      source={posterAt(item.poster, 'w500')}
      placeholder={posterAt(item.poster, 'w154')}
      placeholderContentFit="cover"
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={item.key}
      transition={120}
    />
  ) : (
    <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: fallbackColor(item.title) }]}>
      <Text style={styles.fallbackText}>{item.title}</Text>
    </View>
  );
}

/* ───────── one cover in the strip: neighbours sit back and turn slightly ───────── */

const StripCover = React.memo(function StripCover({
  item, i, itemW, cw, ch, scrollX, reduced, selected, onPress, total, onStep,
}: {
  item: ShelfItem; i: number; itemW: number; cw: number; ch: number; scrollX: SharedValue<number>; reduced: boolean;
  selected: boolean; onPress: () => void; total: number; onStep: (d: number) => void;
}) {
  const style = useAnimatedStyle(() => {
    const d = Math.max(-1.5, Math.min(1.5, (scrollX.value - i * itemW) / itemW));
    const ad = Math.abs(d);
    return {
      opacity: interpolate(ad, [0, 1, 1.5], [1, 0.5, 0.25]),
      transform: reduced
        ? [{ scale: 1 - 0.1 * Math.min(ad, 1) }]
        : [{ perspective: 900 }, { rotateY: `${d * 22}deg` }, { scale: 1 - 0.12 * Math.min(ad, 1) }],
    };
  });
  return (
    <View style={{ width: itemW, height: ch, alignItems: 'center' }}>
      <Animated.View style={[{ width: cw, height: ch }, styles.coverFace, style]}>
        <Pressable
          onPress={onPress}
          style={StyleSheet.absoluteFill}
          accessible={selected}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${item.year ? `, ${item.year}` : ''}`}
          accessibilityHint="Opens the title. Swipe up or down for other titles."
          accessibilityValue={{ text: `${i + 1} of ${total}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          <CoverImage item={item} />
        </Pressable>
      </Animated.View>
    </View>
  );
});

function Chip({ label, onPress, disabled, a11y }: { label: string; onPress: () => void; disabled?: boolean; a11y?: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.chip, disabled && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel={a11y ?? label} accessibilityState={{ disabled: !!disabled }}>
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(9,8,7,0.94)' },
  top: { position: 'absolute', left: 16, right: 10, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontVariant: ['tabular-nums'] },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  closeGlyph: { fontSize: 26, lineHeight: 28, color: '#fff' },

  flyer: { position: 'absolute' },
  spineFace: { position: 'absolute', top: 0, borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden', backgroundColor: '#26211d', backfaceVisibility: 'hidden' },
  coverFace: {
    borderRadius: 6, overflow: 'hidden', backgroundColor: '#1b1815', backfaceVisibility: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 22, shadowOffset: { width: 0, height: 16 },
  },
  fallback: { justifyContent: 'flex-end', padding: 14 },
  fallbackText: { color: '#fff', fontWeight: '700', fontSize: 18 },

  info: { position: 'absolute', left: 24, right: 24 },
  meta: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  metaText: { fontSize: 11, letterSpacing: 0.8, color: RS.colors.textSecondary, fontWeight: '600' },
  title: { marginTop: 6, fontSize: 21, lineHeight: 26, fontWeight: '700', color: '#fff', textAlign: 'center' },
  creator: { marginTop: 4, fontSize: 14, color: RS.colors.textSecondary, textAlign: 'center' },
  note: { marginTop: 6, fontSize: 13.5, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', textAlign: 'center' },
  actions: { marginTop: 16, alignItems: 'center', gap: 10 },
  openBtn: { minHeight: 46, paddingHorizontal: 28, borderRadius: 23, backgroundColor: '#f4f1ea', justifyContent: 'center' },
  openLabel: { color: '#141210', fontWeight: '700', fontSize: 15 },
  moveRow: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center' },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
