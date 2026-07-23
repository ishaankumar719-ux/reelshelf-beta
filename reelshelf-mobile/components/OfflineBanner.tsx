// Global "You're offline" banner — mounted once at the navigation root, sits
// above all screens. Distinct from a per-screen network-error state: this is
// ambient device connectivity, not "this one fetch failed."
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text } from 'react-native';

import { RS } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  if (!isOffline) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe} pointerEvents="none">
      <Text style={styles.text}>You&apos;re offline</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    backgroundColor: RS.colors.elevated, borderBottomWidth: 0.5, borderBottomColor: RS.colors.border,
  },
  text: {
    textAlign: 'center', paddingVertical: 6, fontSize: RS.typography.caption,
    fontWeight: '700', color: RS.colors.textSecondary, letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
});
