import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Share,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../lib/theme';
import { postsApi, postImages } from '../lib/api';
import { Post, Comment, TimelineEvent } from '../lib/types';

const typeLabels: Record<string, { label: string; bgColor: string }> = {
  missing_person: { label: 'Missing Person', bgColor: '#ef4444' },
  incident: { label: 'Crime Report', bgColor: '#ef4444' },
  alert: { label: 'Emergency Alert', bgColor: '#ea580c' },
  gender_based_violence: { label: 'Gender-Based Violence', bgColor: '#9333ea' },
  theft: { label: 'Theft', bgColor: '#dc2626' },
  suspicious_activity: { label: 'Suspicious Activity', bgColor: '#ca8a04' },
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'less than a minute ago';
  if (diffMins < 60) return `about ${diffMins} minutes ago`;
  if (diffHours < 24) return `about ${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function IncidentDetailsScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'media' | 'comments'>('timeline');
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [postRes, commentsRes, timelineRes] = await Promise.all([
      postsApi.getById(postId),
      postsApi.getComments(postId),
      postsApi.getTimeline(postId),
    ]);
    setPost(postRes.data);
    setComments(commentsRes.data);
    setTimeline(timelineRes.data);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVote = async (vote: 'up' | 'down') => {
    await postsApi.vote(postId, vote);
    const res = await postsApi.getById(postId);
    setPost(res.data);
  };

  const handleLike = async () => {
    if (!liked) {
      await postsApi.like(postId);
      const res = await postsApi.getById(postId);
      setPost(res.data);
    }
    setLiked(!liked);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post?.title}\n\n${post?.description}\n\nShared via Ngumu's Eye`,
      });
    } catch {}
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    await postsApi.addComment(postId, commentText.trim());
    setCommentText('');
    const [postRes, commentsRes, timelineRes] = await Promise.all([
      postsApi.getById(postId),
      postsApi.getComments(postId),
      postsApi.getTimeline(postId),
    ]);
    setPost(postRes.data);
    setComments(commentsRes.data);
    setTimeline(timelineRes.data);
    Alert.alert('Comment posted');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Incident Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <View style={[styles.skeleton, { width: 80, height: 24, marginBottom: 12 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 28, marginBottom: 8 }]} />
          <View style={[styles.skeleton, { width: '75%', height: 16, marginBottom: 16 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 80 }]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Incident Details</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>Post not found</Text>
          <TouchableOpacity style={styles.backToFeedButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backToFeedText}>Back to Feed</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeInfo = typeLabels[post.type] || typeLabels.alert;
  const localImage = postImages[post.id];
  const remoteImages = (post.images || []).filter(img => !img.startsWith('local:'));
  const mediaCount = (localImage ? 1 : 0) + remoteImages.length;

  const tabs = [
    { key: 'timeline' as const, label: 'Timeline' },
    { key: 'media' as const, label: `Media (${mediaCount})` },
    { key: 'comments' as const, label: `Comments (${post.comments})` },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Details</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.detailCard}>
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeInfo.bgColor }]}>
                <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
              </View>
              {post.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Partner Verified</Text>
                </View>
              )}
            </View>

            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postDescription}>{post.description}</Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.detailLabel}>Reported</Text>
                  <Text style={styles.detailValue}>{formatTimeAgo(post.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{post.radius}m radius</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.detailLabel}>Town</Text>
                  <Text style={styles.detailValue}>{post.userTown}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.detailLabel}>Reporter</Text>
                  <Text style={styles.detailValue}>{post.userName}</Text>
                </View>
              </View>
            </View>

            <View style={styles.votesRow}>
              <View style={styles.voteButtons}>
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    post.votes?.userVote === 'up' && styles.voteButtonActiveUp,
                  ]}
                  onPress={() => handleVote('up')}
                >
                  <Ionicons
                    name="thumbs-up-outline"
                    size={16}
                    color={post.votes?.userVote === 'up' ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.voteCount,
                      post.votes?.userVote === 'up' && styles.voteCountActiveUp,
                    ]}
                  >
                    {post.votes?.upvotes || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    post.votes?.userVote === 'down' && styles.voteButtonActiveDown,
                  ]}
                  onPress={() => handleVote('down')}
                >
                  <Ionicons
                    name="thumbs-down-outline"
                    size={16}
                    color={post.votes?.userVote === 'down' ? '#ef4444' : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.voteCount,
                      post.votes?.userVote === 'down' && styles.voteCountActiveDown,
                    ]}
                  >
                    {post.votes?.downvotes || 0}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={16}
                  color={liked || post.likes > 0 ? '#ef4444' : colors.mutedForeground}
                />
                <Text style={[styles.likeCount, (liked || post.likes > 0) && { color: '#ef4444' }]}>
                  {post.likes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color={colors.mutedForeground} />
                <Text style={styles.shareCount}>{post.shares}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, following && styles.actionButtonActive]}
                onPress={() => setFollowing(!following)}
              >
                <Text style={[styles.actionButtonText, following && styles.actionButtonTextActive]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabBar}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'timeline' && (
              <TimelineTab events={timeline} />
            )}
            {activeTab === 'media' && (
              <MediaTab post={post} localImage={localImage} />
            )}
            {activeTab === 'comments' && (
              <CommentsTab
                comments={comments}
                commentText={commentText}
                setCommentText={setCommentText}
                onSubmit={handleSubmitComment}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TimelineTab({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyTabText}>No timeline events</Text>
      </View>
    );
  }

  return (
    <View>
      {events.map((event) => (
        <View key={event.id} style={styles.timelineItem}>
          <View style={styles.timelineAvatar}>
            <Text style={styles.timelineAvatarText}>{event.userName.charAt(0)}</Text>
          </View>
          <View style={styles.timelineInfo}>
            <Text style={styles.timelineName}>{event.userName}</Text>
            <Text style={styles.timelineType}>{event.type.replace('_', ' ')}</Text>
            <Text style={styles.timelineDesc}>{event.description}</Text>
          </View>
          <Text style={styles.timelineTime}>{formatTimeAgo(event.createdAt)}</Text>
        </View>
      ))}
    </View>
  );
}

