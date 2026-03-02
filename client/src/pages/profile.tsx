import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Pencil, Camera, Shield, Calendar, LogOut, FolderOpen } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import { useRef } from "react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile picture updated" });
    },
    onError: () => {
      toast({ title: "Failed to update profile picture", variant: "destructive" });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Profile" />
        <div className="px-4 py-4 space-y-4">
          <ProfileSkeleton />
        </div>
        <BottomNav />
      </div>
    );
  }

  const displayUser = user || {
    id: "",
    email: "",
    displayName: "",
    phone: "",
    avatarUrl: "",
    level: 0,
    trustScore: 0,
    followers: 0,
    following: 0,
    subscriptionType: "Free",
    subscriptionExpiry: "",
    subscriptionStatus: "none",
    subscriptionPlanName: null,
  };

  const hasActiveSubscription = displayUser.subscriptionStatus === "active" && displayUser.subscriptionExpiry;

  const daysRemaining = hasActiveSubscription && displayUser.subscriptionExpiry
    ? Math.max(0, Math.ceil((new Date(displayUser.subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const formattedExpiry = hasActiveSubscription && displayUser.subscriptionExpiry
    ? new Date(displayUser.subscriptionExpiry).toLocaleDateString()
    : "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Profile" />
      
      <div className="px-4 py-4 space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={displayUser.avatarUrl} />
                  <AvatarFallback className="text-2xl bg-muted">
                    {displayUser.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarInputRef}
                  className="hidden"
                  onChange={handleAvatarChange}
                  data-testid="input-avatar-file"
                />
                <Button
                  size="icon"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                  data-testid="button-change-avatar"
                >
                  <Camera className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{displayUser.displayName}</h2>
                  <Badge variant="outline" className="text-xs">
                    Level {displayUser.level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{displayUser.email}</p>
                <p className="text-sm text-muted-foreground">{displayUser.phone}</p>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4" data-testid="button-edit-name">
              <Pencil className="w-4 h-4 mr-2" />
              Edit Display Name
            </Button>

            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span data-testid="text-trust-score">Trust Score: {displayUser.trustScore}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-followers-count">{displayUser.followers}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-following-count">{displayUser.following}</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-bold text-lg mb-1">Subscription</h3>
            {hasActiveSubscription ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">Active membership</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium" data-testid="text-subscription-plan">
                    {displayUser.subscriptionPlanName || displayUser.subscriptionType}
                  </span>
                  <Badge className="bg-green-500 text-white" data-testid="badge-subscription-status">Active</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-subscription-expiry">Expires {formattedExpiry}</span>
                </div>
                <p className="text-sm text-primary font-medium mb-4" data-testid="text-days-remaining">{daysRemaining} days remaining</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">No active subscription</p>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-muted-foreground">Free</span>
                  <Badge variant="secondary" data-testid="badge-subscription-status">Inactive</Badge>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setLocation("/subscribe")} data-testid="button-renew">
                {hasActiveSubscription ? "Renew / Upgrade" : "Subscribe"}
              </Button>
              <Button className="flex-1" onClick={() => setLocation("/case-deck")} data-testid="button-case-deck">
                <FolderOpen className="w-4 h-4 mr-2" />
                My Case Deck
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/")}
              data-testid="button-sign-out"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-around">
            <Skeleton className="h-12 w-16" />
            <Skeleton className="h-12 w-16" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
