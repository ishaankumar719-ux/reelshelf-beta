import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { Avatar, GroupGlyph } from '@/components/messaging/Avatars';
import { GifPickerSheet } from '@/components/messaging/GifPickerSheet';
import { GifView, PhotoView, PhotoViewer, VideoPlayerModal, VideoThumb } from '@/components/messaging/MessageMedia';
import { TitleCard } from '@/components/messaging/TitleCard';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  CAPTION_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  blockUser,
  buildThread,
  conversationName,
  discardMediaUpload,
  fetchMessages,
  firstUnreadSeq,
  getConversation,
  getGifAttachment,
  getMediaAttachment,
  getTitleAttachment,
  leaveGroup,
  listMembers,
  markRead,
  mediaPaths,
  mergeMessages,
  messageTime,
  newClientId,
  removeMember,
  reportMessage,
  respondToInvite,
  sendGif,
  sendMedia,
  sendMessage,
  shareTitle,
  subscribeToConversation,
  unblockUser,
  type ChatMessage,
  type ConversationMember,
  type ConversationSummary,
  type GifPick,
  type ReportReason,
  type ThreadItem,
} from '@/lib/messaging/api';
import { mediaSource, pickMedia, uploadFile, useAccessToken, type PickedMedia } from '@/lib/messaging/media';
import { supabase } from '@/lib/supabase/client';

type LocalMessage = ChatMessage & {
  state: 'sent' | 'sending' | 'failed';
  /** A photo or video still being sent from this phone. */
  pending?: PickedMedia & { caption: string | null; progress: 'uploading' | 'posting' };
};
let pendingSeq = Number.MAX_SAFE_INTEGER / 2;
// A single word appearing this soon after a send is iOS re-inserting its
// autocorrect suggestion into the just-cleared field, not the user typing.
const AUTOCORRECT_ECHO_MS = 600;

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'self_harm', label: 'Self-harm' },
  { value: 'other', label: 'Something else' },
];

function pick(title: string, options: string[], destructiveIndex?: number): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...options, 'Cancel'], cancelButtonIndex: options.length, destructiveButtonIndex: destructiveIndex },
        (i) => resolve(i === options.length ? null : i),
      );
    } else {
      Alert.alert(title, undefined, [
        ...options.map((label, i) => ({ text: label, onPress: () => resolve(i) })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
      ]);
    }
  });
}

