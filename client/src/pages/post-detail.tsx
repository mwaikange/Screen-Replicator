import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BottomNav } from "@/components/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Share2,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import type { Post, Comment, TimelineEvent, PostVotes } from "@shared/schema";

type PostWithVotes = Post & { votes: PostVotes };

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "less than a minute ago";
  if (diffMins < 60) return `about ${diffMins} minutes ago`;
  if (diffHours < 24) return `about ${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const initialTab = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "comments" ? "comments" : "timeline";
  const [activeTab, setActiveTab] = useState<"timeline" | "media" | "comments">(initialTab as "timeline" | "media" | "comments");
  const [commentText, setCommentText] = useState("");
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [voteDeltas, setVoteDeltas] = useState({ up: 0, down: 0 });
  const { toast } = useToast();

  const { data: post, isLoading: postLoading } = useQuery<PostWithVotes>({
    queryKey: ["/api/posts", id],
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ["/api/posts", id, "comments"],
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/posts", id, "timeline"],
  });

  const handleVote = (vote: "up" | "down") => {
    if (userVote === vote) {
      setVoteDeltas(prev => ({ ...prev, [vote]: prev[vote === "up" ? "up" : "down"] - 1 }));
      setUserVote(null);
    } else {
      if (userVote) {
        setVoteDeltas(prev => ({ ...prev, [userVote === "up" ? "up" : "down"]: prev[userVote === "up" ? "up" : "down"] - 1 }));
      }
      setVoteDeltas(prev => ({ ...prev, [vote === "up" ? "up" : "down"]: prev[vote === "up" ? "up" : "down"] + 1 }));
      setUserVote(vote);
    }
  };

  const commentMutation = useMutation({
    mutationFn: async (data: { text: string; imageUrl?: string | null }) => {
      const res = await apiRequest("POST", `/api/posts/${id}/comments`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts", id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", id, "timeline"] });
      setCommentText("");
      toast({ title: "Comment posted" });
    },
  });

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    commentMutation.mutate({ text: commentText.trim() });
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    missing_person: { label: "Missing Person", color: "bg-destructive text-destructive-foreground" },
    incident: { label: "Crime Report", color: "bg-destructive text-destructive-foreground" },
    alert: { label: "Emergency Alert", color: "bg-orange-600 text-white dark:bg-orange-700" },
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/feed")} data-testid="button-back-feed">
          Back to Feed
        </Button>
        <BottomNav />
      </div>
    );
  }

  const typeInfo = typeLabels[post.type] || typeLabels.alert;
  const tabs = [
    { key: "timeline" as const, label: "Timeline" },
    { key: "media" as const, label: `Media (${post.images?.length || 0})` },
    { key: "comments" as const, label: `Comments (${post.comments})` },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-50">
        <button onClick={() => navigate("/feed")} data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-base" data-testid="text-page-title">Incident Details</span>
      </div>

      <div className="bg-card border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
            {post.verified && (
              <Badge variant="secondary">Partner Verified</Badge>
            )}
          </div>

          <h1 className="text-lg font-bold leading-tight mb-2" data-testid="text-post-title">{post.title}</h1>
          <p className="text-muted-foreground text-sm mb-4" data-testid="text-post-description">{post.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Reported</p>
                <p className="font-medium text-xs">{formatTimeAgo(post.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-xs">{post.radius}m radius</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Town</p>
                <p className="font-medium text-xs">{post.userTown}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Reporter</p>
                <p className="font-medium text-xs">{post.userName}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <button
                className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md border border-border ${userVote === "up" ? "bg-primary/10 text-primary border-primary" : "text-muted-foreground"}`}
                onClick={() => handleVote("up")}
                data-testid="button-upvote"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{(post.votes?.upvotes || 0) + voteDeltas.up}</span>
              </button>
              <button
                className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md border border-border ${userVote === "down" ? "bg-destructive/10 text-destructive border-destructive" : "text-muted-foreground"}`}
                onClick={() => handleVote("down")}
                data-testid="button-downvote"
              >
                <ThumbsDown className="w-4 h-4" />
                <span>{(post.votes?.downvotes || 0) + voteDeltas.down}</span>
              </button>
            </div>
            <button
              className={`flex items-center gap-1 text-sm ${liked ? "text-destructive" : "text-muted-foreground"}`}
              onClick={() => setLiked(!liked)}
              data-testid="button-like"
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-destructive" : ""}`} />
              <span>{post.likes + (liked ? 1 : 0)}</span>
            </button>
            <button
              className={`flex items-center gap-1 text-sm ${shared ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.description,
                    url: `${window.location.origin}/post/${post.id}`,
                  }).catch(() => {});
                }
                if (!shared) setShared(true);
              }}
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
              <span>{post.shares + (shared ? 1 : 0)}</span>
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={following ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFollowing(!following);
                toast({ title: following ? "Unfollowed this incident" : "Following this incident" });
              }}
              data-testid="button-follow"
            >
              {following ? "Following" : "Follow"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.description,
                    url: `${window.location.origin}/post/${post.id}`,
                  }).catch(() => {});
                }
                if (!shared) setShared(true);
                toast({ title: "Share options opened" });
              }}
              data-testid="button-share-action"
            >
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border bg-card sticky top-[53px] z-40">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 text-center py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {activeTab === "timeline" && (
          <TimelineTab events={timeline} isLoading={timelineLoading} />
        )}
        {activeTab === "media" && (
          <MediaTab images={post.images || []} />
        )}
        {activeTab === "comments" && (
          <CommentsTab
            comments={comments}
            isLoading={commentsLoading}
            commentText={commentText}
            setCommentText={setCommentText}
            onSubmit={handleSubmitComment}
            isPending={commentMutation.isPending}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function TimelineTab({ events, isLoading }: { events: TimelineEvent[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <div className="p-8 text-center text-muted-foreground text-sm">No timeline events</div>;
  }

  return (
    <div className="divide-y divide-border">
      {events.map((event) => (
        <div key={event.id} className="px-4 py-3 flex items-start gap-3" data-testid={`timeline-event-${event.id}`}>
          <Avatar className="w-8 h-8 mt-0.5">
            <AvatarFallback className="text-xs">{event.userName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{event.userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{event.type.replace("_", " ")}</p>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatTimeAgo(event.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MediaTab({ images }: { images: string[] }) {
  if (images.length === 0) {
    return <div className="p-8 text-center text-muted-foreground text-sm">No media attached</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-1 p-1">
      {images.map((img, index) => (
        <div key={index} className="aspect-square overflow-hidden" data-testid={`media-item-${index}`}>
          <img
            src={img}
            alt={`Media ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ))}
    </div>
  );
}

