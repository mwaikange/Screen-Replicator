// Shared NotificationBell component - use this on ANY screen header
// Usage: <NotificationBell />
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export function NotificationBell() {
  const navigation = useNavigation<any>();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      setUnreadCount(count || 0);
    } catch { }
  }, []);

  // Refresh count every time this screen comes into focus
  useFocusEffect(useCallback(() => {
    fetchUnread();
  }, [fetchUnread]));

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('Notifications')}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.mutedForeground} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#ef4444', borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

export default NotificationBell;
