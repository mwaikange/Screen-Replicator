import { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../lib/theme';
import { postsApi } from '../lib/api';
import { Post } from '../lib/types';

const appLogo = require('../../assets/logo.jpg');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const filterTabs = ['All', 'Nearby', 'Verified', 'Following'];

const PostCard = memo(function PostCard({ 
  post, 
  typeLabels 
}: { 
  post: Post; 
  typeLabels: Record<string, { label: string; color: string }>;
}) {
  const typeInfo = typeLabels[post.type] || typeLabels.alert;

  return (
    <View style={styles.postCard}>
      {post.images && post.images.length > 0 && (
        <View style={styles.imageGrid}>
          {post.images.slice(0, 2).map((img, idx) => (
            <View key={idx} style={styles.imagePlaceholder}>
              <Image 
                source={{ uri: img }} 
                style={styles.postImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.postContent}>
        <View style={[styles.badge, { backgroundColor: typeInfo.color }]}>
          <Text style={styles.badgeText}>{typeInfo.label}</Text>
        </View>
        
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postDescription} numberOfLines={2}>
          {post.description}
        </Text>
        
        <View style={styles.postMeta}>
          <Text style={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString() === new Date().toLocaleDateString() 
              ? 'Today' 
              : post.createdAt}
          </Text>
          <Text style={styles.postRadius}>{post.radius}m Radius</Text>
        </View>

        <View style={styles.postFooter}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={colors.mutedForeground} />
            </View>
            <View>
              <Text style={styles.userName}>{post.userName}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.userTown}>{post.userTown}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.followButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Follow user"
            accessibilityRole="button"
          >
            <Ionicons name="person-add-outline" size={16} color={colors.cardForeground} />
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const SamplePostCard = memo(function SamplePostCard() {
  return (
    <View style={styles.postCard}>
      <View style={styles.imageGrid}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
        </View>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
        </View>
      </View>
      
      <View style={styles.postContent}>
        <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
          <Text style={styles.badgeText}>Missing Person</Text>
        </View>
        
        <Text style={styles.postTitle}>MISSING CHILD REPORT</Text>
        <Text style={styles.postDescription} numberOfLines={2}>
          Child is wearing a t-shirt and nappy only. No shoes so if seen please do contact the parents...
        </Text>
        
        <View style={styles.postMeta}>
          <Text style={styles.postDate}>Today</Text>
          <Text style={styles.postRadius}>200m Radius</Text>
        </View>

        <View style={styles.postFooter}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={colors.mutedForeground} />
            </View>
            <View>
              <Text style={styles.userName}>Cykes man</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                <Text style={styles.userTown}>Swakopmund</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.followButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.cardForeground} />
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const FilterTab = memo(function FilterTab({ 
  tab, 
  isActive, 
  onPress 
}: { 
  tab: string; 
  isActive: boolean; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterTab, isActive && styles.filterTabActive]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityLabel={`Filter by ${tab}`}
      accessibilityState={{ selected: isActive }}
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
      <TouchableOpacity 
        style={styles.notificationButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
      >
        <Ionicons name="notifications-outline" size={24} color={colors.mutedForeground} />
        <View style={styles.notificationBadge} />
      </TouchableOpacity>
    </View>
  );
});

export default function FeedScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const typeLabels: Record<string, { label: string; color: string }> = {
    missing_person: { label: 'Missing Person', color: colors.destructive },
    incident: { label: 'Incident', color: colors.warning },
    alert: { label: 'Alert', color: colors.primary },
  };

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
    <PostCard post={item} typeLabels={typeLabels} />
  ), [typeLabels]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    loading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    ) : (
      <SamplePostCard />
    )
  ), [loading]);

  const ListFooterComponent = useCallback(() => (
    <View style={styles.bottomSpacing} />
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterTabs}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <FilterTab
              tab={item}
              isActive={activeFilter === item}
              onPress={() => handleFilterPress(item)}
            />
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={3}
        getItemLayout={(data, index) => ({
          length: 320,
          offset: 320 * index,
          index,
        })}
      />
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },
  filterContainer: {
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
  },
  filterList: {
    paddingHorizontal: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.muted,
    marginRight: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    color: colors.cardForeground,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.primaryForeground,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageGrid: {
    flexDirection: 'row',
    height: 160,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postContent: {
    padding: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  postTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
  },
  postDescription: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  postDate: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  postRadius: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  userName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userTown: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
    marginLeft: 2,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  followText: {
    fontSize: fontSize.sm,
    color: colors.cardForeground,
    marginLeft: spacing.xs,
  },
  bottomSpacing: {
    height: 20,
  },
});
