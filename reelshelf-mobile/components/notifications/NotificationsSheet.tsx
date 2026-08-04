// Bottom sheet, not a dedicated screen — matches the real website's
// NotificationsBell.tsx, which is a header dropdown, not a page (confirmed:
// no /notifications route exists there). NotificationCard below is an exact
// structural port of the website's own component: avatar/initials, unread
// dot, actionText, preview (review text or rating or title), recency, and a
// media poster OR a "Follow"/"Social" text fallback badge — same fields,
// same fallback logic, just RN views instead of web <Link>/<img>.
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationsContext';
import {
  formatNotificationRecency,
  getNotificationDestination,
  isNotificationUnread,
  type ReelShelfNotification,
} from '@/lib/supabase/notifications';
import { getMediaKey } from '@/utils/listKeys';

interface NotificationsSheetProps {
  visible: boolean;
  onClose: () => void;
}

function initialsFor(displayName: string | null, username: string | null): string {
  const source = displayName || username || '';
  return source.trim().charAt(0).toUpperCase() || '?';
}

function previewFor(notification: ReelShelfNotification): string {
  // review is intentionally always '' today (see lib/supabase/notifications.ts's
  // header comment) except for followed_user_reviewed, which does carry it —
  // matching the real website's own getNotificationPreview priority order.
  if (notification.review) return notification.review;
  if (typeof notification.rating === 'number') return `${notification.rating.toFixed(1)} / 10`;
  if (notification.mediaTitle) return notification.mediaTitle;
  return '';
}

function NotificationCard({
  notification, unread, onSelect,
}: {
  notification: ReelShelfNotification;
  unread: boolean;
  onSelect: () => void;
}) {
  const preview = previewFor(notification);

  return (
    <Pressable
      style={[styles.card, unread && styles.cardUnread]}
      onPress={() => {
        router.push(getNotificationDestination(notification) as Parameters<typeof router.push>[0]);
        onSelect();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${notification.displayName || notification.username || 'Someone'} ${notification.actionText}`}
    >
      <View style={styles.avatar}>
        {notification.avatarUrl ? (
          <Image source={{ uri: notification.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <Text style={styles.avatarInitial}>{initialsFor(notification.displayName, notification.username)}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>@{notification.username || 'reelshelf'}</Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.actionText} numberOfLines={2}>{notification.actionText}</Text>
        {preview ? (
          <Text
            style={[styles.preview, notification.review && styles.previewHighlighted]}
            numberOfLines={1}
          >
            {preview}
          </Text>
        ) : null}
        <Text style={styles.recency}>{formatNotificationRecency(notification.createdAt)}</Text>
      </View>

      {notification.mediaPoster ? (
        <Image source={{ uri: notification.mediaPoster }} style={styles.poster} contentFit="cover" />
      ) : (
        <Text style={styles.fallbackBadge}>{notification.type === 'new_follower' ? 'Follow' : 'Social'}</Text>
      )}
    </Pressable>
  );
}

export function NotificationsSheet({ visible, onClose }: NotificationsSheetProps) {
  const { notifications, loading, unreadCount, lastReadAt, markAllRead } = useNotifications();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />

          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Notifications</Text>
              <Text style={styles.title}>Social updates</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</Text>
            </View>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {loading && notifications.length === 0 ? (
              <Text style={styles.emptyText}>Loading notifications…</Text>
            ) : notifications.length > 0 ? (
              notifications.map((n) => (
                <NotificationCard
                  key={getMediaKey('notification', n.id)}
                  notification={n}
                  unread={isNotificationUnread(n, lastReadAt)}
                  onSelect={onClose}
                />
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEyebrow}>Quiet for now</Text>
                <Text style={styles.emptyBody}>Follow more shelves to see new reviews, fresh logs, and social activity appear here.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.markReadBtn}
              onPress={markAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all read"
            >
              <Text style={styles.markReadLabel}>Mark all read</Text>
            </Pressable>
            <Pressable
              onPress={() => { router.push('/activity'); onClose(); }}
              accessibilityRole="button"
              accessibilityLabel="View all activity"
              hitSlop={8}
            >
              <Text style={styles.viewAllLabel}>View all activity</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: RS.card.radius + 8,
    borderTopRightRadius: RS.card.radius + 8,
    overflow: 'hidden',
    backgroundColor: RS.colors.card,
    padding: RS.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: RS.spacing.sm + 2,
  },
  eyebrow: {
    fontSize: RS.typography.micro,
    fontWeight: '700',
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
    color: RS.colors.textMuted,
  },
  title: {
    fontSize: RS.typography.subheading,
    fontWeight: '600',
    color: RS.colors.textPrimary,
    marginTop: 4,
  },
  statusPill: {
    borderRadius: RS.badge.pillRadius,
    borderWidth: 0.5,
    borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical: 6,
  },
  statusPillText: { fontSize: RS.typography.micro, color: RS.colors.textSecondary },
  list: { maxHeight: 460 },
  listContent: { gap: RS.spacing.xs + 2, paddingBottom: RS.spacing.xs },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, padding: RS.spacing.md },
  emptyCard: {
    borderRadius: RS.card.radius,
    borderWidth: 0.5,
    borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated,
    padding: RS.spacing.md,
  },
  emptyEyebrow: {
    fontSize: RS.typography.micro,
    fontWeight: '700',
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
    color: RS.colors.textMuted,
    marginBottom: RS.spacing.xs,
  },
  emptyBody: { fontSize: RS.typography.caption + 1, color: RS.colors.textSecondary, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    gap: RS.spacing.sm + 2,
    alignItems: 'flex-start',
    borderRadius: RS.card.radius,
    borderWidth: 0.5,
    borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated,
    padding: RS.spacing.sm + 2,
  },
  cardUnread: {
    borderColor: RS.colors.border,
    backgroundColor: RS.colors.card,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: RS.colors.base,
    borderWidth: 0.5, borderColor: RS.colors.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary },
  body: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: RS.typography.caption + 1, fontWeight: '600', color: RS.colors.textPrimary, flexShrink: 1 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: RS.colors.accent },
  actionText: { fontSize: RS.typography.caption + 1, color: RS.colors.textSecondary, marginTop: 3, lineHeight: 17 },
  preview: { fontSize: RS.typography.micro + 1, color: RS.colors.textMuted, marginTop: 6 },
  previewHighlighted: { color: RS.colors.accent },
  recency: {
    fontSize: RS.typography.micro,
    color: RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
    marginTop: 6,
  },
  poster: { width: 40, height: 60, borderRadius: 8, flexShrink: 0 },
  fallbackBadge: {
    fontSize: RS.typography.micro,
    color: RS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: RS.spacing.sm + 2,
    paddingTop: RS.spacing.sm + 2,
    borderTopWidth: 0.5,
    borderTopColor: RS.colors.border,
  },
  markReadBtn: {
    borderRadius: RS.button.radius,
    borderWidth: 0.5,
    borderColor: RS.colors.border,
    backgroundColor: RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical: RS.spacing.xs + 2,
  },
  markReadLabel: { fontSize: RS.typography.caption, color: RS.colors.textSecondary, fontWeight: '600' },
  viewAllLabel: {
    fontSize: RS.typography.caption,
    fontWeight: '700',
    color: RS.button.primaryText,
    textTransform: 'uppercase',
    letterSpacing: RS.letterSpacing.wide,
  },
});
