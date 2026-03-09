import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../lib/types';

const USER_LEVELS: Record<number, string> = {
  1: 'Community Member',
  2: 'Trusted Reporter',
  3: 'Community Lead',
  4: 'Moderator',
  5: 'Administrator',
};

type PublicProfileRouteProp = RouteProp<RootStackParamList, 'PublicProfile'>;

type PublicUser = {
  id: string;
  displayName: string;
  avatarUrl: string;
  level: number;
  trustScore: number;
  town: string;
  bio: string;
  followers: number;
  following: number;
  isFollowing: boolean;
};

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<PublicProfileRouteProp>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const currentUserId = await getCurrentUserId();

      const [profileRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
        supabase.from('profiles')
          .select('id, display_name, avatar_url, trust_score, level, bio, town')
          .eq('id', userId)
          .single(),
        supabase.from('user_follows')
          .select('id', { count: 'exact' })
          .eq('following_id', userId),
        supabase.from('user_follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', userId),
        currentUserId
          ? supabase.from('user_follows')
              .select('id')
              .eq('follower_id', currentUserId)
              .eq('following_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (profileRes.error || !profileRes.data) {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }

      const p = profileRes.data;
      setProfile({
        id: p.id,
        displayName: p.display_name || 'Anonymous',
        avatarUrl: p.avatar_url || '',
        level: p.level ?? 1,
        trustScore: p.trust_score || 0,
        town: p.town || '',
        bio: p.bio || '',
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
        isFollowing: !!isFollowingRes.data,
      });
    } catch (error) {
      console.error('Failed to fetch public profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to follow users');
      return;
    }
    if (currentUserId === userId) return;

    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await supabase.from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: false,
          followers: Math.max(0, prev.followers - 1),
        } : null);
      } else {
        await supabase.from('user_follows')
          .insert({ follower_id: currentUserId, following_id: userId });
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: true,
          followers: prev.followers + 1,
        } : null);
      }
    } catch (error) {
      console.error('Follow/unfollow failed:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.displayName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.displayName.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{profile.displayName}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv.{profile.level} {USER_LEVELS[profile.level] || 'Member'}</Text>
                </View>
              </View>
              {profile.town ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
                  <Text style={styles.locationText}>{profile.town}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.followButton, profile.isFollowing && styles.followingButton]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={profile.isFollowing ? colors.cardForeground : colors.primaryForeground} />
            ) : (
              <>
                <Ionicons
                  name={profile.isFollowing ? 'checkmark' : 'person-add-outline'}
                  size={16}
                  color={profile.isFollowing ? colors.cardForeground : colors.primaryForeground}
                />
                <Text style={[styles.followButtonText, profile.isFollowing && styles.followingButtonText]}>
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.trustScore}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.mutedForeground} />
            <Text style={styles.trustScoreText}>Trust Score: {profile.trustScore}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  bio: {
    fontSize: 14,
    color: colors.cardForeground,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  followingButton: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  followingButtonText: {
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
  bottomSpacing: {
    height: 80,
  },
});
