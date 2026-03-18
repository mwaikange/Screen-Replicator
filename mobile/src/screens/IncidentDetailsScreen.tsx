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
import { supabase } from '../lib/supabase';
import { sendCommentNotifications } from './FeedScreen';
import { Post, Comment, TimelineEvent } from '../lib/types';

const typeLabels: Record<string, { label: string; bgColor: string }> = {
  ALERT: { label: 'Emergency Alert', bgColor: '#EF4444' },
  CRIME: { label: 'Crime Report', bgColor: '#F97316' },
  GBV: { label: 'Gender-Based Violence', bgColor: '#9333ea' },
  FIRE: { label: 'Fire Emergency', bgColor: '#EF4444' },
  MEDICAL: { label: 'Medical Emergency', bgColor: '#EF4444' },
  MISSING: { label: 'Missing Person', bgColor: '#F97316' },
  SUSPICIOUS: { label: 'Suspicious Activity', bgColor: '#EAB308' },
  LOST: { label: 'Lost & Found', bgColor: '#BEF264' },
  missing_person: { label: 'Missing Person', bgColor: '#ef4444' },
  incident: { label: 'Crime Report', bgColor: '#ef4444' },
  alert: { label: 'Emergency Alert', bgColor: '#ea580c' },
  gender_based_violence: { label: 'Gender-Based Violence', bgColor: '#9333ea' },
  theft: { label: 'Theft', bgColor: '#dc2626' },
  suspicious_activity: { label: 'Suspicious Activity', bgColor: '#ca8a04' },
};

