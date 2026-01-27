import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Navigation } from "lucide-react";

const severityLegend = [
  { level: "Critical", color: "bg-red-500" },
  { level: "High", color: "bg-red-400" },
  { level: "Medium", color: "bg-amber-500" },
  { level: "Low", color: "bg-yellow-400" },
];

export default function MapPage() {
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

          <div className="absolute bottom-1/3 left-1/4 transform -translate-x-1/2">
            <IncidentMarker severity="medium" />
          </div>
          <div className="absolute bottom-1/3 right-1/4 transform translate-x-1/2">
            <IncidentMarker severity="medium" />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function IncidentMarker({ severity }: { severity: "critical" | "high" | "medium" | "low" }) {
  const colors = {
    critical: "bg-red-500",
    high: "bg-red-400",
    medium: "bg-amber-500",
    low: "bg-yellow-400",
  };

  return (
    <div className="relative" data-testid={`marker-${severity}`}>
      <div className={`w-12 h-12 ${colors[severity]} rotate-45 rounded-md shadow-lg flex items-center justify-center`}>
        <div className="w-8 h-8 bg-white rounded-sm -rotate-45 flex items-center justify-center">
          <div className={`w-4 h-4 ${colors[severity]} rounded-full relative`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
