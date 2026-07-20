import { useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { useExpandOnPress } from '@/hooks/useExpandOnPress';
import { resolveImageUrl } from '@/lib/resolveImageUrl';
import type { MountRushmoreSlot, RushmoreMediaType } from '@/lib/supabase/mountRushmore';
import { getMediaKey } from '@/utils/listKeys';

function toRouteId(dbMediaType: string, dbMediaId: string): string {
  const prefix = dbMediaType === 'movie' ? 'film' : dbMediaType;
  const bareId = dbMediaId.startsWith('tmdb-') ? dbMediaId.slice(5) : dbMediaId;
  return `${prefix}-${bareId}`;
}

interface MountRushmoreGridProps {
  /** Already filtered to the one media type currently displayed — the
   *  caller (ProfileView) owns the Films/Series/Books tab strip, mirroring
   *  the website's own 3-tab display exactly (WEBSITE_PROFILE_AUDIT.md §1c). */
  slots:        MountRushmoreSlot[];
  onOpenDetail: (routeId: string, title: string, poster: string | null, mediaType: string) => void;
}

function RushmoreCell({ item, onOpenDetail }: { item: MountRushmoreSlot; onOpenDetail: MountRushmoreGridProps['onOpenDetail'] }) {
  const routeId = toRouteId(item.mediaType, item.mediaId);
  const mobileMediaType = item.mediaType === 'movie' ? 'film' : item.mediaType;
  // Reuses the same source-side fade+scale transition as Discover's
  // hero-weight cards — the destination screen already mounts with a
  // matching entrance for every navigation into it.
  const { style, trigger } = useExpandOnPress(() =>
    onOpenDetail(routeId, item.title, item.posterPath, mobileMediaType),
  );

  // resolveImageUrl fixes the confirmed root cause (WEBSITE_PROFILE_AUDIT.md
  // §1b): real mount_rushmore rows for movies/tv store bare TMDB paths
  // ("/abc123.jpg") with no CDN prefix. `broken` additionally covers a
  // resolved URL that fails to actually load, via Image's onError — same
  // graceful fallback either way, never a blank rect.
  const [broken, setBroken] = useState(false);
  const resolvedUri = resolveImageUrl(item.posterPath, 'poster');
  const showFallback = !resolvedUri || broken;

  return (
    <Pressable style={styles.cell} onPress={trigger}>
      <Animated.View style={[styles.cellInner, style]}>
        {!showFallback ? (
          <Image
            source={{ uri: resolvedUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            onError={() => setBroken(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]}>
            <MaterialIcons name="image-not-supported" size={22} color={RS.colors.textMuted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          locations={[0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.cellFooter}>
          <Text style={styles.cellTitle} numberOfLines={2}>{item.title}</Text>
          {item.year ? <Text style={styles.cellYear}>{item.year}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// "Mount Rushmore" — same real mount_rushmore data, same 4 fixed positions
// PER media type, rendered as a 2×2 grid (matches the website's own forced
// `repeat(2,1fr)` mobile treatment exactly — WEBSITE_PROFILE_AUDIT.md §1c).
// Tapping a populated cell opens Movie Detail; editing is a separate
// explicit "Edit" affordance opening MountRushmoreEditor.
export function MountRushmoreGrid({ slots, onOpenDetail }: MountRushmoreGridProps) {
  const positioned = ([1, 2, 3, 4] as const).map((pos) => slots.find((s) => s.position === pos) ?? null);

  return (
    <View style={styles.grid}>
      {positioned.map((item, i) =>
        item ? (
          <RushmoreCell key={getMediaKey(item.mediaType, `${item.position}-${item.mediaId}`)} item={item} onOpenDetail={onOpenDetail} />
        ) : (
          <View key={getMediaKey('rushmore-empty', i)} style={[styles.cell, styles.cellEmptySlot]} />
        ),
      )}
    </View>
  );
}

interface RushmoreTabsProps {
  activeTab: RushmoreMediaType;
  onChange:  (tab: RushmoreMediaType) => void;
}

const TABS: { key: RushmoreMediaType; label: string }[] = [
  { key: 'movie', label: 'Films' },
  { key: 'tv',    label: 'Series' },
  { key: 'book',  label: 'Books' },
];

export function MountRushmoreTabs({ activeTab, onChange }: RushmoreTabsProps) {
  return (
    <View style={styles.tabRow}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={getMediaKey('rushmore-display-tab', tab.key)}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap:           RS.spacing.xs,
    marginBottom:  RS.spacing.sm,
  },
  tabBtn: {
    borderRadius:      RS.button.radius,
    paddingHorizontal: 14,
    paddingVertical:   7,
    backgroundColor:   RS.colors.elevated,
  },
  tabBtnActive: {
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
    borderColor:     RS.button.primaryBorder,
  },
  tabLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  tabLabelActive: {
    color:      RS.button.primaryText,
    fontWeight: '700',
  },
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    rowGap:         RS.spacing.sm,
  },
  // Slightly smaller than before (48% → 44%) so all four favourites read as
  // a compact grid rather than dominating the screen — aspectRatio 2/3 keeps
  // the correct poster ratio, so height shrinks proportionally with width.
  cell: {
    width:      '44%',
    aspectRatio: 2 / 3,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  cellInner: {
    flex:            1,
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    justifyContent:  'flex-end',
    backgroundColor: RS.colors.card,
  },
  cellEmptySlot: {
    borderRadius:    RS.card.radius,
    borderWidth:     1,
    borderColor:     RS.colors.border,
    borderStyle:     'dashed',
    backgroundColor: 'transparent',
  },
  fallback: {
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  cellFooter: {
    padding: RS.spacing.sm,
    gap:     2,
  },
  cellTitle: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
    lineHeight: 18,
  },
  cellYear: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
});
