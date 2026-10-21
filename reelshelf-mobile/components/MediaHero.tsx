import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EasterEggScene } from '@/components/EasterEggScene';
import { Fonts, RS } from '@/constants/theme';
import { useCommunityRating } from '@/hooks/useCommunityRating';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { MediaType } from '@/data/seedHomeContent';
import type { MediaDetailRecord } from '@/data/mediaDetails';
import type { EasterEgg } from '@/lib/easterEggs';

const BACKDROP_H = 220;
const POSTER_W   = 128;
const POSTER_H   = POSTER_W * 1.5;
const POSTER_OVERLAP = 64;  // how far the poster rises into the backdrop

function formatRuntime(minutes: number | null): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface MediaHeroProps {
  id:         string;
  title:      string;
  year?:      number;
  mediaType:  MediaType;
  posterUrl:  string | null;
  detail?:    MediaDetailRecord;
  ratingRefreshKey?: number;
  easterEgg?: EasterEgg | null;
}

function EasterEggOverlay({ egg, reduceMotion }: { egg: EasterEgg; reduceMotion: boolean }) {
  const overlayColors: Partial<Record<EasterEgg, readonly [string, string]>> = {
    spice: ['rgba(101,45,10,0.08)', 'rgba(184,102,20,0.56)'],
    web: ['rgba(15,23,42,0.08)', 'rgba(30,41,59,0.68)'],
    babylon: ['rgba(60,8,10,0.12)', 'rgba(93,18,24,0.7)'],
    heroic: ['rgba(113,18,42,0.12)', 'rgba(127,29,29,0.62)'],
    vigilante: ['rgba(9,16,41,0.12)', 'rgba(14,42,90,0.7)'],
    cinephile: ['rgba(76,46,5,0.12)', 'rgba(120,53,15,0.64)'],
    codeRain: ['rgba(4,50,29,0.1)', 'rgba(10,85,47,0.6)'],
    hyperspace: ['rgba(8,47,73,0.1)', 'rgba(8,47,73,0.64)'],
    otherworld: ['rgba(11,7,29,0.04)', 'rgba(33,8,36,0.58)'],
    dynasty: ['rgba(48,10,4,0.02)', 'rgba(16,23,38,0.56)'],
    outlaw: ['rgba(93,48,8,0.04)', 'rgba(66,34,12,0.58)'],
    aftermath: ['rgba(9,38,25,0.04)', 'rgba(8,22,17,0.62)'],
    kitchenHeat: ['rgba(71,38,10,0.03)', 'rgba(28,17,10,0.6)'],
  };
  const colors = overlayColors[egg] ?? ['rgba(2,6,23,0.14)', 'rgba(15,23,42,0.68)'];

  return (
    <Animated.View
      pointerEvents="none"
      entering={reduceMotion ? undefined : FadeIn.duration(280)}
      exiting={reduceMotion ? undefined : FadeOut.duration(260)}
      style={styles.eggOverlay}
    >
      <LinearGradient
        colors={colors}
        style={StyleSheet.absoluteFill}
      />
      <EasterEggScene egg={egg} />
    </Animated.View>
  );
}

