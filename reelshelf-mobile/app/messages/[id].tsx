import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, GroupGlyph } from '@/components/messaging/Avatars';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  MESSAGE_MAX_LENGTH,
  blockUser,
  conversationName,
  fetchMessages,
  getConversation,
  leaveGroup,
  listMembers,
  markRead,
  mergeMessages,
  newClientId,
  removeMember,
  reportMessage,
  respondToInvite,
  sendMessage,
  subscribeToConversation,
  unblockUser,
  type ChatMessage,
  type ConversationMember,
  type ConversationSummary,
  type ReportReason,
} from '@/lib/messaging/api';
import { supabase } from '@/lib/supabase/client';

type LocalMessage = ChatMessage & { state: 'sent' | 'sending' | 'failed' };
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

export default function ConversationScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [summary, setSummary] = useState<ConversationSummary | null | undefined>(undefined);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const mounted = useRef(true);
  const inputRef = useRef<TextInput>(null);
  // When the last send happened (ms), to recognise iOS's autocorrect re-insert.
  const sentAt = useRef(0);

  const refreshSummary = useCallback(async () => {
    if (!supabase || !conversationId) return null;
    const next = await getConversation(supabase, conversationId);
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
      if (current.kind === 'group') {
        listMembers(supabase, conversationId)
          .then((rows) => mounted.current && setNames(Object.fromEntries(rows.map((m) => [m.user_id, m.display_name || `@${m.username}`]))))
          .catch(() => { /* names are cosmetic */ });
      }
      const page = await fetchMessages(supabase, conversationId);
      if (!mounted.current) return;
      setMessages((prev) => mergeMessages(prev, page.messages.map((m) => ({ ...m, state: 'sent' as const }))));
      setHasMore((prev) => prev || page.hasMore);
      markSeen();
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }, [conversationId, refreshSummary, markSeen]);

  useEffect(() => {
    mounted.current = true;
    if (!supabase || !conversationId || !userId) return;
    void loadLatest();
    const unsubscribe = subscribeToConversation(supabase, conversationId, (incoming) => {
      setMessages((prev) => mergeMessages(prev, [{ ...incoming, state: 'sent' }]));
      if (incoming.sender_id !== userId) markSeen();
    });
    // Catch up after the app was backgrounded (realtime may have dropped).
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void loadLatest(); });
    return () => { mounted.current = false; unsubscribe(); sub.remove(); };
  }, [conversationId, userId, loadLatest, markSeen]);

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

  async function deliver(local: LocalMessage) {
    if (!supabase) return;
    setMessages((prev) => prev.map((m) => (m.client_id === local.client_id ? { ...m, state: 'sending' } : m)));
    try {
      const stored = await sendMessage(supabase, conversationId!, local.body, local.client_id);
      setMessages((prev) => mergeMessages(prev, [{ ...stored, state: 'sent' }]));
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.client_id === local.client_id ? { ...m, state: 'failed' } : m)));
      setError((e as Error).message);
      void refreshSummary();
    }
  }

  function submit() {
    const body = draft.trim();
    if (!body || !userId || !conversationId) return;
    const local: LocalMessage = {
      id: `local-${newClientId()}`,
      client_id: newClientId(),
      conversation_id: conversationId,
      sender_id: userId,
      body,
      seq: (pendingSeq += 1),
      created_at: new Date().toISOString(),
      state: 'sending',
    };
    // iOS commits a pending autocorrect suggestion back into the box right
    // after it's cleared, leaving e.g. "ok" behind (and a second tap would
    // send it). The TextInput's onChangeText drops that re-insert.
    sentAt.current = Date.now();
    inputRef.current?.clear();
    setDraft('');
    setError(null);
    setMessages((prev) => [...prev, local]);
    void deliver(local);
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

  const newestFirst = [...messages].reverse();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color={RS.colors.textPrimary} />
        </Pressable>
        {summary.kind === 'group' ? <GroupGlyph size={34} /> : <Avatar url={summary.other_avatar_url} name={name} size={34} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.topTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.topSub} numberOfLines={1}>
            {summary.kind === 'group' ? `Private group · ${summary.member_count} ${summary.member_count === 1 ? 'member' : 'members'}` : summary.other_username ? `@${summary.other_username}` : ''}
          </Text>
        </View>
        <Pressable hitSlop={10} onPress={openMenu} accessibilityRole="button"
          accessibilityLabel={summary.kind === 'group' ? 'Group members' : 'Conversation options'} testID="conversation-menu">
          <MaterialIcons name={summary.kind === 'group' ? 'group' : 'more-horiz'} size={24} color={RS.colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={newestFirst}
          inverted
          keyExtractor={(m) => m.client_id}
          contentContainerStyle={{ paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm, gap: 6 }}
          onEndReached={() => void loadEarlier()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingEarlier ? <ActivityIndicator color={RS.colors.accent} style={{ marginVertical: RS.spacing.sm }} /> : null}
          ListEmptyComponent={<Text style={[styles.notice, { transform: [{ scaleY: -1 }] }]}>No messages yet. Say hello.</Text>}
          renderItem={({ item }) => (
            <Bubble
              message={item}
              mine={item.sender_id === userId}
              senderName={summary.kind === 'group' && item.sender_id ? names[item.sender_id] ?? 'Former member' : null}
              onRetry={() => void deliver(item)}
              onLongPress={() => void onMessageLongPress(item)}
            />
          )}
        />

        {error ? <Text style={[styles.error, { paddingHorizontal: RS.spacing.md }]}>{error}</Text> : null}

        {summary.can_send ? (
          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={(text) => {
                const echo = Date.now() - sentAt.current < AUTOCORRECT_ECHO_MS && /^\S+$/.test(text);
                if (echo) { inputRef.current?.clear(); setDraft(''); return; }
                setDraft(text);
              }}
              placeholder="Message"
              placeholderTextColor={RS.colors.textMuted}
              multiline
              maxLength={MESSAGE_MAX_LENGTH}
              style={styles.input}
              accessibilityLabel="Message"
              testID="message-input"
            />
            <Pressable onPress={submit} disabled={!draft.trim()} accessibilityRole="button" accessibilityLabel="Send"
              style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]} testID="send-button">
              <MaterialIcons name="arrow-upward" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.notice, styles.composerNotice]}>
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
    </SafeAreaView>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable hitSlop={10} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back">
        <MaterialIcons name="arrow-back" size={24} color={RS.colors.textPrimary} />
      </Pressable>
      <Text style={styles.topTitle}>{title}</Text>
    </View>
  );
}

