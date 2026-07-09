import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SignInPrompt } from '@/components/SignInPrompt';
import { SkeletonCastRow } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFriendActivity, type FriendActivityEntry } from '@/lib/supabase/friendActivity';
import type { MediaType } from '@/data/seedHomeContent';

interface FriendActivityProps {
  id:        string;
  mediaType: MediaType;
}

// Real data once authenticated: who the current user follows (followers
// table) who has publicly logged this title (diary_entries, gated by the
// existing "Public can view shared diary entries" RLS policy). Falls back
// to the honest empty state when there's genuinely no such activity — never
// fabricated names, avatars, or interactions.
export function FriendActivity({ id, mediaType }: FriendActivityProps) {
  const { user, initializing } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [entries, setEntries] = useState<FriendActivityEntry[]>([]);

  useEffect(() => {
    if (!user) {
      setStatus('success');
      setEntries([]);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetchFriendActivity(user.id, { id, mediaType })
      .then((result) => {
        if (cancelled) return;
        setEntries(result);
        setStatus('success');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, [user, id, mediaType]);

  if (initializing || status === 'loading') {
    return <SkeletonCastRow />;
  }

  if (!user) {
    return <SignInPrompt message="Sign in to see what friends you follow think of this." />;
  }

  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No friends have interacted with this yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {entries.map((entry) => (
        <Pressable key={entry.userId} style={styles.entry} onPress={() => router.push(`/profile/${entry.userId}`)}>
          <Text style={styles.name}>{entry.displayName || entry.username || 'A friend'}</Text>
          {entry.rating ? <Text style={styles.rating}>Rated {entry.rating.toFixed(1)} / 10</Text> : null}
          {entry.review ? <Text style={styles.review} numberOfLines={3}>{entry.review}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.md,
  },
  entry: {
    borderRadius:    RS.card.radius,
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    padding:         RS.spacing.md,
    gap:             4,
  },
  name: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
  },
  rating: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.accent,
  },
  review: {
    fontSize:   RS.typography.caption + 1,
    color:      RS.colors.textSecondary,
    lineHeight: 18,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    fontStyle: 'italic',
  },
});
