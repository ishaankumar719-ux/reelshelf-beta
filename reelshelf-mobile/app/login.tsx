import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RS } from '@/constants/theme';

export default function LoginScreen() {
  const handleSignIn = () => {
    // Phase 1 shell — auth will be wired in a later phase
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Text style={styles.wordmark}>ReelShelf</Text>
        <Text style={styles.tagline}>Your next story is waiting.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleSignIn} activeOpacity={0.8}>
          <Text style={styles.btnLabel}>Continue with Email</Text>
        </TouchableOpacity>
        <Text style={styles.legal}>
          By continuing you agree to our Terms &amp; Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  inner: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: RS.spacing.lg,
    gap:            RS.spacing.sm,
  },
  wordmark: {
    fontSize:      RS.typography.display,
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: RS.typography.body,
    color:    RS.colors.textSecondary,
  },
  footer: {
    paddingHorizontal: RS.spacing.lg,
    paddingBottom:     RS.spacing.lg,
    gap:               RS.spacing.sm,
  },
  btn: {
    backgroundColor: RS.colors.accent,
    borderRadius:    RS.card.radius,
    paddingVertical: RS.spacing.md,
    alignItems:      'center',
  },
  btnLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      '#fff',
  },
  legal: {
    fontSize:  RS.typography.caption,
    color:     RS.colors.textMuted,
    textAlign: 'center',
  },
});
