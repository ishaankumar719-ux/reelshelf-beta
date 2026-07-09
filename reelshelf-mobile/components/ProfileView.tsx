import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditProfileModal } from '@/components/EditProfileModal';
import { PosterCard } from '@/components/poster-card';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { SpoilerBlur } from '@/components/SpoilerBlur';
import { Top4Picker } from '@/components/Top4Picker';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchDiaryEntries, type DiaryListEntry } from '@/lib/supabase/diary';
import { fetchUserLists, type UserListSummary } from '@/lib/supabase/lists';
import { fetchTop4, saveTop4, type Top4Item } from '@/lib/supabase/mountRushmore';
import {
  fetchFollowState, fetchProfile, fetchStats, followUser, unfollowUser,
  type ProfileData, type ProfileStats,
} from '@/lib/supabase/profile';
import { fetchMediaTypeTab, fetchReviewsTab, type MediaTypeTabData, type ProfileReviewItem } from '@/lib/supabase/profileMedia';
import { fetchRecentActivity, type ActivityItem } from '@/lib/supabase/recentActivity';

type TabKey = 'overview' | 'movies' | 'tv' | 'books' | 'reviews' | 'lists' | 'diary';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'movies',   label: 'Movies' },
  { key: 'tv',       label: 'TV' },
  { key: 'books',    label: 'Books' },
  { key: 'reviews',  label: 'Reviews' },
  { key: 'lists',    label: 'Lists' },
  { key: 'diary',    label: 'Diary' },
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ACTIVITY_VERB: Record<ActivityItem['kind'], string> = {
  watched:  'Watched',
  rated:    'Rated',
  reviewed: 'Reviewed',
  shelved:  'Added to Shelf',
  listed:   'Added to List',
};

interface ProfileViewProps {
  userId: string;
  /** Stack routes viewing another user pass true so a back button renders. */
  showBackButton?: boolean;
}

