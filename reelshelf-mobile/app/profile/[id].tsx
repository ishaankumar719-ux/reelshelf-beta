import { useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/ProfileView';

// Viewing another user's profile — the SAME ProfileView component used by
// the Profile tab, just given someone else's id. RLS (already established)
// determines what's actually visible; no bypass, no service-role query.
export default function OtherUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileView userId={id} showBackButton />;
}