function MediaTab({ post, localImage }: { post: Post; localImage: any }) {
  const remoteImages = (post.images || []).filter(img => !img.startsWith('local:'));
  const hasMedia = localImage || remoteImages.length > 0;

  if (!hasMedia) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyTabText}>No media attached</Text>
      </View>
    );
  }

  return (
    <View style={styles.mediaGrid}>
      {localImage && (
        <View style={styles.mediaItem}>
          <Image source={localImage} style={styles.mediaImage} resizeMode="cover" />
        </View>
      )}
      {remoteImages.map((img, index) => (
        <View key={index} style={styles.mediaItem}>
          <Image source={{ uri: img }} style={styles.mediaImage} resizeMode="cover" />
        </View>
      ))}
    </View>
  );
}

function CommentsTab({
  comments,
  commentText,
  setCommentText,
  onSubmit,
}: {
  comments: Comment[];
  commentText: string;
  setCommentText: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View>
      <View style={styles.commentInput}>
        <TextInput
          style={styles.commentTextInput}
          placeholder="Add a comment..."
          placeholderTextColor={colors.mutedForeground}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <View style={styles.commentActions}>
          <View style={styles.commentMeta}>
            <TouchableOpacity style={styles.imageAttachButton}>
              <Ionicons name="image-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.imageAttachText}>Image</Text>
            </TouchableOpacity>
            <Text style={styles.charCount}>{commentText.length}/500</Text>
          </View>
          <TouchableOpacity
            style={[styles.postCommentButton, !commentText.trim() && styles.postCommentButtonDisabled]}
            onPress={onSubmit}
            disabled={!commentText.trim()}
          >
            <Text style={styles.postCommentText}>Post Comment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {comments.length === 0 ? (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabText}>No comments yet. Be the first to comment.</Text>
        </View>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} style={styles.commentItem}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>{comment.userName.charAt(0)}</Text>
            </View>
            <View style={styles.commentBody}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{comment.userName}</Text>
                <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.text}</Text>
            </View>
          </View>
        ))
      )}
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
    gap: 12,
    paddingHorizontal: spacing.md,
    height: 53,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    color: colors.mutedForeground,
  },
  scrollContent: {
    flex: 1,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  verifiedBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: colors.cardForeground,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
    lineHeight: 24,
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  votesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  voteButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voteButtonActiveUp: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  voteButtonActiveDown: {
    backgroundColor: '#ef444415',
    borderColor: '#ef4444',
  },
  voteCount: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  voteCountActiveUp: {
    color: colors.primary,
  },
  voteCountActiveDown: {
    color: '#ef4444',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shareCount: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  actionButtonTextActive: {
    color: colors.primaryForeground,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    minHeight: 200,
  },
  emptyTab: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTabText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  timelineAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  timelineInfo: {
    flex: 1,
  },
  timelineName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  timelineType: {
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: 'capitalize',
  },
  timelineDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  timelineTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  mediaItem: {
    width: '50%',
    aspectRatio: 1,
    padding: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  commentInput: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  commentTextInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: colors.cardForeground,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageAttachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageAttachText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  charCount: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  postCommentButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  postCommentButtonDisabled: {
    opacity: 0.5,
  },
  postCommentText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cardForeground,
  },
  commentTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  commentContent: {
    fontSize: 14,
    color: colors.cardForeground,
    marginTop: 2,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: spacing.md,
    gap: 0,
  },
  skeleton: {
    backgroundColor: colors.muted,
    borderRadius: 6,
  },
  backToFeedButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backToFeedText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
});
