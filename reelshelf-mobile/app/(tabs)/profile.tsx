import { SafeAreaView } from 'react-native-safe-area-context';

import { LoggedOutProfilePrompt, ProfileView } from '@/components/ProfileView';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: RS.colors.base }} edges={['top']} />;
  }

  if (!user) {
    return <LoggedOutProfilePrompt />;
  }

  return <ProfileView userId={user.id} />;
}
