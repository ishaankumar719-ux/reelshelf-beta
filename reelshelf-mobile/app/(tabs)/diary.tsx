import { useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { SpoilerBlur } from '@/components/SpoilerBlur';
import { UniversalReviewComposer } from '@/components/UniversalReviewComposer';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { MediaType } from '@/data/seedHomeContent';
import { fetchDiaryEntries, type DiaryListEntry } from '@/lib/supabase/diary';
import { getActivityKey } from '@/utils/listKeys';

type Status = 'loading' | 'success' | 'error';
type SortFilter = 'recent' | 'favourites' | 'highest-rated';
type MediaFilter = 'all' | MediaType;
type VenueFilter = 'all' | 'cinema' | 'home';
type TimeGroup = 'Today' | 'Yesterday' | 'This week' | 'Earlier';
const TIME_GROUPS: TimeGroup[] = ['Today', 'Yesterday', 'This week', 'Earlier'];

// Exact port of the real website's app/diary/page.tsx getTimeGroup() —
// Today/Yesterday/This week/Earlier, not a calendar (confirmed absent from
// the real site — see WEBSITE_DIARY_CALENDAR_TV_BOOK_AUDIT.md §1).
function getTimeGroup(watchedDate: string): TimeGroup {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const date = new Date(watchedDate);
  date.setHours(0, 0, 0, 0);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This week';
  return 'Earlier';
}

function sortByNewest(entries: DiaryListEntry[]): DiaryListEntry[] {
  return [...entries].sort((a, b) => new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime());
}

function sortByHighestRated(entries: DiaryListEntry[]): DiaryListEntry[] {
  return [...entries].sort((a, b) => {
    const left = a.rating ?? -1;
    const right = b.rating ?? -1;
    if (right !== left) return right - left;
    return new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime();
  });
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterPill, active && styles.filterPillActive]} onPress={onPress}>
      <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function DiaryRow({ entry, onEdit }: { entry: DiaryListEntry; onEdit: () => void }) {
  const handlePress = () => {
    router.push(
      `/media/${entry.routeId}?title=${encodeURIComponent(entry.title)}&posterUrl=${encodeURIComponent(entry.poster ?? '')}&mediaType=${entry.mediaType}`
    );
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onEdit();
  };

  // Episode/season-scoped rows must never read as an ordinary show-level
  // log — a clear "S{season}E{episode}" (or "Season {n}") badge next to the
  // title, using the real season_number/episode_number columns. Matches the
  // real website's own scope badges (SeriesReviewPanel.tsx's getScopeBadge()
  // — "S{n} E{n}" / "Season {n}") without duplicating its season/show tabs.
  const scopeBadge =
    entry.reviewScope === 'episode' && entry.seasonNumber != null && entry.episodeNumber != null
      ? `S${entry.seasonNumber}E${entry.episodeNumber}`
      : entry.reviewScope === 'season' && entry.seasonNumber != null
        ? `Season ${entry.seasonNumber}`
        : null;

  return (
    <Pressable style={styles.row} onPress={handlePress}>
      <View style={styles.thumbOuter}>
        {entry.poster ? (
          <Image source={{ uri: entry.poster }} style={styles.thumb} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
      </View>
      <View style={styles.rowMeta}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{entry.title}</Text>
          {scopeBadge && (
            <View style={styles.scopeBadge}>
              <Text style={styles.scopeBadgeLabel}>{scopeBadge}</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.watchedDate}>{entry.watchedDate}</Text>
          {entry.watchedInCinema && (
            <View style={styles.cinemaBadge}>
              <MaterialIcons name="theaters" size={9} color={RS.colors.accent} />
              <Text style={styles.cinemaBadgeLabel}>Cinema</Text>
            </View>
          )}
          {entry.favourite && <MaterialIcons name="favorite" size={11} color="#fb7185" />}
        </View>
        {entry.rating ? <Text style={styles.rating}>Rated {entry.rating.toFixed(1)} / 10</Text> : null}
        {entry.review ? (
          <SpoilerBlur active={entry.containsSpoilers}>
            <Text style={styles.review} numberOfLines={2}>{entry.review}</Text>
          </SpoilerBlur>
        ) : null}
      </View>
      <Pressable style={styles.editBtn} onPress={handleEdit} hitSlop={8}>
        <MaterialIcons name="edit" size={16} color={RS.colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

export default function DiaryScreen() {
  const { user, initializing } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<DiaryListEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<DiaryListEntry | null>(null);

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all');
  const [sortFilter, setSortFilter] = useState<SortFilter>('recent');

  const loadEntries = (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setStatus('loading');
    fetchDiaryEntries(user.id)
      .then((data) => {
        setEntries(data);
        setStatus('success');
      })
      .catch(() => {
        setStatus('error');
      })
      .finally(() => { if (isRefresh) setRefreshing(false); });
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus('loading');
    fetchDiaryEntries(user.id)
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [user]);

  // Exact port of the real website's 3 independent filter rows (media type /
  // venue / sort) — "venue" is watched-in-cinema vs. everything else, not a
  // physical-location concept; confirmed from app/diary/page.tsx's own
  // venueFilter logic, not assumed.
  const filteredEntries = useMemo(() => {
    let base = mediaFilter === 'all' ? entries : entries.filter((e) => e.mediaType === mediaFilter);

    if (venueFilter === 'cinema') {
      base = base.filter((e) => e.mediaType === 'film' && e.watchedInCinema === true);
    } else if (venueFilter === 'home') {
      base = base.filter((e) => !(e.mediaType === 'film' && e.watchedInCinema === true));
    }

    if (sortFilter === 'favourites') {
      return sortByNewest(base.filter((e) => e.favourite));
    }
    if (sortFilter === 'highest-rated') {
      return sortByHighestRated(base);
    }
    return sortByNewest(base);
  }, [entries, mediaFilter, venueFilter, sortFilter]);

  const groupedEntries = useMemo(() => {
    const groups: Record<TimeGroup, DiaryListEntry[]> = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
    for (const entry of filteredEntries) {
      groups[getTimeGroup(entry.watchedDate)].push(entry);
    }
    return groups;
  }, [filteredEntries]);

  if (initializing) {
    return <SafeAreaView style={styles.root} edges={['top']} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <SignInPrompt message="Sign in to see your diary." />
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = entries.length === 0;
  const isFilteredEmpty = !isEmpty && filteredEntries.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.header}>Diary</Text>

      {!isEmpty && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterPill label="All" active={mediaFilter === 'all'} onPress={() => setMediaFilter('all')} />
            <FilterPill label="Films" active={mediaFilter === 'film'} onPress={() => setMediaFilter('film')} />
            <FilterPill label="Series" active={mediaFilter === 'tv'} onPress={() => setMediaFilter('tv')} />
            <FilterPill label="Books" active={mediaFilter === 'book'} onPress={() => setMediaFilter('book')} />
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterPill label="All" active={venueFilter === 'all'} onPress={() => setVenueFilter('all')} />
            <FilterPill label="Cinema" active={venueFilter === 'cinema'} onPress={() => setVenueFilter('cinema')} />
            <FilterPill label="Home" active={venueFilter === 'home'} onPress={() => setVenueFilter('home')} />
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, styles.filterRowLast]}>
            <FilterPill label="Recent" active={sortFilter === 'recent'} onPress={() => setSortFilter('recent')} />
            <FilterPill label="Favourites" active={sortFilter === 'favourites'} onPress={() => setSortFilter('favourites')} />
            <FilterPill label="Highest Rated" active={sortFilter === 'highest-rated'} onPress={() => setSortFilter('highest-rated')} />
          </ScrollView>
        </>
      )}

      {status === 'loading' ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <SkeletonBlock width={56} height={84} radius={8} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock width="70%" height={16} />
                <SkeletonBlock width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : isEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Mark something Watched from Movie Detail to start your diary.</Text>
        </View>
      ) : isFilteredEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No entries match this filter yet.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEntries(true)} tintColor={RS.colors.accent} />}
        >
          {TIME_GROUPS.map((groupLabel) => {
            const groupEntries = groupedEntries[groupLabel];
            if (groupEntries.length === 0) return null;
            return (
              <View key={groupLabel} style={styles.group}>
                <Text style={styles.groupLabel}>
                  {groupLabel} · {groupEntries.length} {groupEntries.length === 1 ? 'entry' : 'entries'}
                </Text>
                {groupEntries.map((entry, i) => (
                  <DiaryRow
                    key={getActivityKey('diary', entry.mediaType, entry.routeId, `${entry.watchedDate}-${entry.reviewScope}-${entry.seasonNumber ?? ''}-${entry.episodeNumber ?? ''}`, i)}
                    entry={entry}
                    onEdit={() => setEditingEntry(entry)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {editingEntry ? (
        <UniversalReviewComposer
          visible
          onClose={() => setEditingEntry(null)}
          onSaved={() => loadEntries()}
          mediaId={editingEntry.routeId}
          mediaType={editingEntry.mediaType}
          title={editingEntry.title}
          posterUrl={editingEntry.poster}
          year={editingEntry.year}
          genres={editingEntry.genres}
          runtime={editingEntry.runtime}
          voteAverage={editingEntry.voteAverage}
          director={editingEntry.director}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: RS.spacing.lg,
  },
  header: {
    fontSize:          RS.typography.display - 8,
    fontWeight:        '700',
    color:             RS.colors.textPrimary,
    letterSpacing:     RS.letterSpacing.tight,
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.sm,
  },
  filterRow: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.xs,
    flexDirection:     'row',
    alignItems:        'center',
    paddingBottom:     RS.spacing.xs,
  },
  filterRowLast: {
    paddingBottom: RS.spacing.sm,
  },
  filterPill: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  filterPillActive: {
    backgroundColor: RS.button.primaryFill,
    borderColor:      RS.button.primaryBorder,
  },
  // Neither hypothesized cause was present: zero `textDecorationLine`
  // anywhere in this file (or app-wide), and FilterPill's JSX has no child
  // View/border element at all — just Pressable > Text, so nothing can sit
  // absolutely-positioned across the middle of it. The reported "line" was
  // real but came from this color value: RS.colors.textSecondary is only
  // 55% opacity, and at fontSize 10 + fontWeight 700 + uppercase + wide
  // letterSpacing (all four active at once, unique to this label among the
  // app's other filter chips), the thin anti-aliased strokes of adjacent
  // bold glyphs visually merge into what reads as a continuous horizontal
  // line — confirmed by the screenshot, where only the low-opacity inactive
  // labels showed it and the full-opacity green active labels didn't.
  // Fixed by raising contrast to RS.colors.textPrimary (92%) — active vs.
  // inactive is still clearly distinguished by hue (green vs. white), this
  // only removes the low-opacity condition that was smearing the glyphs.
  filterLabel: {
    fontSize:   RS.typography.overline,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
  filterLabelActive: {
    color: RS.button.primaryText,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    textAlign: 'center',
  },
  skeletonList: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
  },
  listContent: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.tabBar.contentBottomPad,
  },
  group: {
    marginBottom: RS.spacing.lg,
  },
  groupLabel: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
    marginBottom:  RS.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap:           RS.spacing.sm + 4,
    paddingVertical: RS.spacing.sm + 2,
    alignItems:    'center',
    borderBottomWidth: 0.5,
    borderBottomColor: RS.colors.border,
  },
  thumbOuter: {
    borderRadius: 8,
    overflow:     'hidden',
  },
  thumb: {
    width:  56,
    height: 84,
  },
  thumbFallback: {
    backgroundColor: RS.colors.card,
  },
  rowMeta: {
    flex: 1,
    gap:  2,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  title: {
    flexShrink:    1,
    fontSize:      RS.typography.subheading,
    fontWeight:    '600',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  scopeBadge: {
    borderRadius:      4,
    backgroundColor:   RS.colors.accentGlow,
    paddingHorizontal: 5,
    paddingVertical:   1,
  },
  scopeBadgeLabel: {
    fontSize:      9,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  watchedDate: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
  cinemaBadge: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
    borderRadius:  4,
    backgroundColor: RS.colors.accentGlow,
    paddingHorizontal: 5,
    paddingVertical:   1,
  },
  cinemaBadgeLabel: {
    fontSize:   8,
    fontWeight: '700',
    color:      RS.colors.accent,
    textTransform: 'uppercase',
  },
  rating: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.accent,
    marginTop:  2,
  },
  review: {
    fontSize:   RS.typography.caption + 1,
    color:      RS.colors.textSecondary,
    marginTop:  2,
  },
  editBtn: {
    padding: RS.spacing.xs,
  },
});
