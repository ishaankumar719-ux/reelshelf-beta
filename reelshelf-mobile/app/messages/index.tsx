import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, GroupGlyph } from '@/components/messaging/Avatars';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  conversationName,
  listConversations,
  respondToInvite,
  shortTimestamp,
  subscribeToInbox,
  type ConversationSummary,
} from '@/lib/messaging/api';
import { supabase } from '@/lib/supabase/client';

/** Messages inbox — same data and rules as the website's /messages. */
export default function MessagesInboxScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      setRows(await listConversations(supabase));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Refresh on focus (e.g. back from a thread you just read) and live after.
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    if (!supabase || !userId) return;
    return subscribeToInbox(supabase, userId, () => { void load(); });
  }, [userId, load]);

  async function answer(conversationId: string, accept: boolean) {
    if (!supabase) return;
    setBusyInvite(conversationId);
    try {
      await respondToInvite(supabase, conversationId, accept);
      if (accept) router.push(`/messages/${conversationId}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyInvite(null);
    }
  }

  const invites = (rows ?? []).filter((r) => r.my_status === 'invited');
  const conversations = (rows ?? []).filter((r) => r.my_status === 'active');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <MaterialIcons name="arrow-back" size={24} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <Pressable
          hitSlop={10}
          onPress={() => router.push('/messages/new')}
          accessibilityRole="button"
          accessibilityLabel="New message or group"
          testID="new-message"
        >
          <MaterialIcons name="edit-square" size={22} color={RS.colors.textPrimary} />
        </Pressable>
      </View>

      {!userId ? (
        <Text style={styles.empty}>Sign in to see your messages.</Text>
      ) : rows === null && !error ? (
        <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.xl }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversation_id}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={RS.colors.accent}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
          }
          contentContainerStyle={{ paddingBottom: RS.spacing.xxl }}
          ListHeaderComponent={
            <>
              {error ? (
                <Pressable onPress={() => void load()} style={styles.errorRow}>
                  <Text style={styles.errorText}>{error} Tap to retry.</Text>
                </Pressable>
              ) : null}
              {invites.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.overline}>INVITATIONS</Text>
                  {invites.map((invite) => (
                    <View key={invite.conversation_id} style={styles.row}>
                      <GroupGlyph />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{invite.title}</Text>
                        <Text style={styles.rowSub}>Private group · {invite.member_count} {invite.member_count === 1 ? 'member' : 'members'}</Text>
                      </View>
                      <Pressable style={styles.secondaryBtn} disabled={busyInvite === invite.conversation_id}
                        onPress={() => answer(invite.conversation_id, false)}>
                        <Text style={styles.secondaryLabel}>Decline</Text>
                      </Pressable>
                      <Pressable style={styles.primaryBtn} disabled={busyInvite === invite.conversation_id}
                        onPress={() => answer(invite.conversation_id, true)} testID={`join-${invite.conversation_id}`}>
                        <Text style={styles.primaryLabel}>Join</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={{ padding: RS.spacing.lg, gap: RS.spacing.xs }}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyBody}>Message someone who follows you back, or start a private group.</Text>
            </View>
          }
          renderItem={({ item }) => <InboxRow c={item} userId={userId} />}
        />
      )}
    </SafeAreaView>
  );
}

function InboxRow({ c, userId }: { c: ConversationSummary; userId: string | null }) {
  const name = conversationName(c);
  const unread = c.unread_count > 0;
  const preview = c.last_message_body
    ? `${c.last_message_sender_id === userId ? 'You: ' : ''}${c.last_message_body}`
    : c.kind === 'group' ? 'No messages yet' : '';
  return (
    <Pressable style={styles.row} onPress={() => router.push(`/messages/${c.conversation_id}`)} testID="inbox-row"
      accessibilityLabel={`${name}${unread ? `, ${c.unread_count} unread` : ''}`}>
      {c.kind === 'group' ? <GroupGlyph /> : <Avatar url={c.other_avatar_url} name={name} />}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, unread && styles.bold]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.time, unread && styles.timeUnread]}>{shortTimestamp(c.last_message_at)}</Text>
        </View>
        <Text style={[styles.rowSub, unread && styles.rowSubUnread]} numberOfLines={1}>{preview}</Text>
      </View>
      {unread ? (
        <View style={styles.unreadPill}><Text style={styles.unreadLabel}>{c.unread_count > 99 ? '99+' : c.unread_count}</Text></View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: RS.colors.base },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
  },
  title: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary },
  section: { paddingTop: RS.spacing.sm, paddingBottom: RS.spacing.md },
  overline: {
    fontSize: RS.typography.overline, letterSpacing: RS.letterSpacing.widest, color: RS.colors.textMuted,
    paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xs,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm + 4,
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm + 2,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: RS.spacing.sm },
  rowTitle: { flexShrink: 1, fontSize: RS.typography.subheading, color: RS.colors.textPrimary, fontWeight: '500' },
  bold: { fontWeight: '700' },
  rowSub: { fontSize: 13, color: RS.colors.textSecondary },
  rowSubUnread: { color: RS.colors.textPrimary },
  time: { marginLeft: 'auto', fontSize: 12, color: RS.colors.textMuted },
  timeUnread: { color: RS.colors.textPrimary },
  unreadPill: {
    minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: RS.colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: RS.button.filledBg, borderRadius: RS.button.radius,
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.xs + 2,
  },
  primaryLabel: { color: RS.button.filledText, fontWeight: '700', fontSize: 13 },
  secondaryBtn: {
    borderWidth: 1, borderColor: RS.button.secondaryBorder, borderRadius: RS.button.radius,
    paddingHorizontal: RS.spacing.sm + 4, paddingVertical: RS.spacing.xs + 2,
  },
  secondaryLabel: { color: RS.button.secondaryText, fontSize: 13 },
  empty: { color: RS.colors.textSecondary, padding: RS.spacing.lg },
  emptyTitle: { color: RS.colors.textPrimary, fontSize: RS.typography.subheading, fontWeight: '600' },
  emptyBody: { color: RS.colors.textSecondary, fontSize: RS.typography.body },
  errorRow: { padding: RS.spacing.md },
  errorText: { color: '#ff8a8a', fontSize: 13 },
});