const VERIFICATION: Record<number, { label: string; color: string } | null> = {
  0: null,
  1: { label: 'Reported', color: '#EAB308' },
  2: { label: 'Confirmed', color: '#3B82F6' },
  3: { label: 'Verified', color: '#22C55E' },
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
  const { postId, initialTab } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'media' | 'comments'>(initialTab || 'timeline');
  const [commentText, setCommentText] = useState('');
  const [reactions, setReactions]       = useState<Set<string>>(new Set());
  const [reactionCounts, setReactionCounts] = useState({ upvote: 0, downvote: 0, love: 0, confirm: 0 });
  const [following, setFollowing]         = useState(false);
  const [shared, setShared]               = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    trust_score: number;
    followers: number;
    isFollowing: boolean;
  } | null>(null);
  const [creatorFollowLoading, setCreatorFollowLoading] = useState(false);

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
    // Load current user + their reactions + follow state
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: myR } = await supabase
        .from('incident_reactions').select('reaction_type')
        .eq('incident_id', postId).eq('user_id', user.id);
      if (myR) setReactions(new Set(myR.map((r: any) => r.reaction_type)));

      const { data: allR } = await supabase
        .from('incident_reactions').select('reaction_type').eq('incident_id', postId);
      if (allR) {
        const counts = { upvote: 0, downvote: 0, love: 0, confirm: 0 };
        allR.forEach((r: any) => { if (r.reaction_type in counts) (counts as any)[r.reaction_type]++; });
        setReactionCounts(counts);
      }

      const { data: follow } = await supabase
        .from('incident_followers').select('user_id')
        .eq('incident_id', postId).eq('user_id', user.id).maybeSingle();
      setFollowing(!!follow);
    })();
  }, [loadData, postId]);

  const handleReact = async (type: 'upvote' | 'downvote' | 'love' | 'confirm') => {
    // Cannot react to own post
    if (post?.userId && post.userId === currentUserId) return;
    const prev = new Set(reactions);
    const next = new Set(prev);
    if (next.has(type)) {
      next.delete(type);
    } else {
      if (type === 'upvote')   next.delete('downvote');
      if (type === 'downvote') next.delete('upvote');
      next.add(type);
    }
    // Optimistic UI
    setReactions(next);
    setReactionCounts(c => {
      const n = { ...c };
      if (prev.has(type)) { n[type as keyof typeof n] = Math.max(0, n[type as keyof typeof n] - 1); }
      else {
        if (type === 'upvote'   && prev.has('downvote')) n.downvote = Math.max(0, n.downvote - 1);
        if (type === 'downvote' && prev.has('upvote'))   n.upvote   = Math.max(0, n.upvote - 1);
        n[type as keyof typeof n]++;
      }
      return n;
    });
    try {
      await postsApi.react(postId, type);
    } catch {
      setReactions(prev); // revert on failure
    }
  };

  const handleFollow = async () => {
    const next = !following;
    setFollowing(next);
    try {
      if (next) {
        await supabase.from('incident_followers').insert({ incident_id: postId, user_id: currentUserId });
      } else {
        await supabase.from('incident_followers').delete()
          .eq('incident_id', postId).eq('user_id', currentUserId);
      }
    } catch { setFollowing(!next); }
  };

  const openCreatorModal = async () => {
    if (!post?.userId) return;
    setShowCreatorModal(true);
    try {
      // Fetch creator profile + follower count + whether current user follows them
      const [profileRes, followCountRes, isFollowingRes] = await Promise.all([
        supabase.from('profiles').select('id, display_name, avatar_url, trust_score').eq('id', post.userId).maybeSingle(),
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', post.userId),
        supabase.from('user_follows').select('follower_id').eq('follower_id', currentUserId).eq('following_id', post.userId).maybeSingle(),
      ]);
      setCreatorProfile({
        id: post.userId,
        display_name: profileRes.data?.display_name ?? post.userName,
        avatar_url: profileRes.data?.avatar_url ?? null,
        trust_score: profileRes.data?.trust_score ?? 0,
        followers: followCountRes.count ?? 0,
        isFollowing: !!isFollowingRes.data,
      });
    } catch (e) {
      console.error('[creatorModal]', e);
    }
  };

  const handleCreatorFollow = async () => {
    if (!creatorProfile || creatorFollowLoading) return;
    setCreatorFollowLoading(true);
    const next = !creatorProfile.isFollowing;
    setCreatorProfile(p => p ? { ...p, isFollowing: next, followers: next ? p.followers + 1 : p.followers - 1 } : p);
    try {
      if (next) {
        await supabase.from('user_follows').insert({ follower_id: currentUserId, following_id: creatorProfile.id });
        // Notify creator
        if (creatorProfile.id !== currentUserId) {
          await supabase.from('user_notifications').insert({
            user_id: creatorProfile.id,
            type: 'new_follower',
            title: 'New Follower',
            message: 'Someone started following you',
            entity_id: currentUserId,
          });
        }
      } else {
        await supabase.from('user_follows').delete()
          .eq('follower_id', currentUserId).eq('following_id', creatorProfile.id);
      }
    } catch {
      // revert
      setCreatorProfile(p => p ? { ...p, isFollowing: !next, followers: next ? p.followers - 1 : p.followers + 1 } : p);
    } finally {
      setCreatorFollowLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post?.title}\n\n${post?.description}\n\nShared via Ngumu's Eye`,
      });
    } catch {}
    if (!shared) setShared(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !currentUserId) return;
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
    // Notify post owner + followers
    // Get commenter's real display name from profiles table
    const { data: commenterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', currentUserId)
      .maybeSingle();
    const commenterName = commenterProfile?.display_name ?? 'Someone';

    // Always send — sendCommentNotifications handles exclusions internally
    if (postRes.data?.userId) {
      await sendCommentNotifications(
        postId, postRes.data.title, postRes.data.userId,
        currentUserId, commenterName
      );
    }
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
  const remoteImages = (post.images || []).filter(img => img.startsWith('http') || img.startsWith('data:'));
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
              {VERIFICATION[post.verificationLevel || 0] && (
                <View style={[styles.verifiedBadge, { backgroundColor: VERIFICATION[post.verificationLevel || 0]!.color + '20', borderColor: VERIFICATION[post.verificationLevel || 0]!.color }]}>
                  <Ionicons name="checkmark-circle" size={12} color={VERIFICATION[post.verificationLevel || 0]!.color} />
                  <Text style={[styles.verifiedBadgeText, { color: VERIFICATION[post.verificationLevel || 0]!.color }]}>
                    {VERIFICATION[post.verificationLevel || 0]!.label}
                  </Text>
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
              <TouchableOpacity
                style={styles.detailItem}
                onPress={() => post.userId && navigation.navigate('PublicProfile', { userId: post.userId })}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
                <View>
                  <Text style={styles.detailLabel}>Reporter</Text>
                  <Text style={[styles.detailValue, { color: colors.primary }]}>{post.userName}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.votesRow}>
              <View style={styles.voteButtons}>
                <TouchableOpacity
                  style={[styles.voteButton, reactions.has('upvote') && styles.voteButtonActiveUp]}
                  onPress={() => handleReact('upvote')}
                >
                  <Ionicons
                    name="thumbs-up-outline"
                    size={16}
                    color={reactions.has('upvote') ? '#22c55e' : colors.mutedForeground}
                  />
                  <Text style={[styles.voteCount, reactions.has('upvote') && styles.voteCountActiveUp]}>
                    {reactionCounts.upvote}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voteButton, reactions.has('downvote') && styles.voteButtonActiveDown]}
                  onPress={() => handleReact('downvote')}
                >
                  <Ionicons
                    name="thumbs-down-outline"
                    size={16}
                    color={reactions.has('downvote') ? '#ef4444' : colors.mutedForeground}
                  />
                  <Text style={[styles.voteCount, reactions.has('downvote') && styles.voteCountActiveDown]}>
                    {reactionCounts.downvote}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.likeButton} onPress={() => handleReact('love')}>
                <Ionicons
                  name={reactions.has('love') ? 'heart' : 'heart-outline'}
                  size={16}
                  color={reactions.has('love') ? '#ef4444' : colors.mutedForeground}
                />
                <Text style={[styles.likeCount, reactions.has('love') && { color: '#ef4444' }]}>
                  {reactionCounts.love}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color={shared ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.shareCount, shared && { color: colors.primary }]}>
                  {post.shares + (shared ? 1 : 0)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.actionButtons, { gap: 10 }]}>
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followBtnActive]}
                onPress={handleFollow}
              >
                <Ionicons
                  name={following ? 'notifications' : 'notifications-outline'}
                  size={18}
                  color={following ? '#fff' : colors.primary}
                />
                <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={18} color={colors.cardForeground} />
                <Text style={styles.shareBtnText}>Share</Text>
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
  const remoteImages = (post.images || []).filter(img => img.startsWith('http') || img.startsWith('data:'));
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
          <Image source={{ uri: img }} style={styles.mediaImage} resizeMode="cover" onError={() => {}} />
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
            <TouchableOpacity
              onPress={() => comment.userId && navigation.navigate('PublicProfile', { userId: comment.userId })}
              activeOpacity={0.8}
            >
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{comment.userName.charAt(0)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.commentBody}>
              <View style={styles.commentHeader}>
                <TouchableOpacity onPress={() => comment.userId && navigation.navigate('PublicProfile', { userId: comment.userId })}>
                  <Text style={[styles.commentAuthor, { color: colors.primary }]}>{comment.userName}</Text>
                </TouchableOpacity>
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
    gap: 10,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  followBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  followBtnTextActive: {
    color: '#fff',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  // keep old names to avoid breaking anything else
  actionButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  actionButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionButtonText: { fontSize: 14, color: colors.cardForeground },
  actionButtonTextActive: { color: colors.primaryForeground },
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
  // Creator modal
  modalBackdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  creatorSheet:         { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  sheetHandle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  creatorSheetTitle:    { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  creatorRow:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  creatorAvatar:        { width: 56, height: 56, borderRadius: 28 },
  creatorAvatarFallback: { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  creatorAvatarText:    { fontSize: 22, fontWeight: '700', color: colors.cardForeground },
  creatorInfo:          { flex: 1, gap: 4 },
  creatorName:          { fontSize: 16, fontWeight: '700', color: colors.cardForeground },
  creatorMeta:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trustBadge:           { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#22c55e18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trustScore:           { fontSize: 11, fontWeight: '600', color: '#22c55e' },
  creatorFollowers:     { fontSize: 12, color: colors.mutedForeground },
  creatorFollowBtn:     { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  creatorFollowBtnActive: { backgroundColor: colors.muted },
  creatorFollowText:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  creatorFollowTextActive: { color: colors.mutedForeground },
});
