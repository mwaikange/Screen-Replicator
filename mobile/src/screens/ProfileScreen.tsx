import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize } from '../lib/theme';
import { userApi, authApi } from '../lib/api';
import { supabase } from '../lib/supabase';
import { User } from '../lib/types';

const appLogo = require('../../assets/logo.jpg');

const USER_LEVELS: Record<number, string> = {
  1: 'Community Member',
  2: 'Trusted Reporter',
  3: 'Community Lead',
  4: 'Moderator',
  5: 'Administrator',
};

type FollowUser = { id: string; display_name: string; avatar_url: string | null; trust_score: number };

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followLoading, setFollowLoading] = useState(false);
  // FIX: real unread count for bell badge
  const [unreadCount, setUnreadCount] = useState(0);
  // FIX: cache-bust avatar after upload
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  const fetchUser = useCallback(async () => {
    try {
      const response = await userApi.getProfile();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { count } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .is('read_at', null);
      setUnreadCount(count || 0);
    } catch {}
  }, []);

  // FIX: refresh on every screen focus
  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchUnreadCount();
    }, [fetchUser, fetchUnreadCount])
  );

  const handleEditName = () => {
    setNewName(user?.displayName || '');
    setEditingName(true);
  };

  // FIX: use userApi.updateDisplayName() not raw supabase
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await userApi.updateDisplayName(newName.trim());
      setEditingName(false);
      await fetchUser();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  // FIX: use userApi.getFollowers() / getFollowing() not raw supabase
  const openFollowModal = async (type: 'followers' | 'following') => {
    if (!user?.id) return;
    setFollowModalType(type);
    setFollowLoading(true);
    try {
      const response = type === 'followers'
        ? await userApi.getFollowers(user.id)
        : await userApi.getFollowing(user.id);
      setFollowList(response.data || []);
    } catch {
      setFollowList([]);
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant access to your photo library to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await userApi.updateAvatar(result.assets[0].uri);
        setAvatarTimestamp(Date.now());
        await fetchUser();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to update avatar');
      }
    }
  };

  const displayUser = user || {
    displayName: '', email: '', phone: '', avatarUrl: '', level: 0,
    trustScore: 0, followers: 0, following: 0, subscriptionType: 'Free',
    subscriptionExpiry: '', subscriptionStatus: 'none', subscriptionPlanName: null,
  };

  const hasActiveSubscription = displayUser.subscriptionStatus === 'active' && displayUser.subscriptionExpiry;
  const daysRemaining = hasActiveSubscription && displayUser.subscriptionExpiry
    ? Math.max(0, Math.ceil((new Date(displayUser.subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const formattedExpiry = hasActiveSubscription && displayUser.subscriptionExpiry
    ? new Date(displayUser.subscriptionExpiry).toLocaleDateString()
    : '';

  const trustPct = Math.min(100, Math.max(0, displayUser.trustScore || 0));
  const trustColor = trustPct >= 75 ? '#22c55e' : trustPct >= 40 ? '#f59e0b' : '#ef4444';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        {/* FIX: real count badge — shows number, not just a static red dot */}
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => {
            navigation.navigate('Notifications');
            setUnreadCount(0);
          }}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.mutedForeground} />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {displayUser.avatarUrl ? (
                <Image 
                  source={{ uri: `${displayUser.avatarUrl}?t=${avatarTimestamp}` }} 
                  style={styles.avatarImage}
                  onError={() => setUser(prev => prev ? { ...prev, avatarUrl: '' } : prev)}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{displayUser.displayName?.charAt(0) || 'U'}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.cameraButton} onPress={handlePickAvatar}>
                <Ionicons name="camera" size={14} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayUser.displayName}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv.{displayUser.level} {USER_LEVELS[displayUser.level] || 'Member'}</Text>
                </View>
              </View>
              <Text style={styles.email}>{displayUser.email}</Text>
              {!!displayUser.phone && <Text style={styles.phone}>{displayUser.phone}</Text>}
            </View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditName}>
            <Ionicons name="pencil-outline" size={16} color={colors.cardForeground} />
            <Text style={styles.editButtonText}>Edit Display Name</Text>
          </TouchableOpacity>

          <View style={styles.trustScoreContainer}>
            <View style={styles.trustScoreRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={trustColor} />
              <Text style={styles.trustScoreText}>Trust Score: </Text>
              <Text style={[styles.trustScoreText, { fontWeight: '700', color: trustColor }]}>{displayUser.trustScore}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <TouchableOpacity style={styles.statItem} onPress={() => openFollowModal('followers')}>
            <Text style={styles.statNumber}>{displayUser.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => openFollowModal('following')}>
            <Text style={styles.statNumber}>{displayUser.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          {hasActiveSubscription ? (
            <>
              <Text style={styles.sectionSubtitle}>Active membership</Text>
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionType}>{displayUser.subscriptionPlanName || displayUser.subscriptionType}</Text>
                <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
              </View>
              <View style={styles.expiryRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.expiryText}>Expires {formattedExpiry}</Text>
              </View>
              <Text style={styles.daysRemaining}>{daysRemaining} days remaining</Text>
            </>
          ) : (
            <>
              <Text style={styles.sectionSubtitle}>No active subscription</Text>
              <View style={styles.subscriptionRow}>
                <Text style={[styles.subscriptionType, { color: colors.mutedForeground }]}>Free</Text>
                <View style={[styles.activeBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.activeBadgeText, { color: colors.mutedForeground }]}>Inactive</Text>
                </View>
              </View>
            </>
          )}
          <View style={styles.subscriptionButtons}>
            <TouchableOpacity style={styles.outlineButton} onPress={() => navigation.navigate('Subscribe')}>
              <Text style={styles.outlineButtonText}>{hasActiveSubscription ? 'Renew / Upgrade' : 'Subscribe'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Main', { screen: 'CaseDeck' } as any)}>
              <Text style={styles.primaryButtonText}>My Case Deck</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.signOutCard}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', onPress: async () => {
                  try { await authApi.signOut(); } catch {}
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }},
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.cardForeground} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Modal visible={editingName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Display Name</Text>
              <TouchableOpacity onPress={() => setEditingName(false)}>
                <Ionicons name="close" size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter display name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveNameButton, (!newName.trim() || savingName) && { opacity: 0.5 }]}
              onPress={handleSaveName}
              disabled={!newName.trim() || savingName}
            >
              <Text style={styles.saveNameButtonText}>{savingName ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!followModalType} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{followModalType === 'followers' ? 'Followers' : 'Following'}</Text>
              <TouchableOpacity onPress={() => setFollowModalType(null)}>
                <Ionicons name="close" size={24} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            {followLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : followList.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginVertical: 32 }}>
                {followModalType === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            ) : (
              <FlatList
                data={followList}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.followUserRow}
                    onPress={() => {
                      setFollowModalType(null);
                      setTimeout(() => {
                        navigation.navigate('PublicProfile', { userId: item.id });
                      }, 100);
                    }}
                  >
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.followUserAvatar} />
                    ) : (
                      <View style={[styles.followUserAvatar, { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: colors.cardForeground, fontWeight: '600' }}>{item.display_name?.charAt(0) || '?'}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.followUserName}>{item.display_name || 'Anonymous'}</Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Trust: {item.trust_score || 0}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 36, height: 36, borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.cardForeground },
  notificationButton: { position: 'relative', padding: 8 },
  notificationBadge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notificationBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: 8, padding: 20, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  profileHeader: { flexDirection: 'row', gap: spacing.md },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 24, fontWeight: '600', color: colors.mutedForeground },
  cameraButton: { position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  displayName: { fontSize: 20, fontWeight: '700', color: colors.cardForeground },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.border },
  levelText: { fontSize: 12, color: colors.mutedForeground },
  email: { fontSize: 14, color: colors.mutedForeground },
  phone: { fontSize: 14, color: colors.mutedForeground },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingVertical: 12, marginTop: spacing.md },
  editButtonText: { fontSize: 14, color: colors.cardForeground },
  trustScoreContainer: { marginTop: spacing.md },
  trustScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  trustScoreText: { fontSize: 14, color: colors.mutedForeground },
  trustBarBg: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
  trustBarFill: { height: 6, borderRadius: 3 },
  statsCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 8, paddingVertical: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700', color: colors.cardForeground },
  statLabel: { fontSize: 14, color: colors.mutedForeground },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.cardForeground, marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.md },
  subscriptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  subscriptionType: { fontSize: 14, fontWeight: '500', color: colors.cardForeground },
  activeBadge: { backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  activeBadgeText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  expiryText: { fontSize: 14, color: colors.mutedForeground },
  daysRemaining: { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: spacing.md },
  subscriptionButtons: { flexDirection: 'row', gap: 8 },
  outlineButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  outlineButtonText: { fontSize: 14, fontWeight: '500', color: colors.cardForeground },
  primaryButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 6, backgroundColor: colors.primary },
  primaryButtonText: { fontSize: 14, fontWeight: '600', color: colors.primaryForeground },
  signOutCard: { backgroundColor: colors.card, borderRadius: 8, padding: 20, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingVertical: 12 },
  signOutText: { fontSize: 14, fontWeight: '500', color: colors.cardForeground },
  bottomSpacing: { height: 80 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modalCard: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.lg, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.cardForeground },
  nameInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, fontSize: 16, color: colors.cardForeground, marginBottom: spacing.md },
  saveNameButton: { backgroundColor: colors.primary, borderRadius: 8, padding: spacing.md, alignItems: 'center' },
  saveNameButtonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '600' },
  followUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  followUserAvatar: { width: 40, height: 40, borderRadius: 20 },
  followUserName: { fontSize: 14, fontWeight: '600', color: colors.cardForeground },
});
