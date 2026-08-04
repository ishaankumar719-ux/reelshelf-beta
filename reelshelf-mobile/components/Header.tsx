import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';
import { RS } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationsContext';

export function Header() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount, markAllRead } = useNotifications();

  const handleOpenNotifications = () => {
    setNotificationsOpen(true);
    // Opening the sheet marks everything read immediately — matches the
    // real website's NotificationsBell.tsx handleToggle exactly.
    markAllRead();
  };

  return (
    <View style={styles.header}>
      {/* Left: wordmark only — minimal Sprint 3 nav */}
      <Text style={styles.wordmark}>ReelShelf</Text>

      {/* Right: search icon, notification bell, avatar */}
      <View style={styles.right}>
        <Pressable
          hitSlop={10}
          onPress={() => router.push('/search')}
        >
          <MaterialIcons name="search" size={24} color={RS.colors.textSecondary} />
        </Pressable>
        <Pressable
          hitSlop={10}
          style={styles.bellWrap}
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          onPress={handleOpenNotifications}
        >
          <MaterialIcons name="notifications-none" size={24} color={RS.colors.textSecondary} />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          hitSlop={10}
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <MaterialIcons name="person" size={18} color={RS.colors.textSecondary} />
        </Pressable>
      </View>

      <NotificationsSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.sm,
    paddingBottom:     RS.spacing.xs,
  },
  wordmark: {
    fontSize:      26,
    fontWeight:    '800',
    color:         RS.colors.textPrimary,
    letterSpacing: -0.8,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.md,
  },
  bellWrap: {
    position: 'relative',
  },
  badge: {
    position:        'absolute',
    top:              -4,
    right:            -6,
    minWidth:         16,
    height:           16,
    borderRadius:     8,
    paddingHorizontal: 3,
    backgroundColor: RS.colors.textPrimary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  badgeLabel: {
    fontSize:   9,
    fontWeight: '700',
    color:      RS.colors.base,
  },
  avatar: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: RS.colors.elevated,
    borderWidth:     1,
    borderColor:     RS.colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
