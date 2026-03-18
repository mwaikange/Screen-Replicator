import { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NotificationBell from '../components/NotificationBell';
import { colors, spacing } from '../lib/theme';
import { postsApi, postImages } from '../lib/api';
import { Post } from '../lib/types';
import { Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import * as Location from 'expo-location';

const appLogo = require('../../assets/logo.jpg');
const mwaikangeLogo = require('../../assets/mwaikange-logo.png');
const ngumuLogo = require('../../assets/ngumu-logo.jpg');

const filterTabs = ['All', 'Nearby', 'Verified', 'Following'];

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  ALERT:                 { label: 'Emergency Alert',       color: '#EF4444' },
  CRIME:                 { label: 'Crime Report',          color: '#F97316' },
  GBV:                   { label: 'Gender-Based Violence', color: '#9333ea' },
  FIRE:                  { label: 'Fire Emergency',        color: '#EF4444' },
  MEDICAL:               { label: 'Medical Emergency',     color: '#EF4444' },
  MISSING:               { label: 'Missing Person',        color: '#F97316' },
  SUSPICIOUS:            { label: 'Suspicious Activity',   color: '#EAB308' },
  LOST:                  { label: 'Lost & Found',          color: '#BEF264' },
  missing_person:        { label: 'Missing Person',        color: '#ef4444' },
  incident:              { label: 'Crime Report',          color: '#ef4444' },
  alert:                 { label: 'Emergency Alert',       color: '#ea580c' },
  gender_based_violence: { label: 'Gender-Based Violence', color: '#9333ea' },
  theft:                 { label: 'Theft',                 color: '#dc2626' },
  suspicious_activity:   { label: 'Suspicious Activity',   color: '#ca8a04' },
};

// ─── Reaction types ───────────────────────────────────────────────────────────
type ReactionType = 'upvote' | 'downvote' | 'love' | 'confirm';

// Reactions handled via postsApi.react() in api.ts (same pattern as follow notifications)

async function toggleFollow(
  incidentId: string,
  userId: string,
  isFollowing: boolean,
  setFollowing: (v: boolean) => void,
) {
  setFollowing(!isFollowing);
  try {
    if (isFollowing) {
      await supabase.from('incident_followers').delete()
        .eq('incident_id', incidentId).eq('user_id', userId);
    } else {
      await supabase.from('incident_followers').insert({ incident_id: incidentId, user_id: userId });
    }
  } catch {
    setFollowing(isFollowing);
  }
}

// Exported for use in IncidentDetailScreen when posting a comment
export async function sendCommentNotifications(
  incidentId: string,
  incidentTitle: string,
  incidentCreatedBy: string,
  commenterId: string,
  commenterName: string,
) {
  try {
    const notifyIds = new Set<string>();
    if (incidentCreatedBy !== commenterId) notifyIds.add(incidentCreatedBy);

    const { data: followers } = await supabase
      .from('incident_followers').select('user_id')
      .eq('incident_id', incidentId).neq('user_id', commenterId);

    (followers || []).forEach((f: any) => notifyIds.add(f.user_id));
    if (notifyIds.size === 0) return;

    await supabase.from('user_notifications').insert(
      Array.from(notifyIds).map(uid => {
        const isCreator = uid === incidentCreatedBy;
        return {
          user_id: uid,
          type: 'comment',
          title: isCreator ? 'New comment on your post' : 'New comment on a post you follow',
          message: isCreator
            ? `${commenterName} commented on your post`
            : `${commenterName} commented on a post you are following`,
          entity_id: incidentId,
        };
      })
    );
  } catch (e) {
    console.error('[commentNotify]', e);
  }
}

type FeedItem = { type: 'post'; data: Post } | { type: 'ad'; adType: 'mwaikange' | 'ngumu'; id: string };

function MwaikAngeAdCard() {
  return (
    <TouchableOpacity style={styles.adCard} onPress={() => Linking.openURL('https://www.mwaikange.com/')} activeOpacity={0.8}>
      <View style={styles.adHeader}>
        <Ionicons name="megaphone-outline" size={14} color={colors.mutedForeground} />
        <Text style={styles.adLabel}>Sponsored</Text>
      </View>
      <View style={styles.adBody}>
        <View style={styles.adIcon}>
          <Image source={mwaikangeLogo} style={styles.adLogoImage} resizeMode="cover" />
        </View>
        <View style={styles.adContent}>
          <Text style={styles.adTitle}>Mwaikange</Text>
          <Text style={styles.adDescription}>Visit mwaikange.com for more information and services</Text>
          <Text style={styles.adLink}>www.mwaikange.com</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function NgumuAdCard() {
  return (
    <View style={styles.adCard}>
      <View style={styles.adHeaderBetween}>
        <View style={styles.adHeaderLeft}>
          <Ionicons name="megaphone-outline" size={14} color={colors.mutedForeground} />
          <Text style={styles.adLabel}>Sponsored</Text>
        </View>
        <View style={styles.adBadge}><Text style={styles.adBadgeText}>AD</Text></View>
      </View>
      <View style={styles.adBody}>
        <View style={styles.adIcon}>
          <Image source={ngumuLogo} style={styles.adLogoImage} resizeMode="cover" />
        </View>
        <View style={styles.adContent}>
          <Text style={styles.adTitle}>Ngumu's Eye</Text>
          <Text style={styles.adDescription}>Surveillance & Tracing Services CC</Text>
        </View>
      </View>
    </View>
  );
}

const PostCard = memo(function PostCard({
  post,
  onPress,
  onCommentPress,
  onAvatarPress,
  currentUserId,
}: {
  post: Post;
  onPress: () => void;
  onCommentPress: () => void;
  onAvatarPress: () => void;
  currentUserId: string;
}) {
  const [reactions, setReactions]         = useState<Set<ReactionType>>(new Set());
  const [reactionCounts, setReactionCounts] = useState({ upvote: 0, downvote: 0, love: 0, confirm: 0 });
  const [following, setFollowing]         = useState(false);
  const [shared, setShared]               = useState(false);
  const typeInfo = typeLabels[post.type] || typeLabels.alert;
  const localImage = postImages[post.id];

  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      const { data: myR } = await supabase
        .from('incident_reactions').select('reaction_type')
        .eq('incident_id', post.id).eq('user_id', currentUserId);
      if (myR) setReactions(new Set(myR.map((r: any) => r.reaction_type as ReactionType)));

      const { data: allR } = await supabase
        .from('incident_reactions').select('reaction_type').eq('incident_id', post.id);
      if (allR) {
        const counts = { upvote: 0, downvote: 0, love: 0, confirm: 0 };
        allR.forEach((r: any) => { if (r.reaction_type in counts) (counts as any)[r.reaction_type]++; });
        setReactionCounts(counts);
      }

      const { data: follow } = await supabase
        .from('incident_followers').select('user_id')
        .eq('incident_id', post.id).eq('user_id', currentUserId).maybeSingle();
      setFollowing(!!follow);
    })();
  }, [post.id, currentUserId]);

  const react = async (type: ReactionType) => {
    const prev = new Set(reactions);

    // Build next reaction set optimistically
    const next = new Set(prev);
    if (next.has(type)) {
      next.delete(type); // toggle off
    } else {
      if (type === 'upvote')   next.delete('downvote');
      if (type === 'downvote') next.delete('upvote');
      next.add(type);
    }

    // Apply optimistic updates — this drives the icon colors
    setReactions(next);
    setReactionCounts(c => {
      const n = { ...c };
      if (prev.has(type)) {
        n[type] = Math.max(0, n[type] - 1);
      } else {
        if (type === 'upvote'   && prev.has('downvote')) n.downvote = Math.max(0, n.downvote - 1);
        if (type === 'downvote' && prev.has('upvote'))   n.upvote   = Math.max(0, n.upvote   - 1);
        n[type]++;
      }
      return n;
    });

    try {
      await postsApi.react(post.id, type);
    } catch (e) {
      // Revert both on failure
      setReactions(prev);
      setReactionCounts(c => {
        const n = { ...c };
        if (prev.has(type)) { n[type]++; }
        else {
          n[type] = Math.max(0, n[type] - 1);
          if (type === 'upvote'   && prev.has('downvote')) n.downvote++;
          if (type === 'downvote' && prev.has('upvote'))   n.upvote++;
        }
        return n;
      });
    }
  };

  const handleShare = async () => {
    try { await Share.share({ message: `${post.title}\n\n${post.description}\n\nShared via Ngumu's Eye` }); } catch {}
    setShared(true);
  };

  const handleReport = () => {
    Alert.alert('Post Options', '', [
      {
        text: 'Report', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('incident_reports').insert({ incident_id: post.id, reported_by: currentUserId });
            Alert.alert('Reported', 'Thank you for reporting this post.');
          } catch {
            Alert.alert('Error', 'Failed to report. Please try again.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.postHeader}>
        <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
          {post.userAvatar ? (
            <Image source={{ uri: post.userAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{post.userName.charAt(0)}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <TouchableOpacity onPress={onAvatarPress}>
              <Text style={styles.userName}>{post.userName}</Text>
            </TouchableOpacity>
            {/* ── FIX #1: Always show green Verified badge for admin_verified posts ── */}
            {post.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#22C55E20' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                <Text style={[styles.verifiedText, { color: '#22C55E' }]}>Verified</Text>
              </View>
            )}
          </View>
          <View style={styles.locationTimeRow}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <Text style={styles.locationText}>{post.userTown}</Text>
            <Text style={styles.separator}>-</Text>
            <Text style={styles.timeText}>{formatTimeAgo(post.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={(e) => { e.stopPropagation(); handleReport(); }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.postBody}>
        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
          <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
        </View>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postDescription} numberOfLines={2}>{post.description}</Text>
      </View>

      {localImage ? (
        <Image source={localImage} style={styles.postImage} resizeMode="cover" />
      ) : post.images && post.images.length > 0 && (post.images[0].startsWith('http') || post.images[0].startsWith('data:')) ? (
        <Image source={{ uri: post.images[0] }} style={styles.postImage} resizeMode="cover" onError={() => {}} />
      ) : null}

      {/* ── Reactions + Follow ── */}
      <View style={styles.engagementBar}>
        <View style={styles.engagementLeft}>
          {/* Upvote */}
          <TouchableOpacity style={styles.engagementButton} onPress={(e) => { e.stopPropagation(); react('upvote'); }}>
            <Ionicons
              name={reactions.has('upvote') ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={20} color={reactions.has('upvote') ? '#22c55e' : colors.mutedForeground}
            />
            <Text style={[styles.engagementCount, reactions.has('upvote') && { color: '#22c55e', fontWeight: '600' }]}>
              {reactionCounts.upvote}
            </Text>
          </TouchableOpacity>

          {/* Downvote */}
          <TouchableOpacity style={styles.engagementButton} onPress={(e) => { e.stopPropagation(); react('downvote'); }}>
            <Ionicons
              name={reactions.has('downvote') ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
              size={20} color={reactions.has('downvote') ? '#f97316' : colors.mutedForeground}
            />
            <Text style={[styles.engagementCount, reactions.has('downvote') && { color: '#f97316', fontWeight: '600' }]}>
              {reactionCounts.downvote}
            </Text>
          </TouchableOpacity>

          {/* Love */}
          <TouchableOpacity style={styles.engagementButton} onPress={(e) => { e.stopPropagation(); react('love'); }}>
            <Ionicons
              name={reactions.has('love') ? 'heart' : 'heart-outline'}
              size={20} color={reactions.has('love') ? '#ef4444' : colors.mutedForeground}
            />
            <Text style={[styles.engagementCount, reactions.has('love') && { color: '#ef4444', fontWeight: '600' }]}>
              {reactionCounts.love}
            </Text>
          </TouchableOpacity>

          {/* Confirm */}
          <TouchableOpacity style={styles.engagementButton} onPress={(e) => { e.stopPropagation(); react('confirm'); }}>
            <Ionicons
              name={reactions.has('confirm') ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={20} color={reactions.has('confirm') ? '#3b82f6' : colors.mutedForeground}
            />
            <Text style={[styles.engagementCount, reactions.has('confirm') && { color: '#3b82f6', fontWeight: '600' }]}>
              {reactionCounts.confirm}
            </Text>
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity style={styles.engagementButton} onPress={onCommentPress}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.engagementCount}>{post.comments}</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.engagementButton} onPress={(e) => { e.stopPropagation(); handleShare(); }}>
            <Ionicons name="share-social-outline" size={20} color={shared ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Follow/unfollow bell */}
        <TouchableOpacity
          style={styles.followBtn}
          onPress={(e) => { e.stopPropagation(); toggleFollow(post.id, currentUserId, following, setFollowing); }}
        >
          <Ionicons
            name={following ? 'notifications' : 'notifications-outline'}
            size={20} color={following ? colors.primary : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const FilterTab = memo(function FilterTab({ tab, isActive, onPress }: { tab: string; isActive: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filterTab, isActive && styles.filterTabActive]} onPress={onPress}>
      <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{tab}</Text>
    </TouchableOpacity>
  );
});

const Header = memo(function Header({ onSearch }: { onSearch: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Community Feed</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.notificationButton} onPress={onSearch}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
        <NotificationBell />
      </View>
    </View>
  );
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolveMediaUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return supabase.storage.from('incident-media').getPublicUrl(path).data.publicUrl;
}

function rowToPost(row: any): Post {
  const profile  = row.profiles ?? {};
  const typeInfo = row.incident_types ?? {};
  const mediaPath = row.incident_media?.[0]?.path ?? null;
  return {
    id: row.id,
    userId: row.created_by ?? '',
    userName: profile.display_name ?? 'Anonymous',
    userAvatar: profile.avatar_url ?? '',
    userTown: row.town ?? '',
    type: typeInfo.label ?? row.type ?? 'incident',
    title: row.title ?? '',
    description: row.description ?? '',
    images: mediaPath ? [resolveMediaUrl(mediaPath)!] : [],
    radius: row.area_radius_m ?? 5000,
    createdAt: row.created_at,
    verified: !!row.admin_verified,
    verificationLevel: row.verification_level ?? 0,
    likes: row.upvotes ?? 0,
    comments: 0,
    shares: 0,
    latitude: row.lat ?? undefined,
    longitude: row.lng ?? undefined,
  };
}

const BASE_SELECT = `
  id, title, description, created_at, created_by,
  lat, lng, town, area_radius_m, verification_level, admin_verified,
  upvotes, expires_at,
  incident_types!type_id ( label, severity ),
  incident_media ( path ),
  profiles!incidents_created_by_fkey ( id, display_name, avatar_url )
`;

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter]     = useState('All');
  const [posts, setPosts]                   = useState<Post[]>([]);
  const [loading, setLoading]               = useState(true);
  const [tabLoading, setTabLoading]         = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [fetchError, setFetchError]         = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [currentUserId, setCurrentUserId]   = useState('');

  // ── FIX #2: Animated fade/blur while tab loading ──────────────────────────
  const listOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (tabLoading) {
      Animated.timing(listOpacity, { toValue: 0.25, duration: 150, useNativeDriver: true }).start();
    } else {
      Animated.timing(listOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [tabLoading]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setCurrentUserId(data.user.id); });
  }, []);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    try {
      setFetchError(null);
      if (!isRefresh) setTabLoading(true);
      const now = new Date().toISOString();

      if (activeFilter === 'All') {
        const { data, error } = await supabase.from('incidents').select(BASE_SELECT)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('created_at', { ascending: false }).limit(40);
        if (error) throw error;
        setPosts((data ?? []).map(rowToPost));

      } else if (activeFilter === 'Verified') {
        const { data, error } = await supabase.from('incidents').select(BASE_SELECT)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .eq('admin_verified', true)
          .order('created_at', { ascending: false }).limit(40);
        if (error) throw error;
        setPosts((data ?? []).map(rowToPost));

      } else if (activeFilter === 'Following') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPosts([]); return; }
        const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id);
        const ids = (follows ?? []).map((f: any) => f.following_id);
        if (ids.length === 0) { setPosts([]); return; }
        const { data, error } = await supabase.from('incidents').select(BASE_SELECT)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .in('created_by', ids)
          .order('created_at', { ascending: false }).limit(40);
        if (error) throw error;
        setPosts((data ?? []).map(rowToPost));

      } else if (activeFilter === 'Nearby') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setLocationDenied(true); setPosts([]); return; }
        setLocationDenied(false);
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: userLat, longitude: userLng } = loc.coords;
        const { data, error } = await supabase.from('incidents').select(BASE_SELECT)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .not('lat', 'is', null).not('lng', 'is', null)
          .order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        setPosts((data ?? []).filter((r: any) => haversineKm(userLat, userLng, r.lat, r.lng) <= 50).map(rowToPost));
      }
    } catch (error: any) {
      setFetchError(error.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
      setTabLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useFocusEffect(useCallback(() => { fetchPosts(); }, [fetchPosts]));

  const onRefresh        = useCallback(() => { setRefreshing(true); fetchPosts(true); }, [fetchPosts]);
  const handleFilterPress = useCallback((tab: string) => { setLocationDenied(false); setActiveFilter(tab); }, []);
  const handlePostPress   = useCallback((id: string) => navigation.navigate('IncidentDetails', { postId: id }), [navigation]);
  const handleCommentPress = useCallback((id: string) => navigation.navigate('IncidentDetails', { postId: id, initialTab: 'comments' }), [navigation]);
  const handleAvatarPress  = useCallback((uid: string) => navigation.navigate('PublicProfile', { userId: uid }), [navigation]);

  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    let adCount = 0;
    posts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      if ((index + 1) % 2 === 0 && index < posts.length - 1) {
        items.push({ type: 'ad', adType: adCount % 2 === 0 ? 'mwaikange' : 'ngumu', id: `ad-${index}` });
        adCount++;
      }
    });
    return items;
  }, [posts]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === 'ad') return item.adType === 'ngumu' ? <NgumuAdCard /> : <MwaikAngeAdCard />;
    return (
      <PostCard
        post={item.data}
        currentUserId={currentUserId}
        onPress={() => handlePostPress(item.data.id)}
        onCommentPress={() => handleCommentPress(item.data.id)}
        onAvatarPress={() => handleAvatarPress(item.data.userId)}
      />
    );
  }, [handlePostPress, handleCommentPress, handleAvatarPress, currentUserId]);

  const keyExtractor = useCallback((item: FeedItem) => item.type === 'ad' ? item.id : item.data.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header onSearch={() => navigation.navigate('Search')} />

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <FilterTab key={tab} tab={tab} isActive={activeFilter === tab} onPress={() => handleFilterPress(tab)} />
          ))}
        </View>
      </View>

      {tabLoading && (
        <View style={styles.tabLoadingBar}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.tabLoadingText}>Loading {activeFilter}...</Text>
        </View>
      )}

      {activeFilter === 'Nearby' && locationDenied && (
        <View style={styles.locationBanner}>
          <Ionicons name="location-outline" size={20} color="#f97316" />
          <Text style={styles.locationBannerText}>Enable location access to see nearby incidents</Text>
          <TouchableOpacity onPress={() => handleFilterPress('All')}>
            <Text style={styles.locationBannerLink}>View All</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: listOpacity }}>
          <FlatList
            data={feedItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              !tabLoading ? (
                <View style={styles.emptyContainer}>
                  {activeFilter === 'Nearby' && !locationDenied ? (
                    <Text style={styles.emptyText}>No incidents within 50km of your location</Text>
                  ) : activeFilter === 'Verified' ? (
                    <Text style={styles.emptyText}>No verified incidents yet</Text>
                  ) : activeFilter === 'Following' ? (
                    <Text style={styles.emptyText}>{"You're not following anyone yet.\nFollow users to see their posts here."}</Text>
                  ) : (
                    <Text style={styles.emptyText}>{fetchError || 'No incidents reported yet'}</Text>
                  )}
                </View>
              ) : null
            }
            ListFooterComponent={<View style={styles.bottomSpacing} />}
            removeClippedSubviews
            maxToRenderPerBatch={5}
            windowSize={5}
            initialNumToRender={3}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.background },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo:          { width: 36, height: 36, borderRadius: 8 },
  headerTitle:         { fontSize: 18, fontWeight: '600', color: colors.cardForeground },
  headerRight:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notificationButton:  { position: 'relative', padding: 8 },
  filterContainer:     { paddingHorizontal: spacing.md, paddingVertical: 12 },
  filterRow:           { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: 20, padding: 4 },
  filterTab:           { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  filterTabActive:     { backgroundColor: colors.cardForeground },
  filterTabText:       { fontSize: 12, fontWeight: '500', color: colors.mutedForeground },
  filterTabTextActive: { color: colors.card },
  loadingContainer:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  tabLoadingBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, backgroundColor: colors.muted },
  tabLoadingText:      { fontSize: 12, color: colors.mutedForeground },
  locationBanner:      { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, padding: 14, backgroundColor: '#fff7ed', borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa' },
  locationBannerText:  { flex: 1, fontSize: 13, color: '#92400e' },
  locationBannerLink:  { fontSize: 13, fontWeight: '600', color: colors.primary },
  postCard:            { backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 12 },
  postHeader:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, gap: 12 },
  avatar:              { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  avatarImage:         { width: 40, height: 40, borderRadius: 20 },
  avatarText:          { fontSize: 16, fontWeight: '600', color: colors.mutedForeground },
  headerInfo:          { flex: 1 },
  nameRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  userName:            { fontSize: 14, fontWeight: '600', color: colors.cardForeground },
  verifiedBadge:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText:        { fontSize: 11, fontWeight: '600' },
  locationTimeRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText:        { fontSize: 12, color: colors.mutedForeground },
  separator:           { fontSize: 12, color: colors.mutedForeground, marginHorizontal: 4 },
  timeText:            { fontSize: 12, color: colors.mutedForeground },
  moreButton:          { padding: 4 },
  postBody:            { paddingHorizontal: spacing.md, paddingBottom: 12 },
  typeBadge:           { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 8 },
  typeBadgeText:       { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  postTitle:           { fontSize: 16, fontWeight: '700', color: colors.cardForeground, lineHeight: 22 },
  postDescription:     { fontSize: 14, color: colors.mutedForeground, marginTop: 4, lineHeight: 20 },
  postImage:           { width: '100%', height: 300 },
  engagementBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 10 },
  engagementLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  engagementButton:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  engagementCount:     { fontSize: 13, color: colors.mutedForeground },
  followBtn:           { padding: 4 },
  adCard:              { backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 12, padding: spacing.md },
  adHeader:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  adLabel:             { fontSize: 12, color: colors.mutedForeground, fontWeight: '500' },
  adBody:              { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adIcon:              { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  adLogoImage:         { width: 56, height: 56, borderRadius: 8 },
  adHeaderBetween:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  adHeaderLeft:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adBadge:             { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  adBadgeText:         { fontSize: 10, fontWeight: '500', color: colors.mutedForeground },
  adContent:           { flex: 1 },
  adTitle:             { fontSize: 16, fontWeight: '700', color: colors.cardForeground, marginBottom: 2 },
  adDescription:       { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  adLink:              { fontSize: 13, color: colors.primary, marginTop: 4, fontWeight: '500' },
  emptyContainer:      { paddingVertical: 32, alignItems: 'center' },
  emptyText:           { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: 24 },
  bottomSpacing:       { height: 20 },
});
