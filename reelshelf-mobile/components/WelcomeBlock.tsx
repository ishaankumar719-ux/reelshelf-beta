import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

// Becomes dynamic once real auth/accounts exist — replace with user.profile.firstName
const CURRENT_USER_NAME = 'Ishaan';

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function getDisplayDate(): string {
  const d = new Date();
  const day     = d.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${day}, ${monthDay}`;
}

export function WelcomeBlock() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Good {getTimeOfDay()}, {CURRENT_USER_NAME}.
      </Text>
      <Text style={styles.date}>{getDisplayDate()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               4,
  },
  greeting: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '500',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.normal,
  },
  date: {
    fontSize:      RS.typography.caption,
    fontWeight:    '400',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.normal,
  },
});