export function ProfileView({ userId, showBackButton }: ProfileViewProps) {
  const { user: sessionUser } = useAuth();
  const isOwnProfile = sessionUser?.id === userId;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not_found'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [top4, setTop4] = useState<Top4Item[]>([]);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [top4PickerOpen, setTop4PickerOpen] = useState(false);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityStatus, setActivityStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const [mediaTabs, setMediaTabs] = useState<Record<string, MediaTypeTabData>>({});
  const [reviews, setReviews] = useState<ProfileReviewItem[] | null>(null);
  const [lists, setLists] = useState<UserListSummary[] | null>(null);
  const [diary, setDiary] = useState<DiaryListEntry[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const loadCore = useCallback(async () => {
    setStatus('loading');
    try {
      const profileData = await fetchProfile(userId);
      if (!profileData) {
        setStatus('not_found');
        return;
      }
      setProfile(profileData);
      const [statsData, top4Data] = await Promise.all([
        fetchStats(userId),
        fetchTop4(userId),
      ]);
      setStats(statsData);
      setTop4(top4Data);
      if (!isOwnProfile && sessionUser) {
        setFollowing(await fetchFollowState(sessionUser.id, userId));
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [userId, isOwnProfile, sessionUser]);

  const loadActivity = useCallback(async () => {
    setActivityStatus('loading');
    try {
      setActivity(await fetchRecentActivity(userId));
      setActivityStatus('success');
    } catch {
      setActivityStatus('error');
    }
  }, [userId]);

  useEffect(() => {
    loadCore();
    loadActivity();
  }, [loadCore, loadActivity]);

  // Lazily load whichever tab's data hasn't been fetched yet.
  useEffect(() => {
    if (activeTab === 'overview') return;
    let cancelled = false;

    const run = async () => {
      setTabLoading(true);
      try {
        if ((activeTab === 'movies' || activeTab === 'tv' || activeTab === 'books') && !mediaTabs[activeTab]) {
          const dbType = activeTab === 'movies' ? 'movie' : activeTab === 'tv' ? 'tv' : 'book';
          const data = await fetchMediaTypeTab(userId, dbType);
          if (!cancelled) setMediaTabs((prev) => ({ ...prev, [activeTab]: data }));
        } else if (activeTab === 'reviews' && reviews === null) {
          const data = await fetchReviewsTab(userId);
          if (!cancelled) setReviews(data);
        } else if (activeTab === 'lists' && lists === null) {
          const data = await fetchUserLists(userId);
          if (!cancelled) setLists(data);
        } else if (activeTab === 'diary' && diary === null) {
          const data = await fetchDiaryEntries(userId);
          if (!cancelled) setDiary(data);
        }
      } catch {
        // Per-tab failure — leave that tab's data null so its empty/error state renders; other tabs unaffected.
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMediaTabs({});
    setReviews(null);
    setLists(null);
    setDiary(null);
    await Promise.all([loadCore(), loadActivity()]);
    setRefreshing(false);
  };

  const handleToggleFollow = () => {
    if (!sessionUser) {
      router.push('/login');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !following;
    setFollowing(next);
    const action = next ? followUser(sessionUser.id, userId) : unfollowUser(sessionUser.id, userId);
    action.catch(() => setFollowing(!next));
  };

  const openMediaDetail = (routeId: string, title: string, poster: string | null, mediaType: string) => {
    router.push(`/media/${routeId}?title=${encodeURIComponent(title)}&posterUrl=${encodeURIComponent(poster ?? '')}&mediaType=${mediaType}`);
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loadingWrap}>
          <SkeletonBlock width={88} height={88} radius={44} />
          <SkeletonBlock width={140} height={18} style={{ marginTop: RS.spacing.md }} />
          <SkeletonBlock width={100} height={14} style={{ marginTop: RS.spacing.xs }} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'not_found') {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        {showBackButton && (
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
          </Pressable>
        )}
        <View style={styles.centered}>
          <Text style={styles.emptyText}>This profile isn&apos;t available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error' || !profile || !stats) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Couldn&apos;t load this profile.</Text>
          <Pressable style={styles.retryBtn} onPress={loadCore}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initial = (profile.displayName || profile.username || '?')[0]?.toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={showBackButton ? ['top'] : ['top', 'bottom']}>
      {showBackButton && (
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={RS.colors.accent} />}
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.avatarOuter}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{profile.displayName || profile.username || 'ReelShelf Member'}</Text>
          {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <Text style={styles.joined}>Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>

          {isOwnProfile ? (
            <Pressable style={styles.editBtn} onPress={() => setEditOpen(true)}>
              <Text style={styles.editLabel}>Edit Profile</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.editBtn, following && styles.followingBtn]} onPress={handleToggleFollow}>
              <Text style={[styles.editLabel, following && styles.followingLabel]}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
          )}
        </View>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          {([
            ['Movies', stats.moviesWatched], ['TV', stats.tvWatched], ['Books', stats.booksRead],
            ['Reviews', stats.reviews], ['Lists', stats.lists], ['Followers', stats.followers], ['Following', stats.following],
          ] as const).map(([label, value]) => (
            <View key={label} style={styles.statTile}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Top 4 ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top 4</Text>
            {isOwnProfile && (
              <Pressable onPress={() => setTop4PickerOpen(true)}>
                <Text style={styles.editSmallLabel}>Edit</Text>
              </Pressable>
            )}
          </View>
          {top4.length === 0 ? (
            <Text style={styles.emptyInlineText}>Not set yet.</Text>
          ) : (
            <View style={styles.top4Row}>
              {top4.map((item) => (
                <View key={item.position} style={styles.top4Item}>
                  {item.posterPath ? (
                    <Image source={{ uri: item.posterPath }} style={styles.top4Poster} contentFit="cover" />
                  ) : (
                    <View style={[styles.top4Poster, styles.top4PosterFallback]} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Tab strip ────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Tab content ──────────────────────────────────────────────── */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            activityStatus === 'loading' ? (
              <ActivityIndicator color={RS.colors.accent} />
            ) : activity.length === 0 ? (
              <Text style={styles.emptyInlineText}>No activity yet.</Text>
            ) : (
              activity.map((item, i) => (
                <Pressable
                  key={i}
                  style={styles.activityRow}
                  onPress={item.routeId ? () => openMediaDetail(item.routeId!, item.title, item.poster, item.mediaType ?? 'film') : undefined}
                >
                  {item.poster ? (
                    <Image source={{ uri: item.poster }} style={styles.activityThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.activityThumb, styles.activityThumbFallback]} />
                  )}
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityVerb}>{ACTIVITY_VERB[item.kind]}{item.detail ? ` · ${item.detail}` : ''}</Text>
                    <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                  <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>
                </Pressable>
              ))
            )
          )}

          {(activeTab === 'movies' || activeTab === 'tv' || activeTab === 'books') && (
            tabLoading && !mediaTabs[activeTab] ? (
              <ActivityIndicator color={RS.colors.accent} />
            ) : (
              <>
                <Text style={styles.subheading}>Watched</Text>
                {(mediaTabs[activeTab]?.watched.length ?? 0) === 0 ? (
                  <Text style={styles.emptyInlineText}>Nothing logged yet.</Text>
                ) : (
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={mediaTabs[activeTab]!.watched}
                    keyExtractor={(item) => item.routeId}
                    contentContainerStyle={styles.posterRow}
                    renderItem={({ item }) => (
                      <PosterCard title={item.title} year={item.year} mediaType={item.mediaType as any} posterUrl={item.poster}
                        onPress={() => openMediaDetail(item.routeId, item.title, item.poster, item.mediaType)} />
                    )}
                  />
                )}
                <Text style={styles.subheading}>Shelf</Text>
                {(mediaTabs[activeTab]?.shelf.length ?? 0) === 0 ? (
                  <Text style={styles.emptyInlineText}>Nothing on the shelf yet.</Text>
                ) : (
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={mediaTabs[activeTab]!.shelf}
                    keyExtractor={(item) => item.routeId}
                    contentContainerStyle={styles.posterRow}
                    renderItem={({ item }) => (
                      <PosterCard title={item.title} year={item.year} mediaType={item.mediaType as any} posterUrl={item.poster}
                        onPress={() => openMediaDetail(item.routeId, item.title, item.poster, item.mediaType)} />
                    )}
                  />
                )}
              </>
            )
          )}

          {activeTab === 'reviews' && (
            tabLoading && reviews === null ? (
              <ActivityIndicator color={RS.colors.accent} />
            ) : (reviews?.length ?? 0) === 0 ? (
              <Text style={styles.emptyInlineText}>No reviews yet.</Text>
            ) : (
              reviews!.map((r) => (
                <Pressable key={r.routeId} style={styles.reviewCard} onPress={() => openMediaDetail(r.routeId, r.title, r.poster, r.mediaType)}>
                  <Text style={styles.reviewTitle}>{r.title}</Text>
                  {r.rating ? <Text style={styles.reviewRating}>{r.rating.toFixed(1)} / 10</Text> : null}
                  <SpoilerBlur active={r.containsSpoilers}>
                    <Text style={styles.reviewText} numberOfLines={3}>{r.review}</Text>
                  </SpoilerBlur>
                </Pressable>
              ))
            )
          )}

          {activeTab === 'lists' && (
            tabLoading && lists === null ? (
              <ActivityIndicator color={RS.colors.accent} />
            ) : (lists?.length ?? 0) === 0 ? (
              <Text style={styles.emptyInlineText}>No lists yet.</Text>
            ) : (
              lists!.map((l) => (
                <Pressable key={l.id} style={styles.listCard} onPress={() => router.push(`/list/${l.id}`)}>
                  <Text style={styles.listTitle}>{l.title}</Text>
                  <Text style={styles.listCount}>{l.itemCount} {l.itemCount === 1 ? 'title' : 'titles'}</Text>
                </Pressable>
              ))
            )
          )}

          {activeTab === 'diary' && (
            tabLoading && diary === null ? (
              <ActivityIndicator color={RS.colors.accent} />
            ) : (diary?.length ?? 0) === 0 ? (
              <Text style={styles.emptyInlineText}>No diary entries yet.</Text>
            ) : (
              diary!.map((entry) => (
                <Pressable key={entry.routeId + entry.watchedDate} style={styles.diaryRow} onPress={() => openMediaDetail(entry.routeId, entry.title, entry.poster, entry.mediaType)}>
                  {entry.poster ? (
                    <Image source={{ uri: entry.poster }} style={styles.activityThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.activityThumb, styles.activityThumbFallback]} />
                  )}
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityTitle} numberOfLines={1}>{entry.title}</Text>
                    <Text style={styles.activityTime}>{entry.watchedDate}</Text>
                  </View>
                </Pressable>
              ))
            )
          )}
        </View>
      </ScrollView>

      {isOwnProfile && (
        <>
          <EditProfileModal
            visible={editOpen}
            onClose={() => setEditOpen(false)}
            onSaved={loadCore}
            profile={profile}
          />
          <Top4Picker
            visible={top4PickerOpen}
            onClose={() => setTop4PickerOpen(false)}
            initial={top4}
            onSave={async (items) => {
              await saveTop4(userId, items);
              setTop4(items);
              setTop4PickerOpen(false);
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

// Logged-out wrapper used by the tab screen only (viewing another profile
// while logged out still works — RLS just restricts what that profile shows).
export function LoggedOutProfilePrompt() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.centered}>
        <SignInPrompt message="Create your ReelShelf profile — sign in or sign up to get started." />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  emptyInlineText: { fontSize: RS.typography.body, color: RS.colors.textMuted, fontStyle: 'italic', paddingVertical: RS.spacing.xs },
  retryBtn: { marginTop: RS.spacing.md, borderRadius: RS.button.radius, backgroundColor: RS.button.filledBg, paddingHorizontal: RS.button.paddingH, paddingVertical: RS.button.paddingV },
  retryLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.button.filledText },
  backBtn: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs },
  scrollContent: { paddingBottom: RS.tabBar.contentBottomPad },
  hero: { alignItems: 'center', gap: 4, paddingHorizontal: RS.spacing.lg, paddingTop: RS.spacing.sm },
  avatarOuter: { marginBottom: RS.spacing.sm },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: RS.colors.textMuted },
  displayName: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: RS.letterSpacing.tight },
  username: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  bio: { fontSize: RS.typography.body, color: RS.colors.textSecondary, textAlign: 'center', marginTop: RS.spacing.xs, lineHeight: 20 },
  joined: { fontSize: RS.typography.overline, color: RS.colors.textMuted, marginTop: 2 },
  editBtn: { marginTop: RS.spacing.md, borderRadius: RS.button.radius, borderWidth: 1, borderColor: RS.button.secondaryBorder, paddingHorizontal: RS.spacing.lg, paddingVertical: RS.spacing.sm + 2 },
  followingBtn: { borderColor: RS.button.primaryBorder, backgroundColor: RS.button.primaryFill },
  editLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  followingLabel: { color: RS.button.primaryText },
  statsRow: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm, paddingVertical: RS.spacing.lg },
  statTile: { alignItems: 'center', borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, paddingVertical: RS.spacing.sm + 2, paddingHorizontal: RS.spacing.md, minWidth: 76 },
  statValue: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary },
  statLabel: { fontSize: RS.typography.overline, fontWeight: '600', color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginTop: 2 },
  section: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm, marginBottom: RS.spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  editSmallLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.accent },
  top4Row: { flexDirection: 'row', gap: RS.spacing.sm },
  top4Item: { flex: 1 },
  top4Poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: RS.card.radius },
  top4PosterFallback: { backgroundColor: RS.colors.elevated },
  tabStrip: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.xs + 2, paddingBottom: RS.spacing.sm },
  tabChip: { borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: RS.colors.elevated },
  tabChipActive: { borderColor: RS.button.primaryBorder, backgroundColor: RS.button.primaryFill, borderWidth: 1 },
  tabLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  tabLabelActive: { color: RS.button.primaryText },
  tabContent: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm, minHeight: 120 },
  subheading: { fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginTop: RS.spacing.sm },
  posterRow: { gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
  activityThumb: { width: 44, height: 66, borderRadius: 6 },
  activityThumbFallback: { backgroundColor: RS.colors.elevated },
  activityMeta: { flex: 1, gap: 2 },
  activityVerb: { fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.accent, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide },
  activityTitle: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  activityTime: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  diaryRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
  reviewCard: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, padding: RS.spacing.md, gap: 4, marginBottom: RS.spacing.sm },
  reviewTitle: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  reviewRating: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.accent },
  reviewText: { fontSize: RS.typography.caption + 1, color: RS.colors.textSecondary, marginTop: 4 },
  listCard: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, padding: RS.spacing.md, gap: 2, marginBottom: RS.spacing.sm },
  listTitle: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  listCount: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
});
