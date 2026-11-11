import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, GroupGlyph } from '@/components/messaging/Avatars';
import { TitleCard } from '@/components/messaging/TitleCard';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  SHARE_NOTE_MAX_LENGTH,
  conversationName,
  listMessageableUsers,
  listShareDestinations,
  newClientId,
  openDirectConversation,
  shareTitle,
  type ConversationSummary,
  type MessageableUser,
  type SharedMediaType,
  type SharedTitle,
} from '@/lib/messaging/api';
import { supabase } from '@/lib/supabase/client';

type Destination =
  | { type: 'conversation'; id: string; name: string }
  | { type: 'person'; userId: string; name: string };

const keyOf = (d: Destination) => (d.type === 'conversation' ? `c:${d.id}` : `p:${d.userId}`);

/** "Send to chat" for one title (opened from a detail screen with
 *  ?mediaType&mediaId&title&year&posterUrl): pick a recent DM, a joined group
 *  or a mutual follower, add an optional note, send to that one destination. */
export default function ShareToChatScreen() {
  const params = useLocalSearchParams<{
    mediaType?: string; mediaId?: string; title?: string; year?: string; posterUrl?: string;
  }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const title = useMemo<SharedTitle | null>(() => {
    const type = params.mediaType as SharedMediaType | undefined;
    if ((type !== 'film' && type !== 'tv' && type !== 'book') || !params.mediaId || !params.title) return null;
    const year = Number(params.year);
    return {
      media_type: type,
      media_id: params.mediaId,
      title: params.title,
      year: Number.isInteger(year) && year > 0 ? year : null,
      poster_url: params.posterUrl ? params.posterUrl : null,
    };
  }, [params.mediaType, params.mediaId, params.title, params.year, params.posterUrl]);

  const [recent, setRecent] = useState<ConversationSummary[] | null>(null);
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<MessageableUser[]>([]);
  const [selected, setSelected] = useState<Destination | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ conversationId: string; name: string } | null>(null);
  // One client id per (destination, note): retrying after a failure reuses it,
  // so the server stores the share once even if the first attempt landed.
  const attempt = useRef<{ key: string; clientId: string; conversationId?: string } | null>(null);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    listShareDestinations(supabase)
      .then((rows) => { if (!cancelled) setRecent(rows); })
      .catch((e: Error) => { if (!cancelled) { setRecent([]); setError(e.message); } });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      listMessageableUsers(supabase!, search)
        .then((rows) => { if (!cancelled) setPeople(rows); })
        .catch(() => { if (!cancelled) setPeople([]); });
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [search, userId]);

  const query = search.trim().toLowerCase();
  const visibleRecent = (recent ?? []).filter((c) =>
    !query || conversationName(c).toLowerCase().includes(query) || (c.other_username ?? '').toLowerCase().includes(query));
  const withDm = new Set((recent ?? []).filter((c) => c.kind === 'direct').map((c) => c.other_user_id));
  const visiblePeople = people.filter((p) => !withDm.has(p.user_id));

  async function send() {
    if (!supabase || !title || !selected || busy) return;
    const key = `${keyOf(selected)}|${note.trim()}`;
    if (attempt.current?.key !== key) attempt.current = { key, clientId: newClientId() };
    const current = attempt.current;
    setBusy(true);
    setError(null);
    try {
      const conversationId = selected.type === 'conversation'
        ? selected.id
        : (current.conversationId ??= await openDirectConversation(supabase, selected.userId));
      await shareTitle(supabase, conversationId, title, note, current.clientId);
      setSent({ conversationId, name: selected.name });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <View style={styles.header}>
      <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
        <MaterialIcons name="close" size={24} color={RS.colors.textPrimary} />
      </Pressable>
      <Text style={styles.heading}>Send to chat</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (!title) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {header}
        <Text style={styles.hint}>This title can&apos;t be shared.</Text>
      </SafeAreaView>
    );
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {header}
        <View style={{ padding: RS.spacing.md, gap: RS.spacing.md }}>
          <Text style={styles.done} accessibilityLiveRegion="polite">Sent {title.title} to {sent.name}.</Text>
          <Pressable style={[styles.primary]} onPress={() => router.replace(`/messages/${sent.conversationId}`)}
            accessibilityRole="button" testID="open-chat">
            <Text style={styles.primaryLabel}>Open chat</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.secondaryLabel}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: RS.spacing.lg }}>
          <View style={{ paddingHorizontal: RS.spacing.md, marginBottom: RS.spacing.sm }} pointerEvents="none">
            <TitleCard title={title} compact />
          </View>

          <TextInput value={search} onChangeText={setSearch} placeholder="Search chats and friends"
            placeholderTextColor={RS.colors.textMuted} style={styles.input} autoCapitalize="none" autoCorrect={false}
            testID="share-search" />

          {recent === null ? <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.md }} /> : null}
          {visibleRecent.length ? <Text style={styles.section}>Recent</Text> : null}
          {visibleRecent.map((c) => {
            const d: Destination = { type: 'conversation', id: c.conversation_id, name: conversationName(c) };
            return (
              <Choice key={keyOf(d)} selected={!!selected && keyOf(selected) === keyOf(d)} onPress={() => setSelected(d)}
                disabled={busy} name={d.name} testID={`dest-${c.kind === 'group' ? c.title : c.other_username}`}
                detail={c.kind === 'group' ? `Group · ${c.member_count} ${c.member_count === 1 ? 'member' : 'members'}` : c.other_username ? `@${c.other_username}` : null}
                icon={c.kind === 'group' ? <GroupGlyph size={40} /> : <Avatar url={c.other_avatar_url} name={d.name} size={40} />} />
            );
          })}
          {visiblePeople.length ? <Text style={styles.section}>Friends</Text> : null}
          {visiblePeople.map((p) => {
            const d: Destination = { type: 'person', userId: p.user_id, name: p.display_name || `@${p.username}` };
            return (
              <Choice key={keyOf(d)} selected={!!selected && keyOf(selected) === keyOf(d)} onPress={() => setSelected(d)}
                disabled={busy} name={d.name} detail={`@${p.username}`} testID={`dest-${p.username}`}
                icon={<Avatar url={p.avatar_url} name={d.name} size={40} />} />
            );
          })}
          {recent !== null && !visibleRecent.length && !visiblePeople.length ? (
            <Text style={styles.hint}>
              {search ? 'No chats or friends match that search.' : 'No chats yet. You can send titles to people who follow you back.'}
            </Text>
          ) : null}

          <Text style={styles.section}>Add a note (optional)</Text>
          <TextInput value={note} onChangeText={setNote} maxLength={SHARE_NOTE_MAX_LENGTH} multiline
            placeholder="Why they should watch or read it" placeholderTextColor={RS.colors.textMuted}
            style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]} testID="share-note" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable onPress={() => void send()} disabled={!selected || busy}
            style={[styles.primary, { marginHorizontal: RS.spacing.md }, (!selected || busy) && { opacity: 0.5 }]}
            accessibilityRole="button" testID="share-send">
            <Text style={styles.primaryLabel}>
              {busy ? 'Sending…' : error ? 'Try again' : selected ? `Send to ${selected.name}` : 'Choose a chat'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Choice({ selected, onPress, disabled, icon, name, detail, testID }: {
  selected: boolean; onPress: () => void; disabled: boolean; icon: React.ReactNode;
  name: string; detail: string | null; testID?: string;
}) {
  return (
    <Pressable style={[styles.row, selected && styles.rowSelected]} onPress={onPress} disabled={disabled}
      accessibilityRole="radio" accessibilityState={{ checked: selected }} testID={testID}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {detail ? <Text style={styles.handle}>{detail}</Text> : null}
      </View>
      <MaterialIcons name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={22}
        color={selected ? RS.colors.accent : RS.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: RS.colors.base },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
  },
  heading: { fontSize: RS.typography.subheading + 2, fontWeight: '700', color: RS.colors.textPrimary },
  input: {
    marginHorizontal: RS.spacing.md, marginBottom: RS.spacing.sm, color: RS.colors.textPrimary, fontSize: 15,
    backgroundColor: RS.colors.elevated, borderRadius: 14, borderWidth: 1, borderColor: RS.colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  section: {
    color: RS.colors.textMuted, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '600',
    paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.xs,
  },
  hint: { color: RS.colors.textMuted, fontSize: 13, paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm },
  error: { color: '#ff8a8a', fontSize: 13, paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm + 4, marginHorizontal: RS.spacing.sm,
    paddingHorizontal: RS.spacing.sm, paddingVertical: RS.spacing.sm, borderRadius: 14, borderWidth: 1, borderColor: 'transparent',
  },
  rowSelected: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' },
  name: { color: RS.colors.textPrimary, fontSize: 15, fontWeight: '600' },
  handle: { color: RS.colors.textMuted, fontSize: 12 },
  primary: {
    alignItems: 'center', justifyContent: 'center', borderRadius: RS.button.radius, paddingVertical: 13,
    backgroundColor: RS.colors.accent,
  },
  primaryLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: {
    alignItems: 'center', justifyContent: 'center', borderRadius: RS.button.radius, paddingVertical: 12,
    borderWidth: 1, borderColor: RS.button.secondaryBorder,
  },
  secondaryLabel: { color: RS.colors.textPrimary, fontWeight: '600', fontSize: 15 },
  done: { color: RS.colors.textPrimary, fontSize: 16 },
});
