// Exact port of the real website's components/activity/ActivityCard.tsx's
// per-type rendering: type badge/verb config, action-line copy, cinema
// suffix, batch ("N films") card, poster/avatar fallbacks, and the
// diary-only like/comment gating. See activityFeed.ts's header comment for
// the 3 confirmed, explained deviations (list_created included, spoiler-blur
// added, book navigation added).
//
// Tap targets match the real card precisely rather than wrapping the whole
// row in one Pressable: avatar/name → profile, title/poster → media (or
// list/rushmore-owner's profile) — the rest of the row (rating, review,
// timestamp) isn't tappable, same as the real site's <Link>-scoped clicks.
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SpoilerBlur } from '@/components/SpoilerBlur';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { ActivityEvent, ActivityType } from '@/lib/supabase/activityFeed';
import {
  createDiaryEntryComment,
  getCommentsForEntry,
  toggleDiaryEntryLike,
  type ActivityComment,
} from '@/lib/supabase/activitySocial';

// ── type config — exact real TYPE_CONFIG labels/verbs ──────────────────────
const TYPE_CONFIG: Record<ActivityType, { label: string; verb: string; dotColor: string }> = {
  logged:              { label: 'Watched',   verb: 'watched',            dotColor: 'rgba(120,150,255,0.9)' },
  reviewed:            { label: 'Reviewed',  verb: 'reviewed',           dotColor: 'rgba(250,199,117,0.85)' },
  watchlisted:         { label: 'Saved',     verb: 'saved to watchlist', dotColor: 'rgba(60,200,140,0.85)' },
  finished_series:     { label: 'Finished',  verb: 'finished',           dotColor: 'rgba(190,140,255,0.85)' },
  watched_episode:     { label: 'Watched',   verb: 'watched',            dotColor: 'rgba(190,140,255,0.85)' },
  added_favourite:     { label: 'Favourite', verb: 'favourited',         dotColor: 'rgba(255,90,90,0.85)' },
  rushmore:            { label: 'Rushmore',  verb: 'updated',            dotColor: 'rgba(255,150,80,0.85)' },
  challenge_completed: { label: 'Challenge', verb: 'completed',          dotColor: 'rgba(255,215,0,0.85)' },
  list_created:        { label: 'List',      verb: 'created a list',     dotColor: 'rgba(99,102,241,0.85)' },
};