export function MediaHero({ id, title, year, mediaType, posterUrl, detail, ratingRefreshKey, easterEgg = null }: MediaHeroProps) {
  const reduceMotion = useReduceMotion();
  const [backdropBroken, setBackdropBroken] = useState(false);
  const [posterBroken, setPosterBroken] = useState(false);
  const [activeEgg, setActiveEgg] = useState(false);
  const eggTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBackdrop = !!detail?.backdropUrl && !backdropBroken;
  const showPoster = !!posterUrl && !posterBroken;

  // Poster "settles into place" shortly after the screen appears — a gentle
  // depth cue, distinct from (and nested inside) the whole-screen expand
  // transition (see ExpandEntrance in app/media/[id].tsx).
  const posterOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const posterScale   = useSharedValue(reduceMotion ? 1 : 0.92);
  const eggPulse      = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    const config = { duration: 320, easing: Easing.out(Easing.ease) };
    posterOpacity.value = withTiming(1, config);
    posterScale.value   = withTiming(1, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posterAnimStyle = useAnimatedStyle(() => ({
    opacity:   posterOpacity.value,
    transform: [{ scale: posterScale.value * eggPulse.value }],
  }));

  const runtime = formatRuntime(detail?.runtimeMinutes ?? null);
  const genres  = detail?.genres?.length ? detail.genres.slice(0, 3).join(', ') : null;
  const rating  = typeof detail?.rating === 'number' ? detail.rating : null;
  const communityRating = useCommunityRating(id, mediaType, ratingRefreshKey);
  const author  = mediaType === 'book' ? (detail?.author ?? null) : null;
  // TV Creator — real, confirmed on the website's own Series Detail meta
  // line (`{year}{creator ? " · "+creator : ""}`, app/series/[id]/page.tsx).
  // Already fetched (lib/tmdb.ts's creator field, from TMDB's created_by)
  // and already shown in Cast & Crew below, but wasn't in the hero meta
  // line where the real site puts it — added here to match.
  const creator = mediaType === 'tv' ? (detail?.creator ?? null) : null;

  const metaParts = [year ? String(year) : null, creator, runtime, genres].filter(Boolean) as string[];

  useEffect(() => () => {
    if (eggTimeout.current) clearTimeout(eggTimeout.current);
  }, []);

  const revealEgg = () => {
    if (!easterEgg) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setActiveEgg(true);
    if (!reduceMotion) {
      eggPulse.value = withSequence(
        withTiming(1.045, { duration: 180, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) }),
      );
    }
    if (eggTimeout.current) clearTimeout(eggTimeout.current);
    eggTimeout.current = setTimeout(() => setActiveEgg(false), 3600);
  };

  return (
    <View style={styles.container}>
      {hasBackdrop && (
        <View style={styles.backdropWrap}>
          <Image
            source={{ uri: detail!.backdropUrl! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            onError={() => setBackdropBroken(true)}
          />
          <LinearGradient
            colors={['rgba(7,7,7,0)', 'rgba(7,7,7,0.55)', RS.colors.base]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {activeEgg && easterEgg ? <EasterEggOverlay egg={easterEgg} reduceMotion={reduceMotion} /> : null}
        </View>
      )}

      {!hasBackdrop && activeEgg && easterEgg ? (
        <View pointerEvents="none" style={styles.standaloneEggWrap}>
          <EasterEggOverlay egg={easterEgg} reduceMotion={reduceMotion} />
        </View>
      ) : null}

      <View style={[styles.infoRow, !hasBackdrop && styles.infoRowNoBackdrop]}>
        <Pressable
          onLongPress={revealEgg}
          delayLongPress={650}
          disabled={!easterEgg}
          accessibilityRole={easterEgg ? 'button' : undefined}
          accessibilityHint={easterEgg ? 'Long press to discover a hidden moment.' : undefined}
        >
        <Animated.View
          style={[
            styles.posterOuter,
            hasBackdrop && { marginTop: -POSTER_OVERLAP },
            posterAnimStyle,
          ]}
        >
          <View style={styles.posterInner}>
            {showPoster ? (
              <Image
                source={{ uri: posterUrl! }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={250}
                onError={() => setPosterBroken(true)}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
                <Text style={styles.posterFallbackLetter}>{title[0]?.toUpperCase() ?? ''}</Text>
              </View>
            )}
          </View>
        </Animated.View>
        </Pressable>

        <View style={styles.metaCol}>
          <Text style={styles.title} numberOfLines={3}>{title}</Text>
          {author ? (
            <Text style={styles.author} numberOfLines={1}>by {author}</Text>
          ) : null}
          {metaParts.length > 0 ? (
            <Text style={styles.metaLine} numberOfLines={1}>{metaParts.join(' · ')}</Text>
          ) : null}
          {communityRating ? (
            <Text style={styles.rating}>
              ReelShelf {communityRating.average.toFixed(1)} · {communityRating.count} {communityRating.count === 1 ? 'rating' : 'ratings'}
            </Text>
          ) : rating !== null ? (
            <Text style={styles.rating}>TMDB {rating.toFixed(1)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: RS.spacing.md,
    position: 'relative',
  },
  backdropWrap: {
    height:          BACKDROP_H,
    backgroundColor: RS.colors.card,
    overflow:        'hidden',
  },
  standaloneEggWrap: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    height:          BACKDROP_H,
    backgroundColor: RS.colors.card,
    overflow:        'hidden',
  },
  infoRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
    zIndex:            1,
  },
  infoRowNoBackdrop: {
    paddingTop: RS.spacing.lg,
    alignItems: 'flex-start',
  },
  posterOuter: {
    width:         POSTER_W,
    height:        POSTER_H,
    borderRadius:  RS.card.radius,
    // Reuse PosterCard's float-shadow token for consistent depth across the app.
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity * 2,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  posterInner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
  },
  posterFallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  posterFallbackLetter: {
    fontSize:   40,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  metaCol: {
    flex: 1,
    gap:  4,
    paddingBottom: 2,
  },
  title: {
    fontSize:      RS.typography.display - 8,
    fontFamily:    Fonts?.serif,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    30,
  },
  author: {
    fontSize:   RS.typography.body,
    fontWeight: '500',
    color:      RS.colors.textSecondary,
  },
  metaLine: {
    fontSize:   RS.typography.caption,
    fontWeight: '500',
    color:      RS.colors.textSecondary,
  },
  rating: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.wide,
    marginTop:     2,
  },
  eggOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
