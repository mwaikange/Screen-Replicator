import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { userApi, postsApi } from '../lib/api';
import { RootStackParamList } from '../lib/types';

type PublicProfile = {
  id: string; displayName: string; avatarUrl: string;
  trustScore: number; level: number; town: string; bio: string;
  followers: number; following: number; isFollowing: boolean; isOwnProfile: boolean;
};

type FollowUser = { id: string; display_name: string; avatar_url: string | null; trust_score: number };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'PublicProfile'>>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [communityTrust, setCommunityTrust] = useState(0);

  const loadProfile = useCallback(async () => {
    console.log('[PublicProfile] loading userId:', userId);
    if (!userId) {
      console.error('[PublicProfile] userId is undefined — navigation param missing!');
      setLoading(false);
      return;
    }
    try {
      const [profileRes, postsRes] = await Promise.all([
        userApi.getPublicProfile(userId),
        postsApi.getByUser(userId),
      ]);
      console.log('[PublicProfile] profileRes.data:', profileRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      if (postsRes.data) setPosts(postsRes.data);
      // Fetch Community Trust = confirms on this user's posts
      const { data: incidents } = await supabase
        .from('incidents').select('id').eq('created_by', userId);
      if (incidents && incidents.length > 0) {
        const ids = incidents.map((i: any) => i.id);
        const { count } = await supabase
          .from('incident_reactions')
          .select('id', { count: 'exact', head: true })
          .eq('reaction_type', 'confirm')
          .in('incident_id', ids);
        setCommunityTrust(count || 0);
      }
    } catch (e) {
      console.error('[PublicProfile] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleFollowToggle = useCallback(async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await userApi.unfollow(userId);
        setProfile(p => p ? { ...p, isFollowing: false, followers: p.followers - 1 } : p);
      } else {
        await userApi.follow(userId);
        setProfile(p => p ? { ...p, isFollowing: true, followers: p.followers + 1 } : p);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  }, [profile, userId]);

  const openFollowModal = useCallback(async (type: 'followers' | 'following') => {
    setFollowModalType(type);
    setFollowListLoading(true);
    try {
      const res = type === 'followers'
        ? await userApi.getFollowers(userId)
        : await userApi.getFollowing(userId);
      setFollowList(res.data || []);
    } catch { setFollowList([]); }
    finally { setFollowListLoading(false); }
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centered}><Text style={styles.emptyText}>User not found</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{profile.displayName}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{profile.displayName?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
            )}
          </View>

          {/* Name + Badges */}
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <View style={styles.badgeRow}>
            {profile.town ? (
              <View style={styles.townBadge}>
                <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.townText}>{profile.town}</Text>
              </View>
            ) : null}
          </View>

          {/* Trust Score + Community Trust — always shown together */}
          <View style={styles.trustScoreRow}>
            <View style={styles.trustBadge}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.trustBadgeLabel}>Admin Trust</Text>
              <Text style={styles.trustBadgeValue}>{profile.trustScore}</Text>
            </View>
            <View style={[styles.trustBadge, { backgroundColor: '#22c55e15', borderColor: '#22c55e40' }]}>
              <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
              <Text style={[styles.trustBadgeLabel, { color: '#22c55e' }]}>Community Trust</Text>
              <Text style={[styles.trustBadgeValue, { color: '#22c55e' }]}>{communityTrust}</Text>
            </View>
          </View>

          {/* Bio */}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => openFollowModal('followers')}>
              <Text style={styles.statNumber}>{profile.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => openFollowModal('following')}>
              <Text style={styles.statNumber}>{profile.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          {/* Follow Button */}
          {!profile.isOwnProfile && (
            <TouchableOpacity
              style={[styles.followButton, profile.isFollowing && styles.followingButton]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={profile.isFollowing ? colors.cardForeground : colors.primaryForeground} />
              ) : (
                <>
                  <Ionicons
                    name={profile.isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                    size={16}
                    color={profile.isFollowing ? colors.cardForeground : colors.primaryForeground}
                  />
                  <Text style={[styles.followButtonText, profile.isFollowing && styles.followingButtonText]}>
                    {profile.isFollowing ? 'Unfollow' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <Text style={styles.postsSectionTitle}>{posts.length} Active Posts</Text>
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="document-outline" size={40} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : (
            posts.map((post) => {
              const media = post.incident_media?.[0];
              const mediaUrl = media?.path?.startsWith('http') ? media.path : null;
              const incidentType = Array.isArray(post.incident_types) ? post.incident_types[0] : post.incident_types;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => navigation.navigate('IncidentDetails', { postId: post.id })}
                >
                  {mediaUrl && (
                    <Image source={{ uri: mediaUrl }} style={styles.postImage} />
                  )}
                  <View style={styles.postContent}>
                    <View style={styles.postTypeBadge}>
                      <Text style={styles.postTypeText}>{incidentType?.label || post.type || 'Incident'}</Text>
                    </View>
                    <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
                    <View style={styles.postMeta}>
                      <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                      <Text style={styles.postMetaText}>{post.town || 'Unknown location'}</Text>
                      <Text style={styles.postMetaDot}>·</Text>
                      <Text style={styles.postMetaText}>{formatDate(post.created_at)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Followers/Following Modal */}
      <Modal visible={!!followModalType} transparent animationType="slide" onRequestClose={() => setFollowModalType(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{followModalType === 'followers' ? 'Followers' : 'Following'}</Text>
              <TouchableOpacity onPress={() => setFollowModalType(null)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {followListLoading ? (
              <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
            ) : followList.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>{followModalType === 'followers' ? 'No followers yet' : 'Not following anyone'}</Text>
              </View>
            ) : (
              <FlatList
                data={followList}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.followUserRow}
                    onPress={() => {
                      setFollowModalType(null);
                      navigation.push('PublicProfile', { userId: item.id });
                    }}
                  >
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.followUserAvatar} />
                    ) : (
                      <View style={[styles.followUserAvatar, styles.avatarFallback]}>
                        <Text style={styles.avatarText}>{item.display_name?.charAt(0)?.toUpperCase() || 'U'}</Text>
                      </View>
                    )}
                    <View style={styles.followUserInfo}>
                      <Text style={styles.followUserName}>{item.display_name || 'Anonymous'}</Text>
                      <Text style={styles.followUserTrust}>Trust Score: {item.trust_score || 0}</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.cardForeground, flex: 1, textAlign: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  profileCard: {
    backgroundColor: colors.card, padding: spacing.lg,
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarContainer: { marginBottom: spacing.md },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  displayName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.cardForeground, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  trustScoreRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 4 },
  trustBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f59e0b15', borderWidth: 1, borderColor: '#f59e0b40', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  trustBadgeLabel: { fontSize: 11, fontWeight: '500', color: '#92400e', flex: 1 },
  trustBadgeValue: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  townBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.muted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  townText: { fontSize: fontSize.xs, color: colors.mutedForeground },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  trustText: { fontSize: fontSize.sm, color: colors.mutedForeground },
  bio: { fontSize: fontSize.sm, color: colors.mutedForeground, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: fontSize.xl, fontWeight: '700', color: colors.cardForeground },
  statLabel: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  followButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 24, marginTop: spacing.md, minWidth: 140, justifyContent: 'center',
  },
  followingButton: { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border },
  followButtonText: { fontSize: fontSize.base, fontWeight: '600', color: colors.primaryForeground },
  followingButtonText: { color: colors.cardForeground },
  postsSection: { padding: spacing.md },
  postsSectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.cardForeground, marginBottom: spacing.md },
  emptyPosts: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 8 },
  postCard: {
    backgroundColor: colors.card, borderRadius: 10, marginBottom: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  postImage: { width: '100%', height: 160 },
  postContent: { padding: spacing.md },
  postTypeBadge: { backgroundColor: colors.primary + '15', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  postTypeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  postTitle: { fontSize: fontSize.base, fontWeight: '600', color: colors.cardForeground, marginBottom: 6 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postMetaText: { fontSize: fontSize.xs, color: colors.mutedForeground },
  postMetaDot: { fontSize: fontSize.xs, color: colors.mutedForeground },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 32 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.cardForeground },
  followUserRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  followUserAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  followUserInfo: { flex: 1 },
  followUserName: { fontSize: fontSize.base, fontWeight: '500', color: colors.cardForeground },
  followUserTrust: { fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
});