/** Keyboard on screen (iOS "will" events, so the composer moves with it). */
function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setShown(true));
    const b = Keyboard.addListener(hideEvt, () => setShown(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return shown;
}

export default function ConversationScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const token = useAccessToken();
  const insets = useSafeAreaInsets();
  const keyboardShown = useKeyboardShown();
  const [summary, setSummary] = useState<ConversationSummary | null | undefined>(undefined);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [members, setMembers] = useState<Record<string, ConversationMember>>({});
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [staged, setStaged] = useState<PickedMedia | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [playVideo, setPlayVideo] = useState<string | null>(null);
  const [divider, setDivider] = useState<{ seq: number; count: number } | null>(null);
  const mounted = useRef(true);
  const inputRef = useRef<TextInput>(null);
  // When the last send happened (ms), to recognise iOS's autocorrect re-insert.
  const sentAt = useRef(0);
  // Unread count as the thread opened, before it's marked read.
  const openedUnread = useRef<number | null>(null);
  // New per visit so media requests skip the CDN and recheck membership.
  const mediaNonce = useRef(newClientId()).current;

  const refreshSummary = useCallback(async () => {
    if (!supabase || !conversationId) return null;
    const next = await getConversation(supabase, conversationId);
    if (openedUnread.current === null && next) openedUnread.current = next.unread_count;
    if (mounted.current) setSummary(next);
    return next;
  }, [conversationId]);

  const markSeen = useCallback(() => {
    if (!supabase || !conversationId || AppState.currentState !== 'active') return;
    markRead(supabase, conversationId).catch(() => { /* summary refresh explains */ });
  }, [conversationId]);

  const loadLatest = useCallback(async () => {
    if (!supabase || !conversationId) return;
    try {
      const current = await refreshSummary();
      if (!current || current.my_status !== 'active') return;
      listMembers(supabase, conversationId)
        .then((rows) => mounted.current && setMembers(Object.fromEntries(rows.map((m) => [m.user_id, m]))))
        .catch(() => { /* names are cosmetic */ });
      const page = await fetchMessages(supabase, conversationId);
      if (!mounted.current) return;
      setMessages((prev) => mergeMessages(prev, page.messages.map((m) => ({ ...m, state: 'sent' as const }))));
      setHasMore((prev) => prev || page.hasMore);
      setDivider((prev) => {
        if (prev || !openedUnread.current) return prev;
        const seq = firstUnreadSeq(page.messages, userId, openedUnread.current);
        return seq == null ? null : { seq, count: openedUnread.current };
      });
      markSeen();
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
      return false;
    }
  }, [conversationId, refreshSummary, markSeen, userId]);

  useEffect(() => {
    mounted.current = true;
    if (!supabase || !conversationId || !userId) return;
    void loadLatest();
    const unsubscribe = subscribeToConversation(supabase, conversationId, (incoming) => {
      setMessages((prev) => mergeMessages(prev, [{ ...incoming, state: 'sent' }]));
      if (incoming.sender_id !== userId) markSeen();
    }, loadLatest);
    // Catch up after the app was backgrounded (realtime may have dropped).
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void loadLatest(); });
    return () => { mounted.current = false; unsubscribe(); sub.remove(); };
  }, [conversationId, userId, loadLatest, markSeen]);

  const thread = useMemo(
    () => buildThread(messages, userId, divider?.seq ?? null, divider?.count ?? 0).reverse(),
    [messages, userId, divider],
  );

  async function loadEarlier() {
    const oldest = messages.find((m) => m.state === 'sent');
    if (!supabase || !oldest || !hasMore || loadingEarlier) return;
    setLoadingEarlier(true);
    try {
      const page = await fetchMessages(supabase, conversationId!, { beforeSeq: oldest.seq });
      setMessages((prev) => mergeMessages(prev, page.messages.map((m) => ({ ...m, state: 'sent' as const }))));
      setHasMore(page.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingEarlier(false);
    }
  }

  function patch(clientId: string, change: Partial<LocalMessage>) {
    setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...m, ...change } : m)));
  }

  /** Sends (or re-sends) one message. Uploads go to a fixed path per client
   *  id and every send is idempotent on it, so Retry resumes safely. */
  async function deliver(local: LocalMessage) {
    if (!supabase || !userId) return;
    patch(local.client_id, { state: 'sending' });
    try {
      let stored: ChatMessage;
      const shared = getTitleAttachment(local);
      const gif = getGifAttachment(local);
      if (local.pending) {
        const p = local.pending;
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error('Sign in again to send this.');
        const paths = mediaPaths(conversationId!, userId, local.client_id, p.mime);
        patch(local.client_id, { pending: { ...p, progress: 'uploading' } });
        await uploadFile(paths.path, p.uri, p.mime, accessToken);
        if (p.kind === 'video' && p.thumbUri) await uploadFile(paths.thumbPath, p.thumbUri, 'image/jpeg', accessToken);
        patch(local.client_id, { pending: { ...p, progress: 'posting' } });
        stored = await sendMedia(supabase, conversationId!, {
          kind: p.kind, path: paths.path, thumbPath: p.kind === 'video' ? paths.thumbPath : null,
          width: p.width, height: p.height, durationMs: p.durationMs, caption: p.caption,
        }, local.client_id);
      } else if (gif) {
        stored = await sendGif(supabase, conversationId!, gif, local.client_id);
      } else if (shared) {
        stored = await shareTitle(supabase, conversationId!, shared, shared.note, local.client_id);
      } else {
        stored = await sendMessage(supabase, conversationId!, local.body, local.client_id);
      }
      setMessages((prev) => mergeMessages(prev, [{ ...stored, state: 'sent' }]));
    } catch (e) {
      patch(local.client_id, { state: 'failed' });
      setError((e as Error).message);
      void refreshSummary();
    }
  }

  /** Drops a photo or video that failed to send, and deletes whatever part
   *  of it reached storage. */
  async function discard(local: LocalMessage) {
    setMessages((prev) => prev.filter((m) => m.client_id !== local.client_id));
    if (!supabase || !userId || !local.pending || !conversationId) return;
    const paths = mediaPaths(conversationId, userId, local.client_id, local.pending.mime);
    await discardMediaUpload(supabase, local.pending.kind === 'video' ? [paths.path, paths.thumbPath] : [paths.path]);
  }

  function enqueue(partial: Pick<LocalMessage, 'body'> & Partial<LocalMessage>) {
    if (!userId || !conversationId) return;
    const local: LocalMessage = {
      id: `local-${newClientId()}`,
      client_id: newClientId(),
      conversation_id: conversationId,
      sender_id: userId,
      seq: (pendingSeq += 1),
      created_at: new Date().toISOString(),
      kind: 'text',
      state: 'sending',
      ...partial,
    };
    setError(null);
    setMessages((prev) => [...prev, local]);
    void deliver(local);
  }

  function clearInput() {
    // iOS commits a pending autocorrect suggestion back into the box right
    // after it's cleared, leaving e.g. "ok" behind (and a second tap would
    // send it). The TextInput's onChangeText drops that re-insert.
    sentAt.current = Date.now();
    inputRef.current?.clear();
    setDraft('');
  }

  function submit() {
    const text = draft.trim();
    if (staged) {
      enqueue({
        body: staged.kind === 'image' ? 'Sent a photo' : 'Sent a video',
        kind: staged.kind,
        pending: { ...staged, caption: text || null, progress: 'uploading' },
      });
      setStaged(null);
      clearInput();
      return;
    }
    if (!text) return;
    clearInput();
    enqueue({ body: text });
  }

  async function addMedia() {
    try {
      const picked = await pickMedia();
      if (!picked) return;
      if ('error' in picked) { setError(picked.error); return; }
      setError(null);
      setStaged(picked);
      inputRef.current?.focus();
    } catch {
      setError("Couldn't open your photos. Check ReelShelf's Photos access in Settings.");
    }
  }

  function sendPickedGif(gif: GifPick) {
    setGifOpen(false);
    enqueue({ body: 'Sent a GIF', kind: 'gif', attachment: gif });
  }

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    try { setError(null); await fn(); after?.(); } catch (e) { setError((e as Error).message); }
  }

  async function onMessageLongPress(m: LocalMessage) {
    if (!supabase || m.sender_id === userId || m.state !== 'sent') return;
    const choice = await pick('Message', ['Report message'], 0);
    if (choice !== 0) return;
    const reason = await pick('Why are you reporting this?', REASONS.map((r) => r.label));
    if (reason == null) return;
    await run(() => reportMessage(supabase!, m.id, REASONS[reason].value), () =>
      Alert.alert('Thanks for reporting', "The ReelShelf team will review it privately. The sender isn't told who reported it."));
  }

  async function openMenu() {
    if (!supabase || !summary) return;
    if (summary.kind === 'group') { setMembersOpen(true); return; }
    const options = [summary.i_blocked ? 'Unblock' : 'Block', ...(summary.other_user_id ? ['View profile'] : [])];
    const choice = await pick(conversationName(summary), options, summary.i_blocked ? undefined : 0);
    if (choice === 0 && summary.other_user_id) {
      const other = summary.other_user_id;
      await run(() => (summary.i_blocked ? unblockUser(supabase!, other) : blockUser(supabase!, other)), () => void refreshSummary());
    } else if (choice === 1 && summary.other_user_id) {
      router.push(`/profile/${summary.other_user_id}`);
    }
  }

  if (summary === undefined) {
    return <SafeAreaView style={styles.screen}><ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.xl }} /></SafeAreaView>;
  }

  if (summary === null) {
    return (
      <SafeAreaView style={styles.screen}>
        <TopBar title="Messages" onBack={() => router.back()} />
        <Text style={styles.notice}>This conversation isn&apos;t available. You may have left it or been removed.</Text>
      </SafeAreaView>
    );
  }

  const name = conversationName(summary);
  const isGroup = summary.kind === 'group';

  if (summary.my_status === 'invited') {
    return (
      <SafeAreaView style={styles.screen}>
        <TopBar title="Invitation" onBack={() => router.back()} />
        <View style={styles.inviteBox}>
          <GroupGlyph size={64} />
          <Text style={styles.inviteTitle}>{name}</Text>
          <Text style={styles.notice}>You&apos;ve been invited to this private group. Join to read and send messages.</Text>
          <View style={{ flexDirection: 'row', gap: RS.spacing.sm }}>
            <Pressable style={styles.secondaryBtn} onPress={() => run(() => respondToInvite(supabase!, conversationId!, false), () => router.back())}>
              <Text style={styles.secondaryLabel}>Decline</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={() => run(() => respondToInvite(supabase!, conversationId!, true), () => void loadLatest())}>
              <Text style={styles.primaryLabel}>Join group</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  const memberName = (id: string | null) => {
    if (!id) return 'Former member';
    const m = members[id];
    return m ? (m.display_name || `@${m.username}`) : 'Former member';
  };
  const subtitle = isGroup
    ? groupSubtitle(Object.values(members), userId, summary.member_count)
    : summary.other_username ? `@${summary.other_username}` : '';
  const sendReady = staged ? true : !!draft.trim();
  const src = (path: string) => (token ? mediaSource(path, token, mediaNonce) : null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.iconBtn}>
          <MaterialIcons name="arrow-back-ios-new" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        {isGroup ? <GroupGlyph size={36} /> : <Avatar url={summary.other_avatar_url} name={name} size={36} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.topTitle} numberOfLines={1}>{name}</Text>
          {subtitle ? <Text style={styles.topSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <Pressable onPress={openMenu} accessibilityRole="button" style={styles.iconBtn}
          accessibilityLabel={isGroup ? 'Group members' : 'Conversation options'} testID="conversation-menu">
          <MaterialIcons name={isGroup ? 'group' : 'more-horiz'} size={24} color={RS.colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={thread}
          inverted
          keyExtractor={(item) => item.key}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: RS.spacing.sm }}
          onEndReached={() => void loadEarlier()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingEarlier ? <ActivityIndicator color={RS.colors.accent} style={{ marginVertical: RS.spacing.sm }} /> : null}
          ListEmptyComponent={<Text style={[styles.notice, { transform: [{ scaleY: -1 }] }]}>No messages yet. Say hello.</Text>}
          renderItem={({ item }) => (
            <ThreadRow
              item={item}
              isGroup={isGroup}
              memberName={memberName}
              memberAvatar={(id) => (id ? members[id]?.avatar_url ?? null : null)}
              src={src}
              onRetry={(m) => void deliver(m)}
              onDiscard={(m) => void discard(m)}
              onLongPress={(m) => void onMessageLongPress(m)}
              onOpenPhoto={setViewPhoto}
              onPlayVideo={setPlayVideo}
            />
          )}
        />

        {error ? <Text style={[styles.error, { paddingHorizontal: RS.spacing.md }]}>{error}</Text> : null}

        {summary.can_send ? (
          <View style={[styles.composer, { paddingBottom: keyboardShown ? 8 : Math.max(insets.bottom, 8) }]}>
            <Pressable onPress={addMedia} accessibilityRole="button" accessibilityLabel="Add a photo or video"
              style={styles.roundBtn} testID="add-media">
              <MaterialIcons name="add" size={26} color={RS.colors.textPrimary} />
            </Pressable>
            <View style={[styles.field, staged && styles.fieldStaged]}>
              {staged ? (
                <View style={styles.stagedWrap} testID="staged-media">
                  {staged.kind === 'image' ? (
                    <Image source={{ uri: staged.uri }} style={styles.stagedImage} contentFit="cover" accessibilityLabel="Photo to send" />
                  ) : (
                    <View style={styles.stagedImage}>
                      {staged.thumbUri ? <Image source={{ uri: staged.thumbUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                      <View style={styles.stagedVideoTag}><MaterialIcons name="videocam" size={14} color="#fff" /></View>
                    </View>
                  )}
                  <Pressable onPress={() => setStaged(null)} accessibilityRole="button"
                    accessibilityLabel={staged.kind === 'image' ? 'Remove photo' : 'Remove video'} style={styles.removeHit} testID="remove-staged">
                    <View style={styles.removeDot}><MaterialIcons name="close" size={16} color={RS.colors.base} /></View>
                  </Pressable>
                </View>
              ) : null}
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={(text) => {
                  const echo = Date.now() - sentAt.current < AUTOCORRECT_ECHO_MS && /^\S+$/.test(text);
                  if (echo) { inputRef.current?.clear(); setDraft(''); return; }
                  setDraft(text);
                }}
                placeholder={staged ? 'Add a caption (optional)' : 'Message'}
                placeholderTextColor={RS.colors.textMuted}
                multiline
                maxLength={staged ? CAPTION_MAX_LENGTH : MESSAGE_MAX_LENGTH}
                style={styles.input}
                accessibilityLabel={staged ? 'Caption' : 'Message'}
                testID="message-input"
              />
            </View>
            {!staged ? (
              <Pressable onPress={() => setGifOpen(true)} accessibilityRole="button" accessibilityLabel="Choose a GIF"
                style={styles.gifBtn} testID="gif-button">
                <Text style={styles.gifLabel}>GIF</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={submit} disabled={!sendReady} accessibilityRole="button" accessibilityLabel="Send"
              style={[styles.sendBtn, !sendReady && styles.sendBtnOff]} testID="send-button">
              <MaterialIcons name="arrow-upward" size={22} color={sendReady ? '#fff' : RS.colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.notice, styles.composerNotice, { paddingBottom: Math.max(insets.bottom, RS.spacing.md) }]}>
            {summary.i_blocked
              ? 'You blocked this account. Unblock it from the menu to send messages.'
              : summary.kind === 'direct' && !summary.other_user_id
                ? 'This account no longer exists.'
                : "You can't send messages in this conversation."}
          </Text>
        )}
      </KeyboardAvoidingView>

      <MembersSheet
        visible={membersOpen}
        summary={summary}
        userId={userId}
        onClose={() => setMembersOpen(false)}
        onChanged={() => void refreshSummary()}
      />
      <GifPickerSheet visible={gifOpen} onPick={sendPickedGif} onClose={() => setGifOpen(false)} />
      <PhotoViewer source={viewPhoto ? src(viewPhoto) : null} onClose={() => setViewPhoto(null)} />
      <VideoPlayerModal source={playVideo ? src(playVideo) : null} onClose={() => setPlayVideo(null)} />
    </SafeAreaView>
  );
}

function groupSubtitle(members: ConversationMember[], userId: string | null, count: number) {
  const active = members.filter((m) => m.status === 'active');
  if (active.length === 0) return `${count} ${count === 1 ? 'member' : 'members'}`;
  const others = active.filter((m) => m.user_id !== userId).map((m) => m.display_name || `@${m.username}`);
  if (others.length <= 3) return [...others, 'you'].join(', ');
  return `${others.slice(0, 2).join(', ')} and ${others.length - 2} others`;
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.iconBtn}>
        <MaterialIcons name="arrow-back-ios-new" size={22} color={RS.colors.textPrimary} />
      </Pressable>
      <Text style={styles.topTitle}>{title}</Text>
    </View>
  );
}

function ThreadRow({ item, isGroup, memberName, memberAvatar, src, onRetry, onDiscard, onLongPress, onOpenPhoto, onPlayVideo }: {
  item: ThreadItem<LocalMessage>;
  isGroup: boolean;
  memberName: (id: string | null) => string;
  memberAvatar: (id: string | null) => string | null;
  src: (path: string) => { uri: string; headers: Record<string, string> } | null;
  onRetry: (m: LocalMessage) => void;
  onDiscard: (m: LocalMessage) => void;
  onLongPress: (m: LocalMessage) => void;
  onOpenPhoto: (path: string) => void;
  onPlayVideo: (path: string) => void;
}) {
  if (item.type === 'day') {
    return <Text style={styles.day} accessibilityRole="header">{item.label}</Text>;
  }
  if (item.type === 'unread') {
    const label = `${item.count} new ${item.count === 1 ? 'message' : 'messages'}`;
    return (
      <View style={styles.unreadRow} accessible accessibilityLabel={label} testID="unread-divider">
        <View style={styles.unreadLine} />
        <Text style={styles.unreadLabel}>{label}</Text>
        <View style={styles.unreadLine} />
      </View>
    );
  }

  const { message, mine, startsRun, endsRun } = item;
  const shared = getTitleAttachment(message);
  const gif = getGifAttachment(message);
  const media = getMediaAttachment(message);
  const pending = message.pending;
  const showAvatar = isGroup && !mine;
  const caption = pending?.caption ?? media?.caption ?? null;
  const longPress = () => onLongPress(message);
  const senderName = memberName(message.sender_id);

  let content: React.ReactNode;
  let bubble = false;
  if (pending) {
    content = pending.kind === 'image'
      ? <PhotoView source={{ uri: pending.uri }} width={pending.width} height={pending.height} />
      : <VideoThumb poster={pending.thumbUri ? { uri: pending.thumbUri } : null} width={pending.width} height={pending.height} durationMs={pending.durationMs} />;
  } else if (media?.kind === 'image') {
    content = <PhotoView source={src(media.path)} width={media.width} height={media.height}
      onOpen={() => onOpenPhoto(media.path)} onLongPress={longPress} />;
  } else if (media?.kind === 'video') {
    content = <VideoThumb poster={media.thumb_path ? src(media.thumb_path) : null} width={media.width} height={media.height}
      durationMs={media.duration_ms} onPlay={() => onPlayVideo(media.path)} onLongPress={longPress} />;
  } else if (gif) {
    content = <Pressable onLongPress={longPress} delayLongPress={350}><GifView gif={gif} /></Pressable>;
  } else if (shared) {
    bubble = true;
    content = (
      <>
        <TitleCard title={shared} onLongPress={longPress} />
        {shared.note ? <Text style={[styles.bubbleText, styles.sharedNote]}>{shared.note}</Text> : null}
      </>
    );
  } else {
    bubble = true;
    content = <Text style={styles.bubbleText}>{message.body}</Text>;
  }

  const failed = message.state === 'failed';
  return (
    <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: startsRun ? 10 : 2 }]} testID="message">
      {showAvatar ? (endsRun ? <Avatar url={memberAvatar(message.sender_id)} name={senderName} size={28} /> : <View style={{ width: 28 }} />) : null}
      <View style={{ maxWidth: '80%', alignItems: mine ? 'flex-end' : 'flex-start', gap: 3 }}>
        {isGroup && !mine && startsRun ? <Text style={styles.sender}>{senderName}</Text> : null}
        {bubble ? (
          <Pressable onLongPress={longPress} delayLongPress={350}
            style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, failed && styles.bubbleFailed,
              shared && styles.bubbleShared, message.state === 'sending' && { opacity: 0.7 }]}>
            {content}
          </Pressable>
        ) : (
          <View style={[failed && styles.mediaFailed]}>
            {content}
            {pending && message.state === 'sending' ? (
              <View style={[StyleSheet.absoluteFill, styles.uploading]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </View>
        )}
        {caption ? (
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={styles.bubbleText}>{caption}</Text>
          </View>
        ) : null}
        {failed ? (
          <View style={styles.failedRow}>
            <Pressable onPress={() => onRetry(message)} accessibilityRole="button" accessibilityLabel="Retry sending"
              style={styles.retry} testID="retry-send">
              <Text style={styles.failed}>{pending ? 'Upload failed · Retry' : 'Not sent · Retry'}</Text>
            </Pressable>
            {pending ? (
              <Pressable onPress={() => onDiscard(message)} accessibilityRole="button" accessibilityLabel="Discard this upload"
                style={styles.retry} testID="discard-send">
                <Text style={styles.discard}>Discard</Text>
              </Pressable>
            ) : null}
          </View>
        ) : message.state === 'sending' ? (
          <Text style={styles.meta}>{pending ? (pending.progress === 'uploading' ? `Uploading ${pending.kind === 'video' ? 'video' : 'photo'}…` : 'Sending…') : 'Sending…'}</Text>
        ) : endsRun ? (
          <Text style={styles.meta}>{messageTime(message.created_at)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function MembersSheet({ visible, summary, userId, onClose, onChanged }: {
  visible: boolean; summary: ConversationSummary; userId: string | null; onClose: () => void; onChanged: () => void;
}) {
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isOwner = summary.my_role === 'owner';

  const load = useCallback(() => {
    if (!supabase) return;
    listMembers(supabase, summary.conversation_id).then(setMembers).catch((e: Error) => setError(e.message));
  }, [summary.conversation_id]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  async function run(fn: () => Promise<unknown>, after: () => void) {
    try { setError(null); await fn(); after(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.screen, { padding: RS.spacing.md, gap: RS.spacing.sm }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.topTitle, { flex: 1 }]} numberOfLines={1}>{summary.title}</Text>
          <Pressable hitSlop={10} onPress={onClose}><Text style={styles.link}>Done</Text></Pressable>
        </View>
        {members.map((m) => {
          const name = m.display_name || `@${m.username}`;
          return (
            <View key={m.user_id} style={styles.memberRow}>
              <Avatar url={m.avatar_url} name={name} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{name}{m.user_id === userId ? ' (you)' : ''}</Text>
                <Text style={styles.topSub}>{m.role === 'owner' ? 'Owner' : m.status === 'invited' ? 'Invited' : 'Member'}</Text>
              </View>
              {isOwner && m.user_id !== userId ? (
                <Pressable style={styles.secondaryBtn}
                  onPress={() => run(() => removeMember(supabase!, summary.conversation_id, m.user_id), () => { load(); onChanged(); })}>
                  <Text style={styles.secondaryLabel}>{m.status === 'invited' ? 'Cancel invite' : 'Remove'}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', gap: RS.spacing.sm, marginTop: RS.spacing.md }}>
          <Pressable style={styles.secondaryBtn} onPress={() => Alert.alert('Leave this group?', "You'll stop seeing its messages.", [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => run(() => leaveGroup(supabase!, summary.conversation_id), () => { onClose(); router.replace('/messages'); }) },
          ])}>
            <Text style={styles.secondaryLabel}>Leave group</Text>
          </Pressable>
          {isOwner ? (
            <Pressable style={styles.primaryBtn} onPress={() => { onClose(); router.push(`/messages/new?mode=invite&conversationId=${summary.conversation_id}`); }}>
              <Text style={styles.primaryLabel}>Invite people</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: RS.colors.base },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm,
    paddingHorizontal: RS.spacing.xs, paddingVertical: RS.spacing.xs, minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: RS.colors.border,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: RS.typography.subheading + 2, fontWeight: '700', color: RS.colors.textPrimary },
  topSub: { fontSize: 12, color: RS.colors.textSecondary, marginTop: 1 },
  day: { alignSelf: 'center', fontSize: 12, fontWeight: '600', color: RS.colors.textSecondary, marginTop: RS.spacing.md, marginBottom: RS.spacing.xs },
  unreadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: RS.spacing.md, marginBottom: RS.spacing.xs },
  unreadLine: { flex: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: RS.colors.accent, opacity: 0.6 },
  unreadLabel: { fontSize: 12, fontWeight: '700', color: RS.colors.accent },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  sender: { fontSize: 12, fontWeight: '700', color: RS.colors.textPrimary, marginLeft: 12 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: 'transparent' },
  bubbleMine: { backgroundColor: 'rgba(29,158,117,0.22)' },
  bubbleTheirs: { backgroundColor: RS.colors.elevated },
  bubbleFailed: { borderColor: '#ff8a8a' },
  mediaFailed: { borderRadius: 18, borderWidth: 1, borderColor: '#ff8a8a' },
  bubbleText: { color: RS.colors.textPrimary, fontSize: 16, lineHeight: 21 },
  bubbleShared: { width: 270, padding: 6 },
  sharedNote: { paddingHorizontal: 6, paddingTop: 8, paddingBottom: 2 },
  uploading: { borderRadius: 16, backgroundColor: 'rgba(7,7,7,0.45)', alignItems: 'center', justifyContent: 'center' },
  meta: { fontSize: 11, color: RS.colors.textMuted, marginHorizontal: 6 },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  retry: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  discard: { fontSize: 12, color: RS.colors.textSecondary, fontWeight: '600', textDecorationLine: 'underline' },
  failed: { fontSize: 12, color: '#ff8a8a', marginHorizontal: 6, fontWeight: '600' },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    paddingHorizontal: 10, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: RS.colors.border, backgroundColor: RS.colors.base,
  },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  field: {
    flex: 1, minHeight: 44, justifyContent: 'center', backgroundColor: RS.colors.card,
    borderRadius: 22, borderWidth: 1, borderColor: RS.colors.border,
  },
  fieldStaged: { borderRadius: 20, paddingTop: 8 },
  stagedWrap: { width: 120, height: 120, marginLeft: 8 },
  stagedImage: { width: 120, height: 120, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' },
  stagedVideoTag: {
    position: 'absolute', left: 6, bottom: 6, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: 'rgba(7,7,7,0.7)',
  },
  removeHit: { position: 'absolute', top: -10, right: -10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: RS.colors.textPrimary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: RS.colors.card,
  },
  input: {
    maxHeight: 120, minHeight: 42, color: RS.colors.textPrimary, fontSize: 16,
    paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11,
  },
  gifBtn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  gifLabel: {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.5, color: RS.colors.textPrimary, overflow: 'hidden',
    borderWidth: 1.5, borderColor: RS.colors.textSecondary, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: RS.button.filledBg, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: RS.colors.elevated },
  notice: { color: RS.colors.textSecondary, fontSize: RS.typography.body, textAlign: 'center', padding: RS.spacing.lg },
  composerNotice: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: RS.colors.border, padding: RS.spacing.md },
  error: { color: '#ff8a8a', fontSize: 13, paddingVertical: 4 },
  inviteBox: { alignItems: 'center', gap: RS.spacing.md, padding: RS.spacing.lg },
  inviteTitle: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary },
  primaryBtn: {
    backgroundColor: RS.button.filledBg, borderRadius: RS.button.radius,
    paddingHorizontal: RS.spacing.md, minHeight: 44, justifyContent: 'center',
  },
  primaryLabel: { color: RS.button.filledText, fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    borderWidth: 1, borderColor: RS.button.secondaryBorder, borderRadius: RS.button.radius,
    paddingHorizontal: RS.spacing.md, minHeight: 44, justifyContent: 'center',
  },
  secondaryLabel: { color: RS.button.secondaryText, fontSize: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm + 2, paddingVertical: RS.spacing.xs },
  memberName: { color: RS.colors.textPrimary, fontSize: RS.typography.body },
  link: { color: RS.colors.accent, fontSize: 15, fontWeight: '600' },
});
