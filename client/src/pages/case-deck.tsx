import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, Phone, HeartHandshake, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@shared/schema";

export default function CaseDeckPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const hasActiveSubscription = user?.subscriptionStatus === "active" && user?.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();

  useEffect(() => {
    if (!userLoading && user && !hasActiveSubscription) {
      setLocation("/subscribe");
    }
  }, [user, userLoading, hasActiveSubscription, setLocation]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="My File Deck" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user || !hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="My File Deck" />
        <div className="px-4 py-8 text-center">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Subscription Required</h2>
          <p className="text-muted-foreground mb-6">You need an active subscription to access Case Deck</p>
          <Button onClick={() => setLocation("/subscribe")} data-testid="button-subscribe">
            Subscribe Now
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="My File Deck" />

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-3">
          <Button className="flex-1" variant="outline" data-testid="button-device-tracking">
            <Phone className="w-4 h-4 mr-2" />
            Device Tracking
          </Button>
          <Button className="flex-1" variant="outline" data-testid="button-counseling">
            <HeartHandshake className="w-4 h-4 mr-2" />
            Counseling
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">My Cases</h2>
          <Button size="sm" data-testid="button-open-new-case">
            <Plus className="w-4 h-4 mr-1" />
            New Case
          </Button>
        </div>

        <div className="text-center py-8">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No cases yet</p>
          <p className="text-sm text-muted-foreground mt-1">Open a new case to get started</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
