import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedRef, useScrollViewOffset } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { EditProfileModal } from '@/components/EditProfileModal';
import { FollowListModal } from '@/components/FollowListModal';
import { PosterCard } from '@/components/poster-card';
import { AchievementsRow } from '@/components/profile/AchievementsRow';
import { ActivityCard } from '@/components/profile/ActivityCard';
import { CurrentlyEnjoyingShelf } from '@/components/profile/CurrentlyEnjoyingShelf';
import { GlassTabStrip } from '@/components/profile/GlassTabStrip';
import { ListCoverCollage } from '@/components/lists/ListCoverCollage';
import { ListEditorModal } from '@/components/lists/ListEditorModal';
import { MountRushmoreEditor } from '@/components/profile/MountRushmoreEditor';
import { MountRushmoreGrid, MountRushmoreTabs } from '@/components/profile/MountRushmoreGrid';
import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonBlock } from '@/components/Skeleton';
import { SpoilerBlur } from '@/components/SpoilerBlur';
import { RS } from '@/constants/theme';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { useAuth } from '@/contexts/AuthContext';
import { mediaDetails } from '@/data/mediaDetails';
import { fetchEarnedBadges, type EarnedBadge } from '@/lib/supabase/badges';
import { fetchCurrentlyEnjoying, type CurrentlyEnjoyingData } from '@/lib/supabase/currentlyEnjoying';
import { fetchDiaryEntries, type DiaryListEntry } from '@/lib/supabase/diary';
import { createList, fetchUserLists, type ListEditFields, type UserListSummary } from '@/lib/supabase/lists';
import {
  fetchMountRushmore, type MountRushmoreSlot, type RushmoreMediaType,
} from '@/lib/supabase/mountRushmore';
import {
  fetchFollowState, fetchProfile, fetchStats, followUser, unfollowUser,
  type ProfileData, type ProfileStats,
} from '@/lib/supabase/profile';
import { fetchMediaTypeTab, fetchReviewsTab, type MediaTypeTabData, type ProfileReviewItem } from '@/lib/supabase/profileMedia';
import { fetchRecentActivity, type ActivityItem } from '@/lib/supabase/recentActivity';
import { getActivityKey, getMediaKey } from '@/utils/listKeys';

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

/** Mirrors the toRouteId helper duplicated in every lib/supabase/*.ts file —
 *  mount_rushmore stores media_type/media_id in DB format. */
function toRouteId(dbMediaType: string, dbMediaId: string): string {
  const prefix = dbMediaType === 'movie' ? 'film' : dbMediaType;
  const bareId = dbMediaId.startsWith('tmdb-') ? dbMediaId.slice(5) : dbMediaId;
  return `${prefix}-${bareId}`;
}

function monthLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const RUSHMORE_EMPTY_MESSAGE: Record<RushmoreMediaType, string> = {
  movie: 'Build your top 4 films',
  tv:    'Build your top 4 series',
  book:  'Build your top 4 books',
};

interface ProfileViewProps {
  userId: string;
  /** Stack routes viewing another user pass true so a back button renders. */
  showBackButton?: boolean;
}

