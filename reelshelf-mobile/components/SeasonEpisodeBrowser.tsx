// Real episode-level diary logging — the real website's app/series/[id]/page.tsx
// already has this (SeasonBrowser.tsx + SeriesReviewPanel.tsx), confirmed via
// audit (WEBSITE_DIARY_CALENDAR_TV_BOOK_AUDIT.md §2): the SAVE logic was
// already correctly aligned on mobile (Universal Review Composer already
// accepted reviewScope/showId/seasonNumber/episodeNumber props, just with no
// screen that passed them yet) — this is that missing UI entry point.
// Deliberately minimal per scope: episode number, name, air date only — no
// synopses/stills/runtime, no full TV-detail redesign.
import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UniversalReviewComposer } from '@/components/UniversalReviewComposer';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTmdbSeasonEpisodes, type TmdbEpisodeSummary, type TmdbSeasonSummary } from '@/lib/tmdb';
import { fetchUserEpisodeEntries, type EpisodeLogEntry } from '@/lib/supabase/episodeLog';
import { getMediaKey } from '@/utils/listKeys';

interface SeasonEpisodeBrowserProps {
  /** Bare TMDB numeric id (e.g. "76479"), NOT the "tv-76479" route id —
   *  passed straight through as both mediaId and showId on save so episode
   *  rows land on the exact same media_id convention real website-created
   *  episode rows already use (confirmed against real production data: both
   *  existing real episode entries have bare-numeric media_id/show_id, not
   *  "tmdb-"-prefixed — toDbMediaId() only adds that prefix for a route-id
   *  shaped input like "tv-76479", so passing the bare id here sidesteps it
   *  cleanly without touching that shared function). */
  tvId:         string;
  seriesTitle:  string;
  seriesYear:   number;
  posterUrl:    string | null;
  creator:      string | null;
  genres:       string[];
  seasons:      TmdbSeasonSummary[];
}

export function SeasonEpisodeBrowser({ tvId, seriesTitle, seriesYear, posterUrl, creator, genres, seasons }: SeasonEpisodeBrowserProps) {
  const { user } = useAuth();
  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0]?.seasonNumber ?? 1);
  const [episodes, setEpisodes] = useState<TmdbEpisodeSummary[]>([]);
  const [episodesStatus, setEpisodesStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [loggedMap, setLoggedMap] = useState<Map<string, EpisodeLogEntry>>(new Map());
  const [composerTarget, setComposerTarget] = useState<TmdbEpisodeSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEpisodesStatus('loading');
    fetchTmdbSeasonEpisodes(tvId, selectedSeason)
      .then((data) => { if (!cancelled) { setEpisodes(data); setEpisodesStatus('success'); } })
      .catch(() => { if (!cancelled) setEpisodesStatus('error'); });
    return () => { cancelled = true; };
  }, [tvId, selectedSeason]);

  const loadLoggedMap = useCallback(() => {
    if (!user) { setLoggedMap(new Map()); return; }
    fetchUserEpisodeEntries(user.id, tvId).then(setLoggedMap).catch(() => {});
  }, [user, tvId]);

  useEffect(() => { loadLoggedMap(); }, [loadLoggedMap]);

  if (seasons.length === 0) return null;

  const openEpisode = (ep: TmdbEpisodeSummary) => {
    if (!user) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      router.push('/login');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setComposerTarget(ep);
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonRow}>
        {seasons.map((s) => {
          const active = s.seasonNumber === selectedSeason;
          return (
            <Pressable
              key={getMediaKey('season', s.seasonNumber)}
              style={[styles.seasonPill, active && styles.seasonPillActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setSelectedSeason(s.seasonNumber);
              }}
            >
              <Text style={[styles.seasonPillLabel, active && styles.seasonPillLabelActive]}>
                Season {s.seasonNumber}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {episodesStatus === 'loading' ? (
        <ActivityIndicator color={RS.colors.accent} style={styles.loader} />
      ) : episodesStatus === 'error' ? (
        <Text style={styles.errorText}>Couldn&apos;t load episodes for this season.</Text>
      ) : (
        <View style={styles.episodeList}>
          {episodes.map((ep) => {
            const logged = loggedMap.get(`${selectedSeason}:${ep.episodeNumber}`);
            return (
              <Pressable
                key={getMediaKey('episode', `${selectedSeason}-${ep.episodeNumber}`)}
                style={styles.episodeRow}
                onPress={() => openEpisode(ep)}
              >
                <View style={styles.episodeMeta}>
                  <View style={styles.episodeTitleRow}>
                    <Text style={styles.episodeNumber}>E{ep.episodeNumber}</Text>
                    {logged && (
                      <View style={styles.loggedBadge}>
                        <Text style={styles.loggedBadgeLabel}>
                          {logged.rating != null ? `${logged.rating.toFixed(1)} / 10` : 'Logged'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.episodeName} numberOfLines={1}>{ep.name}</Text>
                  {ep.airDate ? <Text style={styles.episodeDate}>{ep.airDate}</Text> : null}
                </View>
                <Text style={styles.logAction}>{logged ? 'Edit' : '+ Log'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {composerTarget && (
        <UniversalReviewComposer
          visible
          onClose={() => setComposerTarget(null)}
          onSaved={() => loadLoggedMap()}
          mediaId={tvId}
          mediaType="tv"
          reviewScope="episode"
          showId={tvId}
          seasonNumber={selectedSeason}
          episodeNumber={composerTarget.episodeNumber}
          title={`${seriesTitle} · S${selectedSeason}E${composerTarget.episodeNumber} — ${composerTarget.name}`}
          posterUrl={posterUrl}
          year={composerTarget.airDate ? Number(composerTarget.airDate.slice(0, 4)) : seriesYear}
          genres={genres}
          director={creator}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: RS.spacing.sm,
  },
  seasonRow: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.xs,
    flexDirection:     'row',
  },
  seasonPill: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: 12,
    paddingVertical:   7,
  },
  seasonPillActive: {
    backgroundColor: RS.button.primaryFill,
    borderColor:      RS.button.primaryBorder,
  },
  seasonPillLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.colors.textSecondary,
  },
  seasonPillLabelActive: {
    color: RS.button.primaryText,
  },
  loader: {
    marginVertical: RS.spacing.md,
  },
  errorText: {
    paddingHorizontal: RS.spacing.md,
    fontSize:          RS.typography.body,
    color:             RS.colors.textMuted,
    fontStyle:         'italic',
  },
  episodeList: {
    paddingHorizontal: RS.spacing.md,
  },
  episodeRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               RS.spacing.sm,
    paddingVertical:   RS.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: RS.colors.border,
  },
  episodeMeta: {
    flex: 1,
    gap:  1,
  },
  episodeTitleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  episodeNumber: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  loggedBadge: {
    borderRadius:      4,
    backgroundColor:   RS.colors.accentGlow,
    paddingHorizontal: 6,
    paddingVertical:   1,
  },
  loggedBadgeLabel: {
    fontSize:   9,
    fontWeight: '700',
    color:      RS.colors.accent,
  },
  episodeName: {
    fontSize:   RS.typography.body,
    fontWeight: '500',
    color:      RS.colors.textPrimary,
  },
  episodeDate: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
  },
  logAction: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
});
