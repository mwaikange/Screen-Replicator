import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MapPin, Globe, Lock, Users, Plus, MessageCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Group } from "@shared/schema";

export default function GroupsPage() {
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/groups", {
        name: newName,
        area: newArea,
        isPublic: newIsPublic,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setShowCreate(false);
      setNewName("");
      setNewArea("");
      setNewIsPublic(true);
    },
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/join`);
      return res.json();
    },
    onSuccess: (data, groupId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      if (data.joined) {
        setLocation(`/groups/${groupId}`);
      }
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Community Groups" />

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Your Communities</h2>
            <p className="text-sm text-muted-foreground">
              Join local groups for better coordination
            </p>
          </div>
          <Button
            className="shrink-0"
            onClick={() => setShowCreate(true)}
            data-testid="button-create-group"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Group
          </Button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <>
              <GroupSkeleton />
              <GroupSkeleton />
            </>
          ) : groups && groups.length > 0 ? (
            groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onOpen={() => setLocation(`/groups/${group.id}`)}
                onJoin={() => joinGroup.mutate(group.id)}
                isJoining={joinGroup.isPending}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No groups yet. Create one to get started!
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Start a community watch group in your area
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Group Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Windhoek Neighborhood Watch"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="input-create-name"
              />
            </div>
            <div>
              <Label htmlFor="create-area">Area / Region Code</Label>
              <Input
                id="create-area"
                placeholder="e.g. Windhoek or 061"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                data-testid="input-create-area"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="create-public">Public Group</Label>
                <p className="text-xs text-muted-foreground">
                  {newIsPublic
                    ? "Anyone can join this group"
                    : "Members must request to join"}
                </p>
              </div>
              <Switch
                id="create-public"
                checked={newIsPublic}
                onCheckedChange={setNewIsPublic}
                data-testid="switch-create-public"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createGroup.mutate()}
              disabled={!newName.trim() || !newArea.trim() || createGroup.isPending}
              data-testid="button-submit-create"
            >
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function GroupCard({
  group,
  onOpen,
  onJoin,
  isJoining,
}: {
  group: Group;
  onOpen: () => void;
  onJoin: () => void;
  isJoining: boolean;
}) {
  return (
    <Card data-testid={`group-card-${group.id}`}>
      <CardContent className="p-5">
        <h3 className="font-bold text-lg mb-2">{group.name}</h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Area: {group.area}
          </span>
          <Badge variant="secondary" className="gap-1">
            {group.isPublic ? (
              <>
                <Globe className="w-3 h-3" /> Public
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" /> Private
              </>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <Users className="w-4 h-4" />
          {group.memberCount} members
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={onOpen}
            data-testid={`button-open-${group.id}`}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Open
          </Button>
          <Button
            className="flex-1"
            variant={group.isPublic ? "default" : "outline"}
            onClick={onJoin}
            disabled={isJoining}
            data-testid={`button-join-${group.id}`}
          >
            {group.isPublic ? "Join Group" : "Request to Join"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="flex gap-3 mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-20 mb-4" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