function CommentsTab({
  comments,
  isLoading,
  commentText,
  setCommentText,
  onSubmit,
  isPending,
}: {
  comments: Comment[];
  isLoading: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <div>
      <div className="p-4 border-b border-border bg-card">
        <textarea
          className="w-full bg-background border border-border rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={3}
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          maxLength={500}
          data-testid="input-comment"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <button className="flex items-center gap-1 text-xs" data-testid="button-attach-image">
              <ImageIcon className="w-4 h-4" />
              <span>Image</span>
            </button>
            <span className="text-xs">{commentText.length}/500</span>
          </div>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!commentText.trim() || isPending}
            data-testid="button-post-comment"
          >
            {isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No comments yet. Be the first to comment.</div>
      ) : (
        <div className="divide-y divide-border">
          {comments.map((comment) => (
            <div key={comment.id} className="px-4 py-3 flex items-start gap-3" data-testid={`comment-${comment.id}`}>
              <Avatar className="w-8 h-8 mt-0.5">
                <AvatarImage src={comment.userAvatar} />
                <AvatarFallback className="text-xs">{comment.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium" data-testid={`text-comment-author-${comment.id}`}>{comment.userName}</p>
                  <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm mt-0.5" data-testid={`text-comment-body-${comment.id}`}>{comment.text}</p>
                {comment.imageUrl && (
                  <img
                    src={comment.imageUrl}
                    alt="Comment attachment"
                    className="mt-2 rounded-md max-h-[200px] object-cover"
                    data-testid={`img-comment-${comment.id}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
