import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

// No real accounts, friends, or social graph exist yet — this is the honest
// empty state, not a placeholder for fabricated activity. Never invent
// friend names, avatars, or interactions here.
export function FriendActivity() {
  return (
    <View style={styles.container}>
      <Text style={styles.emptyText}>No friends have interacted with this yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
  },
  emptyText: {
    fontSize:  RS.typography.body,
    color:     RS.colors.textMuted,
    fontStyle: 'italic',
  },
});
