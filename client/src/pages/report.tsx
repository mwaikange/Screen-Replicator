import { useState } from "react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ChevronRight, Upload, Camera } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const incidentTypes = [
  { value: "missing_person", label: "Missing Person" },
  { value: "incident", label: "Incident" },
  { value: "alert", label: "Alert" },
];

export default function ReportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: "",
    town: "",
    latitude: 0,
    longitude: 0,
    radius: 200,
    title: "",
    description: "",
    images: [] as string[],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Report submitted",
        description: "Your incident has been reported successfully",
      });
      setLocation("/feed");
    },
    onError: () => {
      toast({
        title: "Failed to submit",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    submitMutation.mutate(formData);
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        toast({
          title: "Location set",
          description: "Your current location has been captured",
        });
      });
    }
  };

  const stepTitles = ["Type & Location", "Details", "Media & Review"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Report Incident" />
      
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Step {step} of 3</span>
          <span className="text-sm text-muted-foreground">{stepTitles[step - 1]}</span>
        </div>
        <Progress value={(step / 3) * 100} className="h-1.5" />
      </div>

      <div className="px-4">
        {step === 1 && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <h2 className="text-lg font-bold mb-1">What are you reporting?</h2>
                <p className="text-sm text-muted-foreground">
                  Select the type of incident and set the location
                </p>
              </div>

              <div className="space-y-2">
                <Label>Incident Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger data-testid="select-incident-type">
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Town</Label>
                <Input
                  placeholder="Enter nearest town"
                  value={formData.town}
                  onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                  data-testid="input-town"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the nearest town or city
                </p>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={useCurrentLocation}
                  data-testid="button-use-location"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Alert Radius (meters)</Label>
                <Input
                  type="number"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                  data-testid="input-radius"
                />
                <p className="text-xs text-muted-foreground">
                  People within this radius will be notified
                </p>
              </div>

              <Button className="w-full" onClick={handleNext} data-testid="button-continue-1">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <h2 className="text-lg font-bold mb-1">Provide Details</h2>
                <p className="text-sm text-muted-foreground">
                  Describe the incident in detail
                </p>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Brief title for the report"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Provide detailed information about the incident..."
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-description"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleBack}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleNext} data-testid="button-continue-2">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <h2 className="text-lg font-bold mb-1">Add Media</h2>
                <p className="text-sm text-muted-foreground">
                  Upload photos or videos (optional)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-24 flex-col gap-2" data-testid="button-upload-photo">
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Upload Photo</span>
                </Button>
                <Button variant="outline" className="h-24 flex-col gap-2" data-testid="button-take-photo">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Take Photo</span>
                </Button>
              </div>

              <div className="bg-muted rounded-md p-4">
                <h3 className="font-medium mb-2">Review Summary</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Type:</dt>
                    <dd>{incidentTypes.find(t => t.value === formData.type)?.label || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Town:</dt>
                    <dd>{formData.town || "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Radius:</dt>
                    <dd>{formData.radius}m</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Title:</dt>
                    <dd className="truncate max-w-[150px]">{formData.title || "-"}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleBack}>
                  Back
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  data-testid="button-submit-report"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
