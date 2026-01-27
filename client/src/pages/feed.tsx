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

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts", activeFilter],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Community Feed" showSearch />
      
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filterTabs.map((tab) => (
            <Button
              key={tab}
              variant={activeFilter === tab ? "default" : "secondary"}
              size="sm"
              className="rounded-full whitespace-nowrap"
              onClick={() => setActiveFilter(tab)}
              data-testid={`filter-${tab.toLowerCase()}`}
            >
              {tab}
            </Button>
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
    incident: { label: "Incident", color: "bg-amber-500 text-white" },
    alert: { label: "Alert", color: "bg-primary text-primary-foreground" },
  };

  const typeInfo = typeLabels[post.type] || typeLabels.alert;

  return (
    <Card data-testid={`post-card-${post.id}`}>
      <CardContent className="p-0">
        {post.images && post.images.length > 0 && (
          <div className="grid grid-cols-2 gap-0.5">
            {post.images.slice(0, 2).map((img, idx) => (
              <div key={idx} className="aspect-square bg-muted overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
        
        <div className="p-4 space-y-3">
          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
          
          <h3 className="font-bold text-lg">{post.title}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2">{post.description}</p>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{new Date(post.createdAt).toLocaleDateString() === new Date().toLocaleDateString() ? "Today" : post.createdAt}</span>
            <span>{post.radius}m Radius</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.userAvatar} />
                <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{post.userName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {post.userTown}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" data-testid={`button-follow-${post.id}`}>
              <UserPlus className="w-4 h-4 mr-1" />
              Follow
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SamplePostCard() {
  return (
    <Card data-testid="post-card-sample">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-0.5">
          <div className="aspect-square bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Image 1</span>
          </div>
          <div className="aspect-square bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Image 2</span>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
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
        </div>
      </CardContent>
    </Card>
  );
}

function PostSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-0.5">
          <Skeleton className="aspect-square" />
          <Skeleton className="aspect-square" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
