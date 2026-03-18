import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../lib/theme';
import { supabase } from '../lib/supabase';

const appLogo = require('../../assets/logo.jpg');

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

// FIX: all notification types registered with icons and colors
const typeIcons: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  // Someone followed you (both type values used)
  follow:       { name: 'person-add-outline', color: colors.primary },
  new_follower: { name: 'person-add-outline', color: colors.primary },
  // Someone requested to join your group
  group_request: { name: 'people-outline', color: '#9333ea' },
  // Your group join request was approved
  group_approved: { name: 'checkmark-circle-outline', color: '#22c55e' },
  // Your group join request was denied
  group_denied: { name: 'close-circle-outline', color: '#ef4444' },
  // Subscription / payment
  subscription: { name: 'card-outline', color: '#22c55e' },
  // Reaction to your post
  reaction: { name: 'heart-outline', color: '#ef4444' },
  // Someone commented on your incident
  comment: { name: 'chatbubble-outline', color: '#3b82f6' },
  // Someone reported/reacted to your incident
  incident_report: { name: 'alert-circle-outline', color: '#f97316' },
  // Case status update
  case_update: { name: 'briefcase-outline', color: '#8b5cf6' },
  // System / admin message
  system: { name: 'information-circle-outline', color: '#6b7280' },
};

function getTypeInfo(type: string) {
  return typeIcons[type] || typeIcons.system;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const loadNotifications = useCallback(async (uid?: string) => {
    const id = uid || userId;
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[Notifications] user:', id, 'count:', data?.length, 'error:', error?.message);
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          await loadNotifications(user.id);
        }
      } catch (error) {
        console.error('Failed to init notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => { loadNotifications(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [userId]);

  // FIX: all types navigate to the right screen
  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'follow':
      case 'new_follower':
        // entity_id = the user who followed you → go to their public profile
        if (notification.entity_id) {
          navigation.navigate('PublicProfile', { userId: notification.entity_id });
        }
        break;

      case 'group_request':
        // entity_id = group_id → go to that group's chat so creator can see requests
        if (notification.entity_id) {
          navigation.navigate('GroupChat', { groupId: notification.entity_id });
        } else {
          navigation.navigate('Main', { screen: 'Groups' });
        }
        break;

      case 'group_approved':
      case 'group_denied':
        // entity_id = group_id
        if (notification.entity_id) {
          navigation.navigate('GroupChat', { groupId: notification.entity_id });
        } else {
          navigation.navigate('Main', { screen: 'Groups' });
        }
        break;

      case 'reaction':
      case 'comment':
      case 'incident_report':
        if (notification.entity_id) {
          navigation.navigate('IncidentDetails', { postId: notification.entity_id });
        } else {
          navigation.navigate('Main', { screen: 'Feed' });
        }
        break;

      case 'case_update':
        // entity_id = case id
        if (notification.entity_id) {
          navigation.navigate('CaseDetail', { caseId: notification.entity_id });
        } else {
          navigation.navigate('Main', { screen: 'CaseDeck' });
        }
        break;

      case 'subscription':
        navigation.navigate('Subscribe');
        break;

      case 'system':
      default:
        // no navigation for generic system messages
        break;
    }
  }, [navigation, markAsRead]);

  const renderNotification = useCallback(({ item }: { item: Notification }) => {
    const iconInfo = getTypeInfo(item.type);
    const isUnread = !item.read_at;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.notificationUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconInfo.color + '20' }]}>
          <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }, [handleNotificationPress]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.cardForeground} />
          </TouchableOpacity>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>You'll see updates here when something happens</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={<View style={styles.bottomSpacing} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerLogo: { width: 36, height: 36, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.cardForeground },
  markAllButton: { padding: 8 },
  markAllText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  unreadBanner: { backgroundColor: colors.primary + '10', paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  unreadBannerText: { fontSize: 13, fontWeight: '500', color: colors.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 14, backgroundColor: colors.card, gap: 12 },
  notificationUnread: { backgroundColor: colors.primary + '08' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: '500', color: colors.cardForeground, marginBottom: 2 },
  notificationTitleUnread: { fontWeight: '700' },
  notificationMessage: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18, marginBottom: 4 },
  notificationTime: { fontSize: 12, color: colors.mutedForeground },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  separator: { height: 1, backgroundColor: colors.border },
  emptyContainer: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.cardForeground },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
  bottomSpacing: { height: 40 },
});
