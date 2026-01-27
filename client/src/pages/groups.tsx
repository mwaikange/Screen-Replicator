import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Lock, Users, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Group } from "@shared/schema";

export default function GroupsPage() {
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
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
          <Button className="shrink-0" data-testid="button-create-group">
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
            groups.map((group) => <GroupCard key={group.id} group={group} />)
          ) : (
            <>
              <SampleGroupCard
                name="Kudu watchers"
                area="Gobabis"
                isPublic={true}
                memberCount={4}
              />
              <SampleGroupCard
                name="Outjo herero location neighborhood watch"
                area="067"
                isPublic={false}
                memberCount={6}
              />
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <Card data-testid={`group-card-${group.id}`}>
      <CardContent className="p-5">
        <h3 className="font-bold text-lg mb-2">{group.name}</h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
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
        <Button 
          className="w-full" 
          variant={group.isPublic ? "default" : "outline"}
          data-testid={`button-join-${group.id}`}
        >
          {group.isPublic ? "Join Group" : "Request to Join"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SampleGroupCard({
  name,
  area,
  isPublic,
  memberCount,
}: {
  name: string;
  area: string;
  isPublic: boolean;
  memberCount: number;
}) {
  return (
    <Card data-testid={`group-card-sample-${name.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-5">
        <h3 className="font-bold text-lg mb-2">{name}</h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Area: {area}
          </span>
          <Badge variant="secondary" className="gap-1">
            {isPublic ? (
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
          {memberCount} members
        </div>
        <Button 
          className="w-full" 
          variant={isPublic ? "default" : "outline"}
          data-testid={`button-join-sample`}
        >
          {isPublic ? "Join Group" : "Request to Join"}
        </Button>
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
