import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, RS } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { MediaType } from '@/data/seedHomeContent';
import type { MediaDetailRecord } from '@/data/mediaDetails';

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
  title:      string;
  year?:      number;
  mediaType:  MediaType;
  posterUrl:  string | null;
  detail?:    MediaDetailRecord;
}

export function MediaHero({ title, year, mediaType, posterUrl, detail }: MediaHeroProps) {
  const reduceMotion = useReduceMotion();
  const hasBackdrop = !!detail?.backdropUrl;

  // Poster "settles into place" shortly after the screen appears — a gentle
  // depth cue, distinct from (and nested inside) the whole-screen expand
  // transition (see ExpandEntrance in app/media/[id].tsx).
  const posterOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const posterScale   = useSharedValue(reduceMotion ? 1 : 0.92);

  useEffect(() => {
    if (reduceMotion) return;
    const config = { duration: 320, easing: Easing.out(Easing.ease) };
    posterOpacity.value = withTiming(1, config);
    posterScale.value   = withTiming(1, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posterAnimStyle = useAnimatedStyle(() => ({
    opacity:   posterOpacity.value,
    transform: [{ scale: posterScale.value }],
  }));

  const runtime = formatRuntime(detail?.runtimeMinutes ?? null);
  const genres  = detail?.genres?.length ? detail.genres.slice(0, 3).join(', ') : null;
  const rating  = typeof detail?.rating === 'number' ? detail.rating : null;
  const author  = mediaType === 'book' ? (detail?.author ?? null) : null;

  const metaParts = [year ? String(year) : null, runtime, genres].filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      {hasBackdrop && (
        <View style={styles.backdropWrap}>
          <Image
            source={{ uri: detail!.backdropUrl! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
          />
          <LinearGradient
            colors={['rgba(7,7,7,0)', 'rgba(7,7,7,0.55)', RS.colors.base]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </View>
      )}

      <View style={[styles.infoRow, !hasBackdrop && styles.infoRowNoBackdrop]}>
        <Animated.View
          style={[
            styles.posterOuter,
            hasBackdrop && { marginTop: -POSTER_OVERLAP },
            posterAnimStyle,
          ]}
        >
          <View style={styles.posterInner}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={250}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
                <Text style={styles.posterFallbackLetter}>{title[0]?.toUpperCase() ?? ''}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.metaCol}>
          <Text style={styles.title} numberOfLines={3}>{title}</Text>
          {author ? (
            <Text style={styles.author} numberOfLines={1}>by {author}</Text>
          ) : null}
          {metaParts.length > 0 ? (
            <Text style={styles.metaLine} numberOfLines={1}>{metaParts.join(' · ')}</Text>
          ) : null}
          {rating !== null ? (
            <Text style={styles.rating}>ReelShelf {rating.toFixed(1)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: RS.spacing.md,
  },
  backdropWrap: {
    height:          BACKDROP_H,
    backgroundColor: RS.colors.card,
  },
  infoRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
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
});
