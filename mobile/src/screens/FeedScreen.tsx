import { useState, useEffect, useCallback, memo, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../lib/theme';
import { postsApi, postImages } from '../lib/api';
import { Post } from '../lib/types';
import { Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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
  missing_person: { label: 'Missing Person', color: '#ef4444' },
  incident: { label: 'Crime Report', color: '#ef4444' },
  alert: { label: 'Emergency Alert', color: '#ea580c' },
  gender_based_violence: { label: 'Gender-Based Violence', color: '#9333ea' },
  theft: { label: 'Theft', color: '#dc2626' },
  suspicious_activity: { label: 'Suspicious Activity', color: '#ca8a04' },
};

type FeedItem = { type: 'post'; data: Post } | { type: 'ad'; adType: 'mwaikange' | 'ngumu'; id: string };

function MwaikAngeAdCard() {
  const handlePress = () => {
    Linking.openURL('https://www.mwaikange.com/');
  };

  return (
    <TouchableOpacity style={styles.adCard} onPress={handlePress} activeOpacity={0.8}>
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
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>AD</Text>
        </View>
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

const PostCard = memo(function PostCard({ post, onPress, onCommentPress }: { post: Post; onPress: () => void; onCommentPress: () => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const typeInfo = typeLabels[post.type] || typeLabels.alert;
  const localImage = postImages[post.id];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.title}\n\n${post.description}\n\nShared via Ngumu's Eye`,
      });
    } catch {}
    if (!shared) setShared(true);
  };

  return (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.userName.charAt(0)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{post.userName}</Text>
            {post.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
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
        <TouchableOpacity style={styles.moreButton}>
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
      ) : post.images && post.images.length > 0 && !post.images[0].startsWith('local:') ? (
        <Image source={{ uri: post.images[0] }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      <View style={styles.engagementBar}>
        <View style={styles.engagementLeft}>
          <TouchableOpacity
            style={styles.engagementButton}
            onPress={(e) => { e.stopPropagation(); setLiked(!liked); }}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#ef4444' : colors.mutedForeground}
            />
            <Text style={[styles.engagementCount, liked && styles.engagementCountLiked]}>
              {post.likes + (liked ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementButton} onPress={onCommentPress}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.engagementCount}>{post.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={shared ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.engagementCount, shared && { color: colors.primary, fontWeight: '600' }]}>
              {post.shares + (shared ? 1 : 0)}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSaved(!saved); }}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saved ? colors.cardForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const FilterTab = memo(function FilterTab({
  tab,
  isActive,
  onPress,
}: {
  tab: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterTab, isActive && styles.filterTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
        {tab}
      </Text>
    </TouchableOpacity>
  );
});

const Header = memo(function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>Community Feed</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState('All');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setFetchError(null);
      const response = await postsApi.getAll(activeFilter);
      setPosts(response.data);
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
      setFetchError(error.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  const handleFilterPress = useCallback((tab: string) => {
    setActiveFilter(tab);
  }, []);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate('IncidentDetails', { postId });
  }, [navigation]);

  const handleCommentPress = useCallback((postId: string) => {
    navigation.navigate('IncidentDetails', { postId, initialTab: 'comments' });
  }, [navigation]);

  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    let adCount = 0;
    posts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      if ((index + 1) % 2 === 0 && index < posts.length - 1) {
        const adType = adCount % 2 === 0 ? 'mwaikange' : 'ngumu';
        items.push({ type: 'ad', adType, id: `ad-${index}` });
        adCount++;
      }
    });
    return items;
  }, [posts]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === 'ad') {
      return item.adType === 'ngumu' ? <NgumuAdCard /> : <MwaikAngeAdCard />;
    }
    return (
      <PostCard
        post={item.data}
        onPress={() => handlePostPress(item.data.id)}
        onCommentPress={() => handleCommentPress(item.data.id)}
      />
    );
  }, [handlePostPress, handleCommentPress]);

  const keyExtractor = useCallback((item: FeedItem) => {
    if (item.type === 'ad') return item.id;
    return item.data.id;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => (
            <FilterTab
              key={tab}
              tab={tab}
              isActive={activeFilter === tab}
              onPress={() => handleFilterPress(tab)}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{fetchError || 'No posts yet'}</Text>
            </View>
          }
          ListFooterComponent={<View style={styles.bottomSpacing} />}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={3}
        />
      )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: 20,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: colors.cardForeground,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  filterTabTextActive: {
    color: colors.card,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  postCard: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  verifiedBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: colors.cardForeground,
  },
  locationTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  separator: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginHorizontal: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  moreButton: {
    padding: 4,
  },
  postBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
    lineHeight: 22,
  },
  postDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementCount: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  engagementCountLiked: {
    color: '#ef4444',
    fontWeight: '500',
  },
  adCard: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    padding: spacing.md,
  },
  adHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  adLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  adBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  adLogoImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  adHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  adHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  adBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  adContent: {
    flex: 1,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: 2,
  },
  adDescription: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  adLink: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  bottomSpacing: {
    height: 20,
  },
});
