import { useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post } from "@shared/schema";
const filterTabs = ["All", "Nearby", "Verified", "Following"];

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", activeFilter],
    queryFn: async () => {
      const res = await fetch(`/api/posts?filter=${activeFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Community Feed" showSearch />

      <div className="px-4 py-3">
        <div className="flex bg-muted rounded-full p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              className={`flex-1 text-center py-2 px-3 text-sm font-medium rounded-full transition-colors ${
                activeFilter === tab
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveFilter(tab)}
              data-testid={`filter-${tab.toLowerCase()}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="px-4 space-y-3">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts && posts.length > 0 ? (
          posts.filter((post) => post.id && post.type && post.userId && post.createdAt).map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="px-4 py-8 text-center text-muted-foreground">
            No posts found
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [, navigate] = useLocation();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const typeLabels: Record<string, { label: string; color: string }> = {
    missing_person: { label: "Missing Person", color: "bg-destructive text-destructive-foreground" },
    incident: { label: "Crime Report", color: "bg-destructive text-destructive-foreground" },
    alert: { label: "Emergency Alert", color: "bg-orange-600 text-white dark:bg-orange-700" },
    gender_based_violence: { label: "Gender-Based Violence", color: "bg-purple-600 text-white dark:bg-purple-700" },
    theft: { label: "Theft", color: "bg-red-600 text-white dark:bg-red-700" },
    suspicious_activity: { label: "Suspicious Activity", color: "bg-yellow-600 text-white dark:bg-yellow-700" },
  };

  const typeInfo = typeLabels[post.type] || typeLabels.alert;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    navigate(`/post/${post.id}`);
  };

  return (
    <div className="bg-card border-y border-border cursor-pointer" onClick={handleCardClick} data-testid={`post-card-${post.id}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.userAvatar} />
          <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" data-testid={`text-username-${post.id}`}>{post.userName}</span>
            {post.verified && (
              <Badge variant="secondary" className="text-xs py-0 px-1.5">Verified</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span data-testid={`text-location-${post.id}`}>{post.userTown}</span>
            <span className="mx-1">-</span>
            <span>{formatTimeAgo(post.createdAt)}</span>
          </div>
        </div>
        <button className="p-1 text-muted-foreground" data-testid={`button-more-${post.id}`}>
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <Badge className={`${typeInfo.color} mb-2`}>{typeInfo.label}</Badge>
        <h3 className="font-bold text-base leading-tight" data-testid={`text-title-${post.id}`}>{post.title}</h3>
        <p className="text-muted-foreground text-sm mt-1 line-clamp-2" data-testid={`text-description-${post.id}`}>{post.description}</p>
      </div>

      {post.images && post.images.length > 0 && (
        <div className="w-full">
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full object-cover max-h-[300px]"
            data-testid={`img-post-${post.id}`}
          />
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button
            className="flex items-center gap-1.5 text-sm"
            onClick={() => setLiked(!liked)}
            data-testid={`button-like-${post.id}`}
          >
            <Heart className={`w-5 h-5 ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
            <span className={liked ? "text-destructive font-medium" : "text-muted-foreground"}>{post.likes + (liked ? 1 : 0)}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`button-comment-${post.id}`}>
            <MessageCircle className="w-5 h-5" />
            <span>{post.comments}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`button-share-${post.id}`}>
            <Share2 className="w-5 h-5" />
            <span>{post.shares}</span>
          </button>
        </div>
        <button
          onClick={() => setSaved(!saved)}
          data-testid={`button-save-${post.id}`}
        >
          <Bookmark className={`w-5 h-5 ${saved ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
        </button>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[200px] w-full rounded-md" />
        <div className="flex gap-5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}
