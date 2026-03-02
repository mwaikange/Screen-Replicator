import { useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Navigation, MapPin, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Post } from "@shared/schema";

const severityLegend = [
  { level: "Critical", color: "bg-red-500" },
  { level: "High", color: "bg-orange-500" },
  { level: "Medium", color: "bg-yellow-500" },
  { level: "Low", color: "bg-lime-300" },
];

const typeLabels: Record<string, { label: string; color: string }> = {
  missing_person: { label: "Missing Person", color: "bg-destructive text-destructive-foreground" },
  incident: { label: "Crime Report", color: "bg-destructive text-destructive-foreground" },
  alert: { label: "Emergency Alert", color: "bg-orange-600 text-white dark:bg-orange-700" },
  gender_based_violence: { label: "Gender-Based Violence", color: "bg-purple-600 text-white dark:bg-purple-700" },
  theft: { label: "Theft", color: "bg-red-600 text-white dark:bg-red-700" },
  suspicious_activity: { label: "Suspicious Activity", color: "bg-yellow-600 text-white dark:bg-yellow-700" },
};

function getSeverityColor(severity: number): string {
  if (severity >= 5) return "#EF4444";
  if (severity >= 4) return "#F97316";
  if (severity >= 3) return "#EAB308";
  return "#BEF264";
}

function getSeverityLevel(severity: number): "critical" | "high" | "medium" | "low" {
  if (severity >= 5) return "critical";
  if (severity >= 4) return "high";
  if (severity >= 3) return "medium";
  return "low";
}

export default function MapPage() {
  const [, navigate] = useLocation();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { data: allPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const res = await fetch("/api/posts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const posts = allPosts?.filter((p) => (p.verificationLevel || 0) > 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Incident Map" />
      
      <div className="relative h-[calc(100vh-8rem)]">
        <div 
          className="absolute inset-0 bg-blue-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e0e7ef 1px, transparent 1px),
              linear-gradient(to bottom, #e0e7ef 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px"
          }}
        >
          <Card className="absolute top-4 left-4 z-10">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium mb-2">Severity</h4>
              <div className="space-y-1.5">
                {severityLegend.map((item) => (
                  <div key={item.level} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-xs">{item.level}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <Button variant="secondary" size="icon" className="shadow-md" data-testid="button-layers">
              <Layers className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="shadow-md" data-testid="button-navigate">
              <Navigation className="w-4 h-4" />
            </Button>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-blue-500 rounded-full z-[5]" data-testid="current-location-dot" />

          {posts?.map((post, index) => {
            const postSeverity = post.severity || 3;
            const severity = getSeverityLevel(postSeverity);
            const top = post.latitude ? `${((post.latitude + 90) / 180) * 70 + 10}%` : `${25 + (index * 12) % 55}%`;
            const left = post.longitude ? `${((post.longitude + 180) / 360) * 70 + 10}%` : `${20 + (index * 18) % 60}%`;
            return (
              <button
                key={post.id}
                className="absolute z-10 cursor-pointer"
                style={{ top, left }}
                onClick={() => setSelectedPost(post)}
                data-testid={`map-marker-${post.id}`}
              >
                <IncidentMarker severity={severity} color={getSeverityColor(postSeverity)} />
              </button>
            );
          })}

          {selectedPost && (
            <div className="absolute bottom-4 left-4 right-4 z-50" data-testid="map-popup">
              <Card className="shadow-xl">
                <CardContent className="p-4 relative">
                  <button
                    className="absolute top-3 right-3 text-muted-foreground p-1"
                    onClick={() => setSelectedPost(null)}
                    data-testid="button-close-popup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${typeLabels[selectedPost.type]?.color || "bg-orange-600 text-white"}`}>
                      {typeLabels[selectedPost.type]?.label || "Alert"}
                    </Badge>
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: getSeverityColor(selectedPost.severity || 3) }}
                    />
                  </div>
                  <h3 className="font-bold text-base leading-tight pr-6 mb-2" data-testid="text-popup-title">
                    {selectedPost.title}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedPost.userTown}</span>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      navigate(`/post/${selectedPost.id}`);
                      setSelectedPost(null);
                    }}
                    data-testid="button-view-incident"
                  >
                    View Incident
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function IncidentMarker({ severity, color }: { severity: "critical" | "high" | "medium" | "low"; color?: string }) {
  return (
    <div className="relative" data-testid={`marker-${severity}`}>
      <div
        className="w-12 h-12 rotate-45 rounded-md shadow-lg flex items-center justify-center"
        style={{ backgroundColor: color || "#EAB308" }}
      >
        <div className="w-8 h-8 bg-white rounded-sm -rotate-45 flex items-center justify-center">
          <div
            className="w-4 h-4 rounded-full relative"
            style={{ backgroundColor: color || "#EAB308" }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
