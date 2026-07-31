// Reusable themed "this fetch failed" state with Retry — for any screen
// consuming a Resource<T>/status pattern (useMediaDetail and friends) or a
// plain try/catch fetch. Distinct from OfflineBanner (ambient connectivity)
// and ErrorBoundary (render crashes).
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface Props {
  message?:    string;
  onRetry:     () => void;
  /** Defaults to "Retry" — pass e.g. "Go Back" for cases where re-fetching
   *  can't help (nothing was ever fetched), so the action isn't misleading. */
  actionLabel?: string;
  compact?:    boolean;
}

export function NetworkErrorState({ message = "Couldn't load this — check your connection and try again.", onRetry, actionLabel = 'Retry', compact }: Props) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry} accessibilityRole="button" accessibilityLabel={actionLabel}>
        <Text style={styles.retryLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: RS.spacing.sm, padding: RS.spacing.lg },
  containerCompact: { padding: RS.spacing.md, gap: RS.spacing.xs },
  message: { fontSize: RS.typography.body, color: RS.colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    borderRadius: RS.button.radius, borderWidth: 0.5, borderColor: RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill, paddingHorizontal: RS.spacing.lg, paddingVertical: 10,
  },
  retryLabel: { color: RS.button.primaryText, fontSize: RS.typography.body, fontWeight: '700' },
});
