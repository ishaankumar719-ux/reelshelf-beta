import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

interface SignInPromptProps {
  message?: string;
}

// Shared logged-out state for every screen that shows personal data
// (Profile, Diary, Lists, Movie Detail's Primary Actions) — a clear prompt,
// never a blank screen or a raw error.
export function SignInPrompt({ message = 'Sign in to see your personal ReelShelf.' }: SignInPromptProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <Pressable style={styles.btn} onPress={() => router.push('/login')}>
        <Text style={styles.btnLabel}>Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:        'center',
    justifyContent:    'center',
    gap:               RS.spacing.md,
    paddingHorizontal: RS.spacing.lg,
    paddingVertical:   RS.spacing.xl,
  },
  message: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textSecondary,
    textAlign:  'center',
  },
  btn: {
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingHorizontal: RS.button.paddingH,
    paddingVertical:   RS.button.paddingV,
  },
  btnLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
