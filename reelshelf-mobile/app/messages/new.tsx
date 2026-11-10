import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/messaging/Avatars';
import { RS } from '@/constants/theme';
import {
  createGroup,
  inviteToGroup,
  listMembers,
  listMessageableUsers,
  openDirectConversation,
  type MessageableUser,
} from '@/lib/messaging/api';
import { supabase } from '@/lib/supabase/client';

type Mode = 'direct' | 'group' | 'invite';

/** New DM (pick a mutual follower), new private group (name + invitees), or
 *  invite more people to an existing group (?mode=invite&conversationId=…). */
export default function NewConversationScreen() {
  const params = useLocalSearchParams<{ mode?: string; conversationId?: string }>();
  const inviteMode = params.mode === 'invite' && !!params.conversationId;
  const [mode, setMode] = useState<Mode>(inviteMode ? 'invite' : 'direct');
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<MessageableUser[] | null>(null);
  const [exclude, setExclude] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !inviteMode) return;
    listMembers(supabase, params.conversationId!).then((rows) => setExclude(rows.map((m) => m.user_id))).catch(() => {});
  }, [inviteMode, params.conversationId]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      listMessageableUsers(supabase!, search)
        .then((rows) => { if (!cancelled) setPeople(rows); })
        .catch((e: Error) => { if (!cancelled) setError(e.message); });
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [search]);

  async function startDirect(userId: string) {
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await openDirectConversation(supabase, userId);
      router.replace(`/messages/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function submit() {
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'invite') {
        await inviteToGroup(supabase, params.conversationId!, selected);
        router.back();
      } else {
        const id = await createGroup(supabase, title, selected);
        router.replace(`/messages/${id}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const visible = (people ?? []).filter((p) => !exclude.includes(p.user_id));
  const canSubmit = mode === 'group' ? title.trim().length > 0 : selected.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
          <MaterialIcons name="close" size={24} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{mode === 'direct' ? 'New message' : mode === 'group' ? 'New group' : 'Invite people'}</Text>
        {mode !== 'direct' ? (
          <Pressable hitSlop={10} onPress={submit} disabled={!canSubmit || busy} testID="submit-group">
            <Text style={[styles.action, (!canSubmit || busy) && { opacity: 0.4 }]}>
              {busy ? '…' : mode === 'group' ? 'Create' : 'Invite'}
            </Text>
          </Pressable>
        ) : <View style={{ width: 24 }} />}
      </View>

      {mode !== 'invite' ? (
        <View style={styles.segment}>
          {(['direct', 'group'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.segmentItem, mode === m && styles.segmentActive]}
              accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
              <Text style={[styles.segmentLabel, mode === m && styles.segmentLabelActive]}>{m === 'direct' ? 'Message' : 'Group'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {mode === 'group' ? (
        <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="Group name"
          placeholderTextColor={RS.colors.textMuted} style={styles.input} testID="group-name" />
      ) : null}
      <TextInput value={search} onChangeText={setSearch} placeholder="Search people you follow each other with"
        placeholderTextColor={RS.colors.textMuted} style={styles.input} autoCapitalize="none" autoCorrect={false} />
      <Text style={styles.hint}>
        {mode === 'direct' ? 'You can message people who follow you back.' : "You can invite people who follow you back. They'll join once they accept."}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {people === null ? (
        <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.lg }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.user_id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.hint}>
              {search ? 'Nobody matches that search.' : 'No mutual followers yet. Follow people and ask them to follow you back.'}
            </Text>
          }
          renderItem={({ item }) => {
            const name = item.display_name || `@${item.username}`;
            const isSelected = selected.includes(item.user_id);
            return (
              <Pressable
                style={styles.row}
                disabled={busy}
                onPress={() => (mode === 'direct' ? startDirect(item.user_id) : toggle(item.user_id))}
                accessibilityState={mode === 'direct' ? undefined : { selected: isSelected }}
                testID={`person-${item.username}`}
              >
                <Avatar url={item.avatar_url} name={name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.handle}>@{item.username}</Text>
                </View>
                {mode !== 'direct' ? (
                  <MaterialIcons name={isSelected ? 'check-circle' : 'radio-button-unchecked'} size={22}
                    color={isSelected ? RS.colors.accent : RS.colors.textMuted} />
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: RS.colors.base },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
  },
  title: { fontSize: RS.typography.subheading + 2, fontWeight: '700', color: RS.colors.textPrimary },
  action: { color: RS.colors.accent, fontWeight: '700', fontSize: 15 },
  segment: {
    flexDirection: 'row', marginHorizontal: RS.spacing.md, marginBottom: RS.spacing.sm,
    backgroundColor: RS.colors.elevated, borderRadius: RS.button.radius, padding: 3,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RS.button.radius },
  segmentActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  segmentLabel: { color: RS.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  segmentLabelActive: { color: RS.colors.textPrimary },
  input: {
    marginHorizontal: RS.spacing.md, marginBottom: RS.spacing.sm, color: RS.colors.textPrimary, fontSize: 15,
    backgroundColor: RS.colors.elevated, borderRadius: 14, borderWidth: 1, borderColor: RS.colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  hint: { color: RS.colors.textMuted, fontSize: 12, paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.xs },
  error: { color: '#ff8a8a', fontSize: 13, paddingHorizontal: RS.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm + 4, paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm },
  name: { color: RS.colors.textPrimary, fontSize: 15 },
  handle: { color: RS.colors.textSecondary, fontSize: 12 },
});
