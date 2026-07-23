// Top-level crash guard — wraps the navigation root in app/_layout.tsx.
// Catches render-time exceptions React error boundaries can actually catch
// (does NOT catch async/promise rejections inside event handlers or
// useEffect — those are handled per-call via Resource<T>/status='error'
// patterns and the NetworkErrorState component instead).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { captureException } from '@/lib/observability/sentry';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary] caught', error, info.componentStack);
    }
    captureException(error, { componentStack: info.componentStack ?? undefined });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>ReelShelf hit an unexpected error. Give it another try.</Text>
            <Pressable style={styles.retryBtn} onPress={this.handleRetry}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RS.colors.base },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: RS.spacing.lg, gap: RS.spacing.sm },
  title: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: RS.typography.body, color: RS.colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  retryBtn: {
    marginTop: RS.spacing.md, backgroundColor: RS.button.filledBg, borderRadius: RS.button.radius,
    paddingHorizontal: RS.spacing.lg, paddingVertical: 12,
  },
  retryLabel: { color: '#ffffff', fontSize: RS.typography.body, fontWeight: '700' },
});
