import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { canMessage, openDirectConversation } from '@/lib/messaging/api';
import { supabase } from '@/lib/supabase/client';

/** "Message" on someone else's profile. Shown only when the database says you
 *  can message them (mutual followers, no block either way, or an existing
 *  DM). `following` is passed so a follow/unfollow re-checks eligibility. */
export function MessageProfileButton({ profileId, following }: { profileId: string; following: boolean }) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !viewerId || viewerId === profileId) return;
    let cancelled = false;
    canMessage(supabase, profileId)
      .then((ok) => { if (!cancelled) setEligible(ok); })
      .catch(() => { if (!cancelled) setEligible(false); });
    return () => { cancelled = true; };
  }, [viewerId, profileId, following]);

  if (!eligible) return null;

  async function open() {
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await openDirectConversation(supabase, profileId);
      router.push(`/messages/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      style={[styles.btn, busy && { opacity: 0.6 }]}
      onPress={open}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Message"
      accessibilityHint={error ?? undefined}
      testID="profile-message-button"
    >
      <Text style={[styles.label, error ? styles.errorLabel : null]}>{busy ? '…' : error ? 'Try again' : 'Message'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: RS.spacing.sm,
    borderRadius: RS.button.radius,
    borderWidth: 1,
    borderColor: RS.button.secondaryBorder,
    paddingHorizontal: RS.spacing.lg,
    paddingVertical: RS.spacing.sm + 2,
  },
  label: { fontSize: RS.typography.body, fontWeight: '700', color: RS.colors.textPrimary },
  errorLabel: { color: '#ff8a8a' },
});
