import { Keyboard, Pressable, StyleSheet, Text } from 'react-native';

import { RS } from '@/constants/theme';

// Minimal, reusable "Done" affordance for multiline fields. A multiline
// TextInput's on-screen return key correctly inserts a newline rather than
// dismissing (expected — the field must stay multiline), which otherwise
// leaves no way to close the keyboard except tapping a different field
// (moves focus, keyboard stays open) or tapping outside the whole sheet
// (which closes the modal and discards unsaved edits, not just the
// keyboard). A plain in-layout Pressable rather than an InputAccessoryView
// — that API is iOS-only with no Android equivalent, and would need
// Platform branching for what a simple always-visible button avoids:
// renders identically on both platforms, no extra native wiring.
export function KeyboardDismissButton() {
  return (
    <Pressable
      onPress={() => Keyboard.dismiss()}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Dismiss keyboard"
    >
      <Text style={styles.label}>Done</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize:   RS.typography.overline,
    fontWeight: '600',
    color:      RS.colors.accent,
  },
});
