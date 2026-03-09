import { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await userApi.getProfile();
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleEditName = () => {
    setNewName(user?.displayName || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      await supabase.from('profiles').update({ display_name: newName.trim() }).eq('id', authUser.id);
      setEditingName(false);
      const response = await userApi.getProfile();
      setUser(response.data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const openFollowModal = async (type: 'followers' | 'following') => {
    if (!user?.id) return;
    setFollowModalType(type);
    setFollowLoading(true);
    try {
      let ids: string[] = [];
      if (type === 'followers') {
        const { data } = await supabase.from('user_follows').select('follower_id').eq('following_id', user.id);
        ids = (data || []).map((f: any) => f.follower_id);
      } else {
        const { data } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id);
        ids = (data || []).map((f: any) => f.following_id);
      }
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url, trust_score').in('id', ids);
        setFollowList(profiles || []);
      } else {
        setFollowList([]);
      }
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
      await userApi.updateAvatar(result.assets[0].uri);
      const response = await userApi.getProfile();
      setUser(response.data);
    }
  };

  const displayUser = user || {
    displayName: '',
    email: '',
    phone: '',
    avatarUrl: '',
    level: 0,
    trustScore: 0,
    followers: 0,
    following: 0,
    subscriptionType: 'Free',
    subscriptionExpiry: '',
    subscriptionStatus: 'none',
    subscriptionPlanName: null,
  };

  const hasActiveSubscription = displayUser.subscriptionStatus === 'active' && displayUser.subscriptionExpiry;

  const daysRemaining = hasActiveSubscription && displayUser.subscriptionExpiry
    ? Math.max(0, Math.ceil((new Date(displayUser.subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const formattedExpiry = hasActiveSubscription && displayUser.subscriptionExpiry
    ? new Date(displayUser.subscriptionExpiry).toLocaleDateString()
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {displayUser.avatarUrl ? (
                <Image source={{ uri: displayUser.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {displayUser.displayName?.charAt(0) || 'U'}
                  </Text>
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
              <Text style={styles.phone}>{displayUser.phone}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditName}>
            <Ionicons name="pencil-outline" size={16} color={colors.cardForeground} />
            <Text style={styles.editButtonText}>Edit Display Name</Text>
          </TouchableOpacity>

          <View style={styles.trustScore}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.trustScoreText}>Trust Score: {displayUser.trustScore}</Text>
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
                <Text style={styles.subscriptionType}>
                  {displayUser.subscriptionPlanName || displayUser.subscriptionType}
                </Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
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
                    onPress={() => { setFollowModalType(null); navigation.navigate('PublicProfile', { userId: item.id }); }}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  email: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  phone: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  editButtonText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  trustScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  trustScoreText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  statLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subscriptionType: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  activeBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  expiryText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  daysRemaining: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  subscriptionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  outlineButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  signOutCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  bottomSpacing: {
    height: 80,
  },
});
