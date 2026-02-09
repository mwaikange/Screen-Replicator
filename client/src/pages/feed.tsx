import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post } from "@shared/schema";
import brandLogo from "@assets/image_1769491690073.png";

const filterTabs = ["All", "Nearby", "Verified", "Following"];

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function formatRadius(radius: number): string {
  if (radius >= 1000) {
    return `${radius / 1000}Km Radius`;
  }
  return `${radius}m Radius`;
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

      <div className="px-4 space-y-4">
        {isLoading ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <SamplePostCard />
        )}

        <div className="py-6 flex justify-center">
          <img 
            src={brandLogo} 
            alt="Ngumu's Eye - Surveillance & Tracing Services" 
            className="max-w-[280px] w-full object-contain"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const typeLabels: Record<string, { label: string; color: string }> = {
    missing_person: { label: "Missing Person", color: "bg-destructive text-destructive-foreground" },
    incident: { label: "Crime Report", color: "bg-destructive text-destructive-foreground" },
    alert: { label: "Emergency Alert", color: "bg-destructive text-destructive-foreground" },
  };

  const typeInfo = typeLabels[post.type] || typeLabels.alert;

  return (
    <Card data-testid={`post-card-${post.id}`}>
      <CardContent className="p-4 space-y-3">
          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
          
          <h3 className="font-bold text-lg" data-testid={`text-title-${post.id}`}>{post.title}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2" data-testid={`text-description-${post.id}`}>{post.description}</p>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatTimeAgo(post.createdAt)}</span>
            <span>{formatRadius(post.radius)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.userAvatar} />
                <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium" data-testid={`text-username-${post.id}`}>{post.userName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-location-${post.id}`}>
                  <MapPin className="w-3 h-3" /> {post.userTown}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" data-testid={`button-follow-${post.id}`}>
              <UserPlus className="w-4 h-4 mr-1" />
              Follow
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}

function SamplePostCard() {
  return (
    <Card data-testid="post-card-sample">
      <CardContent className="p-4 space-y-3">
        <Badge className="bg-destructive text-destructive-foreground">Missing Person</Badge>
        <h3 className="font-bold text-lg">MISSING CHILD REPORT</h3>
        <p className="text-muted-foreground text-sm line-clamp-2">
          Child is wearing a t-shirt and nappy only. No shoes so if seen please do contact the parents...
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Today</span>
          <span>200m Radius</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback>C</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Cykes man</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Swakopmund
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" data-testid="button-follow-sample">
            <UserPlus className="w-4 h-4 mr-1" />
            Follow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PostSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
