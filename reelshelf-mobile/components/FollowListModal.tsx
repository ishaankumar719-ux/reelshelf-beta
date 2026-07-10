import { useEffect, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { fetchFollowersList, fetchFollowingList, type FollowListEntry } from '@/lib/supabase/profile';
import { getMediaKey } from '@/utils/listKeys';

interface FollowListModalProps {
  visible:  boolean;
  onClose:  () => void;
  userId:   string;
  mode:     'followers' | 'following';
}

// Makes the Followers/Following stat tiles actually tappable — surfaces the
// real list of users (both directions of the existing `followers` table),
// each row tappable into that user's public profile via the same
// other-user-profile route used everywhere else.
export function FollowListModal({ visible, onClose, userId, mode }: FollowListModalProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [entries, setEntries] = useState<FollowListEntry[]>([]);

  useEffect(() => {
    if (!visible) return;
    setStatus('loading');
    const fetcher = mode === 'followers' ? fetchFollowersList : fetchFollowingList;
    fetcher(userId)
      .then((data) => { setEntries(data); setStatus('success'); })
      .catch(() => setStatus('error'));
  }, [visible, userId, mode]);

  const handleTap = (id: string) => {
    onClose();
    router.push(`/profile/${id}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'followers' ? 'Followers' : 'Following'}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={RS.colors.textSecondary} />
            </Pressable>
          </View>

          {status === 'loading' ? (
            <ActivityIndicator color={RS.colors.accent} style={{ marginTop: RS.spacing.lg }} />
          ) : status === 'error' ? (
            <Text style={styles.emptyText}>Couldn&apos;t load this list.</Text>
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>{mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</Text>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => getMediaKey('user', item.id)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => handleTap(item.id)}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <MaterialIcons name="person" size={18} color={RS.colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.rowMeta}>
                    <Text style={styles.name}>{item.displayName || item.username || 'ReelShelf Member'}</Text>
                    {item.username ? <Text style={styles.username}>@{item.username}</Text> : null}
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { height: '70%', borderTopLeftRadius: RS.card.radius + 8, borderTopRightRadius: RS.card.radius + 8, overflow: 'hidden', backgroundColor: RS.colors.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.md, paddingBottom: RS.spacing.sm },
  title: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center', marginTop: RS.spacing.xl, fontStyle: 'italic' },
  list: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingVertical: RS.spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  rowMeta: { flex: 1, gap: 1 },
  name: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  username: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
});