export function ProfileView({ userId, showBackButton }: ProfileViewProps) {
  const { user: sessionUser } = useAuth();
  const isOwnProfile = sessionUser?.id === userId;
  // ?edit=1 auto-opens the Edit Profile modal — used by Settings > Edit Profile,
  // which has no dedicated route of its own to link to (EditProfileModal is a
  // modal owned by this screen, not a separate screen).
  const params = useLocalSearchParams<{ edit?: string }>();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not_found'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [rushmoreSlots, setRushmoreSlots] = useState<MountRushmoreSlot[]>([]);
  const [rushmoreActiveTab, setRushmoreActiveTab] = useState<RushmoreMediaType>('movie');
  const [rushmoreEditorOpen, setRushmoreEditorOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editOpen, setEditOpen] = useState(params.edit === '1');
  const [listEditorOpen, setListEditorOpen] = useState(false);
  const [followListMode, setFollowListMode] = useState<'followers' | 'following' | null>(null);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityStatus, setActivityStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const [badges, setBadges] = useState<EarnedBadge[] | null>(null);
  const [badgesStatus, setBadgesStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const [enjoying, setEnjoying] = useState<CurrentlyEnjoyingData | null>(null);
  const [enjoyingStatus, setEnjoyingStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const [mediaTabs, setMediaTabs] = useState<Record<string, MediaTypeTabData>>({});
  const [reviews, setReviews] = useState<ProfileReviewItem[] | null>(null);
  const [lists, setLists] = useState<UserListSummary[] | null>(null);
  const [diary, setDiary] = useState<DiaryListEntry[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollViewOffset(scrollRef);

  // Atmosphere colors sourced from Mount Rushmore's own posters — same
  // dominant-color-extraction data source Movie Detail already uses
  // (data/mediaDetails.ts, generated at build time via node-vibrant against
  // real TMDB backdrops). No runtime color extraction is added for the
  // avatar: no such library exists in this app and adding one would be a new
  // native dependency (out of scope). Falls back to AtmosphereContext's
  // existing default when no Rushmore pick has precomputed colors (common
  // for real user picks outside the curated seed set).
  const atmosphereColors = useMemo(() => {
    for (const item of rushmoreSlots) {
      const routeId = toRouteId(item.mediaType, item.mediaId);
      const colors = mediaDetails[routeId]?.dominantColors;
      if (colors && colors.length > 0) return colors;
    }
    return undefined;
  }, [rushmoreSlots]);

  const loadCore = useCallback(async () => {
    setStatus('loading');
    try {
      const profileData = await fetchProfile(userId);
      if (!profileData) {
        setStatus('not_found');
        return;
      }
      setProfile(profileData);
      const [statsData, rushmoreData] = await Promise.all([
        fetchStats(userId),
        fetchMountRushmore(userId),
      ]);
      setStats(statsData);
      setRushmoreSlots(rushmoreData);
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

  const loadBadges = useCallback(async () => {
    setBadgesStatus('loading');
    try {
      setBadges(await fetchEarnedBadges(userId));
      setBadgesStatus('success');
    } catch {
      setBadgesStatus('error');
    }
  }, [userId]);

  const loadEnjoying = useCallback(async () => {
    setEnjoyingStatus('loading');
    try {
      setEnjoying(await fetchCurrentlyEnjoying(userId));
      setEnjoyingStatus('success');
    } catch {
      setEnjoyingStatus('error');
    }
  }, [userId]);

  useEffect(() => {
    loadCore();
    loadActivity();
    loadBadges();
    loadEnjoying();
  }, [loadCore, loadActivity, loadBadges, loadEnjoying]);

  // Lazily load whichever tab's data hasn't been fetched yet. Overview also
  // needs `reviews` (Reviews section), `lists` (Lists preview), and `diary`
  // (Recently Watched + Diary preview) — same fetch functions the Reviews/
  // Lists/Diary tabs use, just triggered together and cached in the same
  // state so switching to those tabs afterward is instant.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setTabLoading(true);
      try {
        const tasks: Promise<void>[] = [];
        if ((activeTab === 'movies' || activeTab === 'tv' || activeTab === 'books') && !mediaTabs[activeTab]) {
          const dbType = activeTab === 'movies' ? 'movie' : activeTab === 'tv' ? 'tv' : 'book';
          tasks.push(fetchMediaTypeTab(userId, dbType).then((data) => {
            if (!cancelled) setMediaTabs((prev) => ({ ...prev, [activeTab]: data }));
          }));
        }
        if ((activeTab === 'reviews' || activeTab === 'overview') && reviews === null) {
          tasks.push(fetchReviewsTab(userId).then((data) => { if (!cancelled) setReviews(data); }));
        }
        if ((activeTab === 'lists' || activeTab === 'overview') && lists === null) {
          tasks.push(fetchUserLists(userId, isOwnProfile).then((data) => { if (!cancelled) setLists(data); }));
        }
        if ((activeTab === 'diary' || activeTab === 'overview') && diary === null) {
          tasks.push(fetchDiaryEntries(userId).then((data) => { if (!cancelled) setDiary(data); }));
        }
        await Promise.all(tasks);
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
    await Promise.all([loadCore(), loadActivity(), loadBadges(), loadEnjoying()]);
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

  const handleCreateList = async (fields: ListEditFields) => {
    if (!sessionUser) return;
    const newId = await createList(sessionUser.id, fields);
    fetchUserLists(userId, isOwnProfile).then(setLists).catch(() => {});
    router.push(`/list/${newId}`);
  };

  const renderReviewCard = (r: ProfileReviewItem, i: number) => (
    <Pressable key={getMediaKey(r.mediaType, `${r.routeId}-${i}`)} style={styles.reviewCard} onPress={() => openMediaDetail(r.routeId, r.title, r.poster, r.mediaType)}>
      <View style={styles.reviewHeaderRow}>
        {r.poster ? (
          <Image source={{ uri: r.poster }} style={styles.reviewPoster} contentFit="cover" />
        ) : (
          <View style={[styles.reviewPoster, styles.activityThumbFallback]} />
        )}
        <View style={styles.reviewHeaderMeta}>
          <Text style={styles.reviewTitle} numberOfLines={1}>{r.title}</Text>
          <View style={styles.reviewMetaRow}>
            {r.rating ? <Text style={styles.reviewRating}>{r.rating.toFixed(1)} / 10</Text> : null}
            <Text style={styles.reviewDate}>{new Date(`${r.watchedDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
            {r.watchedInCinema && (
              <View style={styles.cinemaBadge}>
                <MaterialIcons name="theaters" size={10} color={RS.colors.accent} />
                <Text style={styles.cinemaBadgeLabel}>Cinema</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <SpoilerBlur active={r.containsSpoilers}>
        <Text style={styles.reviewText} numberOfLines={3}>{r.review}</Text>
      </SpoilerBlur>
      {r.layerRatings.length > 0 && (
        <View style={styles.layerChipRow}>
          {r.layerRatings.map((l) => (
            <View key={getMediaKey('layer', l.label)} style={styles.layerChip}>
              <Text style={styles.layerChipLabel}>{l.label} {l.value.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      )}
      {r.attachmentUrl && (
        <View>
          <Image source={{ uri: r.attachmentUrl }} style={styles.attachmentPreview} contentFit="cover" />
          {r.attachmentType === 'gif' && (
            <View style={styles.gifBadge}>
              <Text style={styles.gifBadgeLabel}>GIF</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );

  if (status === 'loading') {
    return (
      <AtmosphereProvider initialBaseColors={atmosphereColors}>
        <View style={styles.screen}>
          <AmbientAtmosphere scrollY={scrollY} />
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.loadingWrap}>
              <SkeletonBlock width={96} height={96} radius={48} />
              <SkeletonBlock width={140} height={18} style={{ marginTop: RS.spacing.md }} />
              <SkeletonBlock width={100} height={14} style={{ marginTop: RS.spacing.xs }} />
            </View>
          </SafeAreaView>
        </View>
      </AtmosphereProvider>
    );
  }

  if (status === 'not_found') {
    return (
      <AtmosphereProvider initialBaseColors={atmosphereColors}>
        <View style={styles.screen}>
          <AmbientAtmosphere scrollY={scrollY} />
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            {showBackButton && (
              <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
                <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
              </Pressable>
            )}
            <View style={styles.centered}>
              <Text style={styles.emptyText}>This profile isn&apos;t available.</Text>
            </View>
          </SafeAreaView>
        </View>
      </AtmosphereProvider>
    );
  }

  if (status === 'error' || !profile || !stats) {
    return (
      <AtmosphereProvider initialBaseColors={atmosphereColors}>
        <View style={styles.screen}>
          <AmbientAtmosphere scrollY={scrollY} />
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Couldn&apos;t load this profile.</Text>
              <Pressable style={styles.retryBtn} onPress={loadCore}>
                <Text style={styles.retryLabel}>Retry</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </AtmosphereProvider>
    );
  }

  const initial = (profile.displayName || profile.username || '?')[0]?.toUpperCase();
  const diaryGroups = (diary ?? []).reduce<{ month: string; entries: DiaryListEntry[] }[]>((groups, entry) => {
    const label = monthLabel(entry.watchedDate);
    const last = groups[groups.length - 1];
    if (last && last.month === label) last.entries.push(entry);
    else groups.push({ month: label, entries: [entry] });
    return groups;
  }, []);

  // "Recently watched" (WEBSITE_PROFILE_AUDIT.md §5) — a horizontal poster
  // row distinct from the Recent Activity timeline below it. Reuses the
  // exact same already-fetched `diary` data (fetchDiaryEntries, already
  // ordered watched_date desc) — no new query, just filtered to entries
  // with a poster, same as the website's own `poster IS NOT NULL` filter.
  const recentlyWatched = (diary ?? []).filter((e) => e.poster).slice(0, 15);
  const rushmoreTabSlots = rushmoreSlots.filter((s) => s.mediaType === rushmoreActiveTab);

  return (
    <AtmosphereProvider initialBaseColors={atmosphereColors}>
      <View style={styles.screen}>
        <AmbientAtmosphere scrollY={scrollY} />

        <SafeAreaView style={styles.safeArea} edges={showBackButton ? ['top'] : ['top', 'bottom']}>
          {showBackButton && (
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
              <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
            </Pressable>
          )}
          {isOwnProfile && (
            <Pressable style={styles.settingsBtn} onPress={() => router.push('/settings')} hitSlop={8}>
              <MaterialIcons name="settings" size={22} color={RS.colors.textPrimary} />
            </Pressable>
          )}

          <Animated.ScrollView
            ref={scrollRef}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={RS.colors.accent} />}
          >
            {/* ── Atmospheric Hero (compact) ───────────────────────────── */}
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
              {profile.websiteUrl ? (
                <Pressable onPress={() => Linking.openURL(profile.websiteUrl!).catch(() => {})}>
                  <Text style={styles.websiteLink}>{profile.websiteUrl}</Text>
                </Pressable>
              ) : null}
              <Text style={styles.joined}>Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>

              {/* ── Followers/Following — single compact row, lives ONLY here now (removed from Stats) ── */}
              <View style={styles.followRow}>
                <Pressable
                  style={styles.followRowItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setFollowListMode('followers');
                  }}
                >
                  <Text style={styles.followRowText}>
                    <Text style={styles.followRowValue}>{stats.followers}</Text> Followers
                  </Text>
                </Pressable>
                <Text style={styles.followRowDivider}>·</Text>
                <Pressable
                  style={styles.followRowItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setFollowListMode('following');
                  }}
                >
                  <Text style={styles.followRowText}>
                    <Text style={styles.followRowValue}>{stats.following}</Text> Following
                  </Text>
                </Pressable>
              </View>

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

            {/* ── Glass segmented tab strip ────────────────────────────── */}
            <GlassTabStrip tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            {/* ── Tab content ───────────────────────────────────────────── */}
            <View style={styles.tabContent}>
              {activeTab === 'overview' && (
                <View style={styles.overviewGap}>
                  {/* Reordered per the section-priority pass: Mount Rushmore
                      leads (the primary visual identity section), followed
                      by activity-shaped content (Currently Enjoying →
                      Recently Watched → Recent Reviews → Recent Activity),
                      then the quieter self-descriptive blocks (Stats →
                      Achievements → Favourite Genres), then Lists/Diary
                      previews last. Followers/Following now live only in the
                      Hero — removed from Stats to avoid duplication. */}

                  {/* ── Mount Rushmore — 3 independent per-media-type sets (Films/Series/Books) ── */}
                  <View style={styles.overviewSubsection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Mount Rushmore</Text>
                      {isOwnProfile && (
                        <Pressable onPress={() => setRushmoreEditorOpen(true)}>
                          <Text style={styles.editSmallLabel}>Edit</Text>
                        </Pressable>
                      )}
                    </View>
                    <MountRushmoreTabs activeTab={rushmoreActiveTab} onChange={setRushmoreActiveTab} />
                    {rushmoreTabSlots.length === 0 ? (
                      <Text style={styles.emptyInlineText}>{RUSHMORE_EMPTY_MESSAGE[rushmoreActiveTab]}</Text>
                    ) : (
                      <MountRushmoreGrid slots={rushmoreTabSlots} onOpenDetail={openMediaDetail} />
                    )}
                  </View>

                  {enjoyingStatus === 'loading' ? (
                    <ActivityIndicator color={RS.colors.accent} />
                  ) : enjoying ? (
                    <CurrentlyEnjoyingShelf data={enjoying} onOpenDetail={openMediaDetail} />
                  ) : null}

                  {/* ── Recently Watched — horizontal poster row, distinct from Recent Activity below ── */}
                  <View style={styles.overviewSubsection}>
                    <Text style={styles.subheading}>Recently Watched</Text>
                    {recentlyWatched.length === 0 ? (
                      <Text style={styles.emptyInlineText}>Nothing logged yet.</Text>
                    ) : (
                      <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={recentlyWatched}
                        keyExtractor={(item, i) => getActivityKey('recently-watched', item.mediaType, item.routeId, item.watchedDate, i)}
                        contentContainerStyle={styles.posterRow}
                        renderItem={({ item }) => (
                          <View>
                            <PosterCard title={item.title} year={item.year} mediaType={item.mediaType as any} posterUrl={item.poster}
                              onPress={() => openMediaDetail(item.routeId, item.title, item.poster, item.mediaType)} />
                            {typeof item.rating === 'number' && (
                              <View style={styles.ratingPill}>
                                <Text style={styles.ratingPillText}>{item.rating.toFixed(1)}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      />
                    )}
                  </View>

                  {(reviews?.length ?? 0) > 0 && (
                    <View style={styles.overviewSubsection}>
                      <Text style={styles.subheading}>Recent Reviews</Text>
                      {reviews!.slice(0, 3).map(renderReviewCard)}
                    </View>
                  )}

                  <View style={styles.overviewSubsection}>
                    <Text style={styles.subheading}>Recent Activity</Text>
                    {activityStatus === 'loading' ? (
                      <ActivityIndicator color={RS.colors.accent} />
                    ) : activity.length === 0 ? (
                      <Text style={styles.emptyInlineText}>No activity yet.</Text>
                    ) : (
                      <View style={styles.activityList}>
                        {activity.map((item, i) => (
                          <ActivityCard
                            key={getActivityKey(item.kind, item.mediaType, item.routeId ?? item.title, item.timestamp, i)}
                            kind={item.kind}
                            verbLabel={ACTIVITY_VERB[item.kind]}
                            detail={item.detail}
                            title={item.title}
                            poster={item.poster}
                            timeLabel={timeAgo(item.timestamp)}
                            onPress={item.routeId ? () => openMediaDetail(item.routeId!, item.title, item.poster, item.mediaType ?? 'film') : undefined}
                          />
                        ))}
                      </View>
                    )}
                  </View>

                  {/* ── Stats — de-emphasized: quieter type, no border, visually secondary to Mount Rushmore above. Followers/Following removed (now Hero-only). ── */}
                  <View style={styles.overviewSubsection}>
                    <Text style={styles.subheading}>Stats</Text>
                    <View style={styles.statsStrip}>
                      {([
                        ['Movies', stats.moviesWatched], ['TV', stats.tvWatched], ['Books', stats.booksRead],
                        ['Reviews', stats.reviews], ['Lists', stats.lists],
                      ] as const).map(([label, value]) => (
                        <View key={getMediaKey('stat', label)} style={styles.statTile}>
                          <Text style={styles.statValue}>{value}</Text>
                          <Text style={styles.statLabel}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* ── Achievements — 3-4 card preview + View All ── */}
                  <View style={styles.overviewSubsection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.subheading}>Achievements</Text>
                      {(badges?.length ?? 0) > 0 && (
                        <Pressable onPress={() => router.push(`/achievements/${userId}`)}>
                          <Text style={styles.editSmallLabel}>View All</Text>
                        </Pressable>
                      )}
                    </View>
                    <AchievementsRow badges={badges} loading={badgesStatus === 'loading'} limit={4} />
                  </View>

                  {profile.favouriteGenres.length > 0 && (
                    <View style={styles.overviewSubsection}>
                      <Text style={styles.subheading}>Favourite Genres</Text>
                      <View style={styles.genreChipRow}>
                        {profile.favouriteGenres.map((genre) => (
                          <View key={getMediaKey('genre', genre)} style={styles.genreChip}>
                            <Text style={styles.genreChipLabel}>{genre}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* ── Lists preview — a taste of the full Lists tab ────────── */}
                  <View style={styles.overviewSubsection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.subheading}>Lists</Text>
                      {(lists?.length ?? 0) > 0 && (
                        <Pressable onPress={() => setActiveTab('lists')}>
                          <Text style={styles.editSmallLabel}>See All</Text>
                        </Pressable>
                      )}
                    </View>
                    {(lists?.length ?? 0) === 0 ? (
                      <Text style={styles.emptyInlineText}>No lists yet.</Text>
                    ) : (
                      lists!.slice(0, 2).map((l) => (
                        <Pressable key={getMediaKey('list', l.id)} style={styles.listCard} onPress={() => router.push(`/list/${l.id}`)}>
                          <View style={styles.listCollage}>
                            <ListCoverCollage items={l.previewPosters.map((url, i) => ({ url, alt: `${l.title} cover ${i + 1}` }))} />
                          </View>
                          <View style={styles.listMeta}>
                            <Text style={styles.listTitle}>{l.title}</Text>
                            <View style={styles.listMetaRow}>
                              <Text style={styles.listCount}>{l.itemCount} {l.itemCount === 1 ? 'title' : 'titles'}</Text>
                              {l.likeCount > 0 && <Text style={styles.listLikeCount}>♡ {l.likeCount}</Text>}
                            </View>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>

                  {/* ── Diary preview — a taste of the full Diary tab ────────── */}
                  <View style={styles.overviewSubsection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.subheading}>Diary</Text>
                      {(diary?.length ?? 0) > 0 && (
                        <Pressable onPress={() => setActiveTab('diary')}>
                          <Text style={styles.editSmallLabel}>See All</Text>
                        </Pressable>
                      )}
                    </View>
                    {(diary?.length ?? 0) === 0 ? (
                      <Text style={styles.emptyInlineText}>No diary entries yet.</Text>
                    ) : (
                      diary!.slice(0, 3).map((entry, i) => (
                        <Pressable key={getActivityKey('diary-preview', entry.mediaType, entry.routeId, entry.watchedDate, i)} style={styles.diaryRow} onPress={() => openMediaDetail(entry.routeId, entry.title, entry.poster, entry.mediaType)}>
                          {entry.poster ? (
                            <Image source={{ uri: entry.poster }} style={styles.activityThumb} contentFit="cover" />
                          ) : (
                            <View style={[styles.activityThumb, styles.activityThumbFallback]} />
                          )}
                          <View style={styles.activityMeta}>
                            <Text style={styles.activityTitle} numberOfLines={1}>{entry.title}</Text>
                            <Text style={styles.activityTime}>{new Date(`${entry.watchedDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
                          </View>
                          {typeof entry.rating === 'number' && (
                            <Text style={styles.diaryRating}>{entry.rating.toFixed(1)}</Text>
                          )}
                        </Pressable>
                      ))
                    )}
                  </View>
                </View>
              )}

              {(activeTab === 'movies' || activeTab === 'tv' || activeTab === 'books') && (
                tabLoading && !mediaTabs[activeTab] ? (
                  <ActivityIndicator color={RS.colors.accent} />
                ) : (() => {
                  const data = mediaTabs[activeTab];
                  const watched = data?.watched ?? [];
                  // TV/Books reuse the exact honest-proxy filter as the
                  // Overview's Currently Enjoying shelf: a shelf item counts
                  // as "in progress" only until a completed diary log exists
                  // for the same title — Movies has no in-progress concept
                  // (binary watched/not-watched), so its shelf is shown as-is.
                  const watchedIds = new Set(watched.map((w) => w.routeId));
                  const shelfRaw = data?.shelf ?? [];
                  const shelf = activeTab === 'movies' ? shelfRaw : shelfRaw.filter((s) => !watchedIds.has(s.routeId));

                  const watchedLabel = activeTab === 'books' ? 'Finished' : activeTab === 'tv' ? 'Completed' : 'Watched';
                  const shelfLabel = activeTab === 'books' ? 'On Your Shelf' : activeTab === 'tv' ? 'Continue Watching' : 'Shelf';
                  const shelfEmpty = activeTab === 'books' ? 'Nothing on your shelf yet.' : activeTab === 'tv' ? 'Nothing to continue right now.' : 'Nothing on the shelf yet.';

                  return (
                    <>
                      <Text style={styles.subheading}>{watchedLabel}</Text>
                      {watched.length === 0 ? (
                        <Text style={styles.emptyInlineText}>Nothing logged yet.</Text>
                      ) : (
                        <FlatList
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          data={watched}
                          keyExtractor={(item, i) => getMediaKey(item.mediaType, `${item.routeId}-${i}`)}
                          contentContainerStyle={styles.posterRow}
                          renderItem={({ item }) => (
                            <View>
                              <PosterCard title={item.title} year={item.year} mediaType={item.mediaType as any} posterUrl={item.poster}
                                onPress={() => openMediaDetail(item.routeId, item.title, item.poster, item.mediaType)} />
                              {typeof item.rating === 'number' && (
                                <View style={styles.ratingPill}>
                                  <Text style={styles.ratingPillText}>{item.rating.toFixed(1)}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        />
                      )}
                      <Text style={styles.subheading}>{shelfLabel}</Text>
                      {shelf.length === 0 ? (
                        <Text style={styles.emptyInlineText}>{shelfEmpty}</Text>
                      ) : (
                        <FlatList
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          data={shelf}
                          keyExtractor={(item, i) => getMediaKey(item.mediaType, `${item.routeId}-${i}`)}
                          contentContainerStyle={styles.posterRow}
                          renderItem={({ item }) => (
                            <PosterCard title={item.title} year={item.year} mediaType={item.mediaType as any} posterUrl={item.poster}
                              onPress={() => openMediaDetail(item.routeId, item.title, item.poster, item.mediaType)} />
                          )}
                        />
                      )}
                      {activeTab === 'tv' && (
                        <Text style={styles.tvNote}>
                          &quot;Continue Watching&quot; reflects what&apos;s on your watchlist and not yet logged finished — there&apos;s no per-episode progress data in the schema, so this is a shelf-based signal, not live playback position.
                        </Text>
                      )}
                      {activeTab === 'books' && (
                        <Text style={styles.tvNote}>
                          &quot;On Your Shelf&quot; combines currently-reading and want-to-read — the schema has no status column to tell them apart yet.
                        </Text>
                      )}
                    </>
                  );
                })()
              )}

              {activeTab === 'reviews' && (
                tabLoading && reviews === null ? (
                  <ActivityIndicator color={RS.colors.accent} />
                ) : (reviews?.length ?? 0) === 0 ? (
                  <Text style={styles.emptyInlineText}>No reviews yet.</Text>
                ) : (
                  reviews!.map(renderReviewCard)
                )
              )}

              {activeTab === 'lists' && (
                tabLoading && lists === null ? (
                  <ActivityIndicator color={RS.colors.accent} />
                ) : (lists?.length ?? 0) === 0 ? (
                  <View style={styles.listsEmptyWrap}>
                    <Text style={styles.emptyInlineText}>No lists yet.</Text>
                    {isOwnProfile && (
                      <Pressable
                        style={styles.createListBtn}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setListEditorOpen(true);
                        }}
                      >
                        <Text style={styles.createListLabel}>Create List</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  lists!.map((l) => (
                    <Pressable key={getMediaKey('list', l.id)} style={styles.listCard} onPress={() => router.push(`/list/${l.id}`)}>
                      <View style={styles.listCollage}>
                        <ListCoverCollage items={l.previewPosters.map((url, i) => ({ url, alt: `${l.title} cover ${i + 1}` }))} />
                      </View>
                      <View style={styles.listMeta}>
                        <Text style={styles.listTitle}>{l.title}</Text>
                        <Text style={styles.listCount}>{l.itemCount} {l.itemCount === 1 ? 'title' : 'titles'}</Text>
                      </View>
                    </Pressable>
                  ))
                )
              )}

              {activeTab === 'diary' && (
                tabLoading && diary === null ? (
                  <ActivityIndicator color={RS.colors.accent} />
                ) : diaryGroups.length === 0 ? (
                  <Text style={styles.emptyInlineText}>No diary entries yet.</Text>
                ) : (
                  diaryGroups.map((group) => (
                    <View key={getMediaKey('diary-month', group.month)} style={styles.diaryMonthGroup}>
                      <Text style={styles.diaryMonthLabel}>{group.month}</Text>
                      {group.entries.map((entry, i) => (
                        <Pressable key={getActivityKey('diary', entry.mediaType, entry.routeId, entry.watchedDate, i)} style={styles.diaryRow} onPress={() => openMediaDetail(entry.routeId, entry.title, entry.poster, entry.mediaType)}>
                          {entry.poster ? (
                            <Image source={{ uri: entry.poster }} style={styles.activityThumb} contentFit="cover" />
                          ) : (
                            <View style={[styles.activityThumb, styles.activityThumbFallback]} />
                          )}
                          <View style={styles.activityMeta}>
                            <Text style={styles.activityTitle} numberOfLines={1}>{entry.title}</Text>
                            <Text style={styles.activityTime}>{new Date(`${entry.watchedDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
                          </View>
                          {typeof entry.rating === 'number' && (
                            <Text style={styles.diaryRating}>{entry.rating.toFixed(1)}</Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  ))
                )
              )}
            </View>
          </Animated.ScrollView>
        </SafeAreaView>
      </View>

      {isOwnProfile && (
        <>
          <EditProfileModal
            visible={editOpen}
            onClose={() => setEditOpen(false)}
            onSaved={loadCore}
            profile={profile}
          />
          <MountRushmoreEditor
            visible={rushmoreEditorOpen}
            onClose={() => setRushmoreEditorOpen(false)}
            initialSlots={rushmoreSlots}
            userId={userId}
            onSaved={(allSlots) => setRushmoreSlots(allSlots)}
          />
          <ListEditorModal
            visible={listEditorOpen}
            onClose={() => setListEditorOpen(false)}
            onSave={handleCreateList}
          />
        </>
      )}

      {followListMode && (
        <FollowListModal
          visible
          mode={followListMode}
          userId={userId}
          onClose={() => setFollowListMode(null)}
        />
      )}
    </AtmosphereProvider>
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
  screen: { flex: 1, backgroundColor: RS.colors.base },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RS.spacing.lg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center' },
  emptyInlineText: { fontSize: RS.typography.body, color: RS.colors.textMuted, fontStyle: 'italic', paddingVertical: RS.spacing.xs },
  retryBtn: { marginTop: RS.spacing.md, borderRadius: RS.button.radius, backgroundColor: RS.button.filledBg, paddingHorizontal: RS.button.paddingH, paddingVertical: RS.button.paddingV },
  retryLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.button.filledText },
  backBtn: { paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs },
  settingsBtn: { position: 'absolute', top: RS.spacing.sm, right: RS.spacing.md, zIndex: 10, padding: RS.spacing.xs },
  scrollContent: { paddingBottom: RS.tabBar.contentBottomPad },
  // Compacted hero: smaller avatar (88px, matches the website's own size),
  // tighter top/bottom padding — Followers/Following now lives here as one
  // compact row (moved out of Stats, which no longer duplicates it).
  hero: { alignItems: 'center', gap: 4, paddingHorizontal: RS.spacing.lg, paddingTop: RS.spacing.md, paddingBottom: RS.spacing.sm },
  avatarOuter: {
    marginBottom: RS.spacing.xs,
    shadowColor: RS.shadow.color, shadowOffset: { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity, shadowRadius: RS.shadow.radius, elevation: RS.shadow.android,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)' },
  avatarFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: RS.colors.textMuted },
  displayName: { fontSize: RS.typography.heading + 2, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: RS.letterSpacing.tight },
  username: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  bio: { fontSize: RS.typography.body, color: RS.colors.textSecondary, textAlign: 'center', marginTop: RS.spacing.xs, lineHeight: 20 },
  websiteLink: { fontSize: RS.typography.caption, color: RS.colors.accent, marginTop: RS.spacing.xs },
  joined: { fontSize: RS.typography.overline, color: RS.colors.textMuted, marginTop: 2 },
  followRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.xs + 2, marginTop: RS.spacing.xs + 2 },
  followRowItem: { paddingVertical: 2 },
  followRowText: { fontSize: RS.typography.caption, color: RS.colors.textSecondary },
  followRowValue: { fontWeight: '700', color: RS.colors.textPrimary },
  followRowDivider: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
  editBtn: { marginTop: RS.spacing.sm, borderRadius: RS.button.radius, borderWidth: 1, borderColor: RS.button.secondaryBorder, paddingHorizontal: RS.spacing.lg, paddingVertical: RS.spacing.sm + 2 },
  followingBtn: { borderColor: RS.button.primaryBorder, backgroundColor: RS.button.primaryFill },
  editLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  followingLabel: { color: RS.button.primaryText },
  tabContent: { paddingHorizontal: RS.spacing.md, gap: RS.spacing.sm, minHeight: 120, marginTop: RS.spacing.md },
  // Increased major-section breathing room: RS.spacing.lg (24) → RS.spacing.xl
  // (40) — the existing scale already had a large-enough token, so nothing
  // new was added to it.
  overviewGap: { gap: RS.spacing.xl },
  // Was RS.spacing.xs (4) — bumped to sm (8) for more breathing room between
  // each section's title and its content, applies uniformly whether the
  // title is a bare <Text> or a sectionHeaderRow (title + "See All"/"Edit").
  overviewSubsection: { gap: RS.spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  editSmallLabel: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.accent },
  subheading: { fontSize: RS.typography.overline, fontWeight: '700', color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginTop: RS.spacing.sm },
  posterRow: { gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
  ratingPill: {
    position: 'absolute', top: RS.spacing.xs, right: RS.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: RS.button.radius,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingPillText: { fontSize: 10, fontWeight: '700', color: RS.colors.textPrimary },
  activityList: { gap: RS.spacing.xs },
  activityThumb: { width: 44, height: 66, borderRadius: 6 },
  activityThumbFallback: { backgroundColor: RS.colors.elevated },
  activityMeta: { flex: 1, gap: 2 },
  activityTitle: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  activityTime: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  diaryMonthGroup: { gap: RS.spacing.xs, marginBottom: RS.spacing.sm },
  diaryMonthLabel: {
    fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginBottom: 2,
  },
  diaryRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingVertical: RS.spacing.xs },
  diaryRating: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.accent },
  reviewCard: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, padding: RS.spacing.md, gap: RS.spacing.xs, marginBottom: RS.spacing.sm },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm },
  reviewPoster: { width: 40, height: 60, borderRadius: 6 },
  reviewHeaderMeta: { flex: 1, gap: 2 },
  reviewTitle: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  reviewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  reviewRating: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.accent },
  reviewDate: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  cinemaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 4, backgroundColor: RS.colors.accentGlow, paddingHorizontal: 6, paddingVertical: 2 },
  cinemaBadgeLabel: { fontSize: 9, fontWeight: '700', color: RS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.3 },
  reviewText: { fontSize: RS.typography.caption + 1, color: RS.colors.textSecondary },
  layerChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  layerChip: { borderRadius: RS.button.radius, backgroundColor: RS.colors.elevated, paddingHorizontal: 8, paddingVertical: 3 },
  layerChipLabel: { fontSize: 10, fontWeight: '600', color: RS.colors.textSecondary },
  attachmentPreview: { width: '100%', height: 140, borderRadius: RS.card.radius - 4, marginTop: 4 },
  gifBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2 },
  gifBadgeLabel: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  listCard: { flexDirection: 'row', gap: RS.spacing.sm, borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.card, padding: RS.spacing.sm, marginBottom: RS.spacing.sm },
  listCollage: { width: 84, height: 84, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' },
  listCollageCell: { width: '50%', height: '50%' },
  listMeta: { flex: 1, justifyContent: 'center', gap: 2 },
  listTitle: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  listMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listCount: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  listLikeCount: { fontSize: RS.typography.overline, fontWeight: '600', color: 'rgba(248,113,113,0.75)' },
  genreChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: RS.spacing.xs + 2 },
  genreChip: { borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: 12, paddingVertical: 6 },
  genreChipLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  tvNote: { fontSize: RS.typography.overline, color: RS.colors.textMuted, fontStyle: 'italic', marginTop: RS.spacing.sm, lineHeight: 15 },
  listsEmptyWrap: { alignItems: 'center', gap: RS.spacing.sm, paddingVertical: RS.spacing.sm },
  createListBtn: { borderRadius: RS.button.radius, backgroundColor: RS.button.filledBg, paddingHorizontal: RS.button.paddingH, paddingVertical: RS.button.paddingV },
  createListLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.button.filledText },
  // Stats — moved below the activity sections, deliberately the quietest
  // block on the screen: no card chrome, smaller/lighter value type than
  // before, tonal (not bordered) strip background so it reads as visually
  // secondary to Mount Rushmore. Followers/Following removed — Hero-only now.
  statsStrip: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    borderRadius: RS.card.radius, backgroundColor: RS.colors.elevated,
    paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.sm,
    gap: RS.spacing.sm,
  },
  statTile: { alignItems: 'center', minWidth: 56 },
  statValue: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  statLabel: { fontSize: 9, fontWeight: '600', color: RS.colors.textMuted, textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginTop: 1 },
});