// Inverse of mediaActions.toDbMediaId/toDbMediaType (lib/supabase/diary.ts's
// own toRouteId, replicated here rather than exported from an unrelated
// file) — reconstructs the mobile route id from a DB media_id.
function toRouteId(mediaType: ActivityEvent['mediaType'], mediaId: string): string {
  const prefix = mediaType === 'film' ? 'film' : mediaType === 'tv' ? 'tv' : 'book';
  const bareId = mediaId.startsWith('tmdb-') ? mediaId.slice(5) : mediaId;
  return `${prefix}-${bareId}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

// ── avatar ───────────────────────────────────────────────────────────────
function Avatar({ url, name, onPress }: { url: string | null; name: string; onPress: () => void }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {url && !broken ? (
        <Image source={{ uri: url }} style={styles.avatarImg} contentFit="cover" onError={() => setBroken(true)} />
      ) : (
        <View style={[styles.avatarImg, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      )}
    </Pressable>
  );
}

function SmallAvatar({ url, name }: { url: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();
  return url && !broken ? (
    <Image source={{ uri: url }} style={styles.commentAvatarImg} contentFit="cover" onError={() => setBroken(true)} />
  ) : (
    <View style={[styles.commentAvatarImg, styles.avatarFallback]}>
      <Text style={styles.commentAvatarInitial}>{initial}</Text>
    </View>
  );
}

// ── poster thumbnail ─────────────────────────────────────────────────────
function PosterThumb({ event, onPress }: { event: ActivityEvent; onPress: (() => void) | null }) {
  const [broken, setBroken] = useState(false);
  const inner = event.poster && !broken ? (
    <Image source={{ uri: event.poster }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setBroken(true)} />
  ) : (
    <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
      <Text style={styles.posterFallbackLetter}>{event.title.charAt(0).toUpperCase()}</Text>
    </View>
  );
  if (!onPress) return <View style={styles.posterShell}>{inner}</View>;
  return (
    <Pressable style={styles.posterShell} onPress={onPress}>
      {inner}
    </Pressable>
  );
}

// ── comment panel ────────────────────────────────────────────────────────
function CommentPanel({ diaryEntryId, onCommentAdded }: { diaryEntryId: string; onCommentAdded: () => void }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ActivityComment[] | null>(null);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCommentsForEntry(diaryEntryId).then((data) => { if (!cancelled) setComments(data); });
    return () => { cancelled = true; };
  }, [diaryEntryId]);

  const canSubmit = body.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setError(null);
    const result = await createDiaryEntryComment({ diaryEntryId, body, currentUserId: user.id });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.comment) {
      setComments((prev) => [...(prev ?? []), result.comment!]);
      setBody('');
      onCommentAdded();
    }
  };

  return (
    <View style={styles.commentPanel}>
      {comments === null ? (
        <Text style={styles.commentMeta}>Loading…</Text>
      ) : comments.length === 0 ? (
        <Text style={styles.commentEmpty}>No comments yet — be the first.</Text>
      ) : (
        comments.map((c) => (
          <View key={c.id} style={styles.commentRow}>
            <SmallAvatar url={c.avatarUrl} name={c.displayName ?? c.username ?? 'Someone'} />
            <View style={styles.commentBody}>
              <View style={styles.commentHeaderRow}>
                <Text style={styles.commentName}>{c.displayName ?? c.username ?? 'Someone'}</Text>
                <Text style={styles.commentMeta}>{timeAgo(c.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{c.body}</Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.commentComposerRow}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Add a comment…"
          placeholderTextColor={RS.colors.textMuted}
          style={styles.commentInput}
          multiline
        />
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          style={[styles.commentPostBtn, !canSubmit && styles.commentPostBtnDisabled]}
        >
          <Text style={[styles.commentPostLabel, !canSubmit && styles.commentPostLabelDisabled]}>
            {submitting ? '…' : 'Post'}
          </Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.commentError}>{error}</Text> : null}
    </View>
  );
}

function AttachmentImage({ url, isGif }: { url: string; isGif: boolean }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <View style={styles.attachmentWrap}>
      {isGif && (
        <View style={styles.gifBadge}>
          <Text style={styles.gifBadgeLabel}>GIF</Text>
        </View>
      )}
      <Image source={{ uri: url }} style={styles.attachmentImg} contentFit="cover" onError={() => setBroken(true)} />
    </View>
  );
}

// ── main card ────────────────────────────────────────────────────────────
interface ActivityCardProps {
  event:                ActivityEvent;
  initialLikeCount?:    number;
  initialCommentCount?: number;
  initialHasLiked?:     boolean;
}

export function ActivityCard({ event, initialLikeCount = 0, initialCommentCount = 0, initialHasLiked = false }: ActivityCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialHasLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const cfg = TYPE_CONFIG[event.type];
  const name = event.profile.displayName ?? event.profile.username ?? 'ReelShelf Member';
  const isDiaryEvent = Boolean(event.diaryEntryId);
  const isBatchLogging = event.isBatch && (event.batchCount ?? 0) >= 4;
  const isRushmore = event.type === 'rushmore';
  const isListCreated = event.type === 'list_created';

  const openProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/profile/${event.userId}`);
  };

  const openMedia = () => {
    if (!event.mediaId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const routeId = toRouteId(event.mediaType, event.mediaId);
    router.push(`/media/${routeId}?title=${encodeURIComponent(event.title)}&posterUrl=${encodeURIComponent(event.poster ?? '')}&mediaType=${event.mediaType}`);
  };

  const openList = () => {
    if (!event.listId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/list/${event.listId}`);
  };

  // Rushmore has no title-shaped destination of its own — the avatar/name
  // link (always → profile) already covers "see whose Rushmore this is."
  const titlePress = isRushmore ? undefined : isListCreated ? openList : event.mediaId ? openMedia : undefined;

  const handleLike = async () => {
    if (!event.diaryEntryId || !user) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await toggleDiaryEntryLike(event.diaryEntryId, !next, user.id);
    if (result.error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  function renderActionLine() {
    if (isRushmore) {
      return <Text style={styles.actionMuted}>updated their Mount Rushmore</Text>;
    }
    if (isBatchLogging) {
      return (
        <Text style={styles.actionMuted}>
          {cfg.verb} <Text style={styles.actionStrong}>{event.batchCount} films</Text>
        </Text>
      );
    }
    return (
      <Text style={styles.actionMuted}>
        {cfg.verb}{' '}
        {titlePress ? (
          <Text style={styles.actionLink} onPress={titlePress}>{event.title}</Text>
        ) : (
          <Text style={styles.actionStrong}>{event.title}</Text>
        )}
        {event.watchedInCinema && event.mediaType === 'film' ? ' at the cinema' : ''}
        {event.rating != null ? (
          <Text style={styles.ratingText}>
            {'  '}{event.rating.toFixed(1)}<Text style={styles.ratingMax}>/10</Text>
          </Text>
        ) : null}
      </Text>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.mainRow}>
        <View style={styles.avatarCol}>
          <Avatar url={event.profile.avatarUrl} name={name} onPress={openProfile} />
          <View style={[styles.typeDot, { backgroundColor: cfg.dotColor }]} />
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.name} onPress={openProfile}>{name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{cfg.label}</Text>
            </View>
            <Text style={styles.timestamp}>{timeAgo(event.timestamp)}</Text>
          </View>

          {renderActionLine()}

          {event.review && !event.isBatch ? (
            <SpoilerBlur active={event.containsSpoilers}>
              <Text style={styles.reviewText} numberOfLines={3}>{event.review}</Text>
            </SpoilerBlur>
          ) : null}

          {event.attachmentUrl && !event.isBatch ? (
            <AttachmentImage url={event.attachmentUrl} isGif={event.attachmentType === 'gif'} />
          ) : null}

          {isDiaryEvent ? (
            <View style={styles.interactionRow}>
              <Pressable onPress={() => void handleLike()} style={styles.interactionBtn} hitSlop={6}>
                <MaterialIcons name={liked ? 'favorite' : 'favorite-border'} size={15} color={liked ? '#ff5a5a' : RS.colors.textMuted} />
                <Text style={[styles.interactionLabel, liked && styles.interactionLabelActive]}>
                  {likeCount > 0 ? likeCount : 'Like'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setCommentsOpen((o) => !o)} style={styles.interactionBtn} hitSlop={6}>
                <MaterialIcons name="chat-bubble-outline" size={14} color={commentsOpen ? RS.colors.textSecondary : RS.colors.textMuted} />
                <Text style={[styles.interactionLabel, commentsOpen && styles.interactionLabelActive]}>
                  {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {commentsOpen && event.diaryEntryId ? (
            <CommentPanel diaryEntryId={event.diaryEntryId} onCommentAdded={() => setCommentCount((c) => c + 1)} />
          ) : null}
        </View>

        {isRushmore ? null : isBatchLogging ? (
          <View style={styles.batchThumb}>
            <Text style={styles.batchThumbLabel}>×{event.batchCount}</Text>
          </View>
        ) : isListCreated ? (
          <Pressable style={styles.posterShell} onPress={openList}>
            <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
              <MaterialIcons name="format-list-bulleted" size={20} color={RS.colors.textMuted} />
            </View>
          </Pressable>
        ) : (
          <PosterThumb event={event} onPress={event.mediaId ? openMedia : null} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:    RS.card.radius,
    padding:         RS.spacing.sm + 2,
    backgroundColor: RS.colors.card,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           RS.spacing.sm,
  },
  avatarCol: {
    position: 'relative',
  },
  avatarImg: {
    width:        36,
    height:       36,
    borderRadius: 18,
  },
  avatarFallback: {
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: {
    fontSize:   14,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
  typeDot: {
    position:     'absolute',
    bottom:       -1,
    right:        -1,
    width:        11,
    height:       11,
    borderRadius: 6,
    borderWidth:  2,
    borderColor:  RS.colors.card,
  },
  content: {
    flex: 1,
    gap:  4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    flexWrap:      'wrap',
  },
  name: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
  badge: {
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 6,
    paddingVertical:   1,
    backgroundColor:   RS.colors.elevated,
  },
  badgeLabel: {
    fontSize:      RS.typography.micro,
    fontWeight:    '700',
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
    color:         RS.colors.textSecondary,
  },
  timestamp: {
    fontSize:   RS.typography.micro,
    color:      RS.colors.textMuted,
    marginLeft: 'auto',
  },
  actionMuted: {
    fontSize:   RS.typography.caption,
    color:      RS.colors.textSecondary,
    lineHeight: 17,
  },
  actionStrong: {
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  actionLink: {
    fontWeight: '500',
    color:      RS.colors.textPrimary,
  },
  ratingText: {
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  ratingMax: {
    color:      RS.colors.textMuted,
    fontWeight: '400',
  },
  reviewText: {
    marginTop:       4,
    fontSize:        RS.typography.caption,
    fontStyle:       'italic',
    color:           RS.colors.textSecondary,
    lineHeight:      17,
    borderLeftWidth: 2,
    borderLeftColor: RS.colors.border,
    paddingLeft:     8,
  },
  attachmentWrap: {
    marginTop:       8,
    borderRadius:    8,
    overflow:        'hidden',
    height:          140,
    backgroundColor: RS.colors.elevated,
  },
  attachmentImg: {
    width:  '100%',
    height: '100%',
  },
  gifBadge: {
    position:          'absolute',
    top:               6,
    left:              6,
    zIndex:            2,
    backgroundColor:   'rgba(0,0,0,0.55)',
    borderRadius:      4,
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  gifBadgeLabel: {
    fontSize: RS.typography.micro,
    color:    'rgba(255,255,255,0.85)',
  },
  interactionRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           16,
    marginTop:     6,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  interactionLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '500',
    color:      RS.colors.textMuted,
  },
  interactionLabelActive: {
    color: RS.colors.textSecondary,
  },
  posterShell: {
    width:           52,
    height:          78,
    borderRadius:    8,
    overflow:        'hidden',
    backgroundColor: RS.colors.elevated,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
  },
  posterFallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  posterFallbackLetter: {
    fontSize:   16,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  batchThumb: {
    width:           52,
    height:          78,
    borderRadius:    8,
    backgroundColor: RS.colors.elevated,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  batchThumbLabel: {
    fontSize:   14,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  commentPanel: {
    marginTop:      8,
    paddingTop:     8,
    borderTopWidth: 0.5,
    borderTopColor: RS.colors.border,
    gap:            8,
  },
  commentMeta: {
    fontSize: RS.typography.micro,
    color:    RS.colors.textMuted,
  },
  commentEmpty: {
    fontSize:  RS.typography.caption,
    color:     RS.colors.textMuted,
    fontStyle: 'italic',
  },
  commentRow: {
    flexDirection: 'row',
    gap:           8,
    alignItems:    'flex-start',
  },
  commentAvatarImg: {
    width:        26,
    height:       26,
    borderRadius: 13,
  },
  commentAvatarInitial: {
    fontSize:   10,
    fontWeight: '700',
    color:      RS.colors.textPrimary,
  },
  commentBody: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           6,
  },
  commentName: {
    fontSize:   RS.typography.micro,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  commentText: {
    marginTop:  2,
    fontSize:   RS.typography.caption,
    color:      RS.colors.textSecondary,
    lineHeight: 16,
  },
  commentComposerRow: {
    flexDirection: 'row',
    gap:           8,
    alignItems:    'flex-end',
  },
  commentInput: {
    flex:              1,
    borderRadius:      10,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm,
    paddingVertical:   8,
    fontSize:          RS.typography.caption,
    color:             RS.colors.textPrimary,
    maxHeight:         80,
  },
  commentPostBtn: {
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingHorizontal: 14,
    paddingVertical:   9,
  },
  commentPostBtnDisabled: {
    backgroundColor: RS.colors.elevated,
  },
  commentPostLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.button.filledText,
  },
  commentPostLabelDisabled: {
    color: RS.colors.textMuted,
  },
  commentError: {
    fontSize: RS.typography.micro,
    color:    '#ff8080',
  },
});