function Bubble({ message, mine, senderName, onRetry, onLongPress }: {
  message: LocalMessage; mine: boolean; senderName: string | null; onRetry: () => void; onLongPress: () => void;
}) {
  const time = new Date(message.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', opacity: message.state === 'sending' ? 0.6 : 1 }} testID="message">
      {senderName && !mine ? <Text style={styles.sender}>{senderName}</Text> : null}
      <Pressable onLongPress={onLongPress} delayLongPress={350}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, message.state === 'failed' && styles.bubbleFailed]}>
        <Text style={styles.bubbleText}>{message.body}</Text>
      </Pressable>
      {message.state === 'failed' ? (
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retry sending">
          <Text style={styles.failed}>Not sent · Tap to retry</Text>
        </Pressable>
      ) : (
        <Text style={styles.meta}>{message.state === 'sending' ? 'Sending…' : time}</Text>
      )}
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
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm + 2,
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: RS.colors.border,
  },
  topTitle: { fontSize: RS.typography.subheading + 1, fontWeight: '700', color: RS.colors.textPrimary },
  topSub: { fontSize: 12, color: RS.colors.textSecondary },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'transparent' },
  bubbleMine: { backgroundColor: 'rgba(29,158,117,0.22)' },
  bubbleTheirs: { backgroundColor: RS.colors.elevated },
  bubbleFailed: { borderColor: '#ff8a8a' },
  bubbleText: { color: RS.colors.textPrimary, fontSize: 15, lineHeight: 20 },
  sender: { fontSize: 11, color: RS.colors.textSecondary, marginLeft: 4, marginBottom: 2 },
  meta: { fontSize: 10, color: RS.colors.textMuted, marginTop: 2, marginHorizontal: 4 },
  failed: { fontSize: 11, color: '#ff8a8a', marginTop: 2, marginHorizontal: 4 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: RS.spacing.sm,
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: RS.colors.border,
  },
  input: {
    flex: 1, maxHeight: 120, minHeight: 40, color: RS.colors.textPrimary, fontSize: 15,
    backgroundColor: RS.colors.elevated, borderRadius: 20, borderWidth: 1, borderColor: RS.colors.border,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: RS.button.filledBg,
    alignItems: 'center', justifyContent: 'center',
  },
  notice: { color: RS.colors.textSecondary, fontSize: RS.typography.body, textAlign: 'center', padding: RS.spacing.lg },
  composerNotice: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: RS.colors.border, padding: RS.spacing.md },
  error: { color: '#ff8a8a', fontSize: 13, paddingVertical: 4 },
  inviteBox: { alignItems: 'center', gap: RS.spacing.md, padding: RS.spacing.lg },
  inviteTitle: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary },
  primaryBtn: {
    backgroundColor: RS.button.filledBg, borderRadius: RS.button.radius,
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
  },
  primaryLabel: { color: RS.button.filledText, fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    borderWidth: 1, borderColor: RS.button.secondaryBorder, borderRadius: RS.button.radius,
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
  },
  secondaryLabel: { color: RS.button.secondaryText, fontSize: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm + 2, paddingVertical: RS.spacing.xs },
  memberName: { color: RS.colors.textPrimary, fontSize: RS.typography.body },
  link: { color: RS.colors.accent, fontSize: 15, fontWeight: '600' },
});
