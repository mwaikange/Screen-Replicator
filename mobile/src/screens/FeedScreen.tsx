import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../lib/theme';
import { postsApi } from '../lib/api';
import { Post } from '../lib/types';

const filterTabs = ['All', 'Nearby', 'Verified', 'Following'];

export default function FeedScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await postsApi.getAll(activeFilter);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    missing_person: { label: 'Missing Person', color: colors.destructive },
    incident: { label: 'Incident', color: colors.warning },
    alert: { label: 'Alert', color: colors.primary },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPlaceholder}>
            <Ionicons name="eye" size={24} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Community Feed</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                activeFilter === tab && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === tab && styles.filterTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} typeLabels={typeLabels} />
          ))
        ) : (
          <SamplePostCard typeLabels={typeLabels} />
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PostCard({ post, typeLabels }: { post: Post; typeLabels: any }) {
  const typeInfo = typeLabels[post.type] || typeLabels.alert;

  return (
    <View style={styles.postCard}>
      {post.images && post.images.length > 0 && (
        <View style={styles.imageGrid}>
          {post.images.slice(0, 2).map((img, idx) => (
            <View key={idx} style={styles.imagePlaceholder}>
              <Image source={{ uri: img }} style={styles.postImage} />
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
          <TouchableOpacity style={styles.followButton}>
            <Ionicons name="person-add-outline" size={16} color={colors.cardForeground} />
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SamplePostCard({ typeLabels }: { typeLabels: any }) {
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
          <TouchableOpacity style={styles.followButton}>
            <Ionicons name="person-add-outline" size={16} color={colors.cardForeground} />
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.xs,
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
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.muted,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    color: colors.cardForeground,
  },
  filterTabTextActive: {
    color: colors.primaryForeground,
  },
  content: {
    flex: 1,
    padding: spacing.md,
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
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  userTown: {
    fontSize: fontSize.xs,
    color: colors.mutedForeground,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followText: {
    fontSize: fontSize.sm,
    color: colors.cardForeground,
  },
  bottomSpacing: {
    height: 80,
  },
});
