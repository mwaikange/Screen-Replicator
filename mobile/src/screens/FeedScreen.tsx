import { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../lib/theme';
import { postsApi } from '../lib/api';
import { Post } from '../lib/types';
import { Image } from 'react-native';

const appLogo = require('../../assets/logo.jpg');

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

const PostCard = memo(function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const typeInfo = typeLabels[post.type] || typeLabels.alert;

  return (
    <View style={styles.postCard}>
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

      {post.images && post.images.length > 0 && (
        <Image
          source={{ uri: post.images[0] }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.engagementBar}>
        <View style={styles.engagementLeft}>
          <TouchableOpacity
            style={styles.engagementButton}
            onPress={() => setLiked(!liked)}
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
          <TouchableOpacity style={styles.engagementButton}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.engagementCount}>{post.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementButton}>
            <Ionicons name="share-social-outline" size={20} color={colors.mutedForeground} />
            <Text style={styles.engagementCount}>{post.shares}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setSaved(!saved)}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={saved ? colors.cardForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
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
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <Text style={styles.searchText}>Se</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function FeedScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await postsApi.getAll(activeFilter);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  const handleFilterPress = useCallback((tab: string) => {
    setActiveFilter(tab);
  }, []);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} />
  ), []);

  const keyExtractor = useCallback((item: Post) => item.id, []);

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
          data={posts}
          renderItem={renderPost}
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
              <Text style={styles.emptyText}>No posts found</Text>
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
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchText: {
    fontSize: 14,
    color: colors.mutedForeground,
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
    fontSize: 14,
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
