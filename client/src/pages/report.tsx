import { useState, useRef } from "react";
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
import { MapPin, ChevronRight, ChevronLeft, Upload, X, FileText, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const incidentTypes = [
  { value: "missing_person", label: "Missing Person" },
  { value: "incident", label: "Crime Report" },
  { value: "alert", label: "Emergency Alert" },
  { value: "gender_based_violence", label: "Gender-Based Violence" },
  { value: "theft", label: "Theft" },
  { value: "suspicious_activity", label: "Suspicious Activity" },
];

const stepLabels = ["Type & Location", "Details & Media", "Review"];

export default function ReportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [locationSet, setLocationSet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<{ name: string; dataUrl: string }[]>([]);

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

  const canContinueStep1 = formData.type !== "" && formData.town.trim() !== "";
  const canContinueStep2 = formData.title.trim() !== "";

  const handleNext = () => {
    if (step === 1 && !canContinueStep1) {
      toast({ title: "Please fill required fields", description: "Select an incident type and enter your town", variant: "destructive" });
      return;
    }
    if (step === 2 && !canContinueStep2) {
      toast({ title: "Please enter a title", description: "A brief title for the incident is required", variant: "destructive" });
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const imageUrls = imagePreviews.map(p => p.dataUrl);
    submitMutation.mutate({ ...formData, images: imageUrls });
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: parseFloat(position.coords.latitude.toFixed(4)),
            longitude: parseFloat(position.coords.longitude.toFixed(4)),
          });
          setLocationSet(true);
          toast({ title: "Location set", description: "Your current location has been captured" });
        },
        () => {
          setFormData({
            ...formData,
            latitude: -21.9699,
            longitude: 16.9028,
          });
          setLocationSet(true);
          toast({ title: "Location set", description: "Default location used (geolocation unavailable)" });
        }
      );
    } else {
      setFormData({
        ...formData,
        latitude: -21.9699,
        longitude: 16.9028,
      });
      setLocationSet(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          setImagePreviews((prev) => [...prev, { name: file.name, dataUrl }]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const getTypeLabel = (value: string) => incidentTypes.find((t) => t.value === value)?.label || "-";

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Report Incident" />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary" data-testid="text-step-indicator">Step {step} of 3</span>
          <span className="text-sm text-muted-foreground" data-testid="text-step-label">{stepLabels[step - 1]}</span>
        </div>
        <Progress value={(step / 3) * 100} className="h-1.5" data-testid="progress-bar" />
      </div>

      <div className="px-4">
        {step === 1 && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <h2 className="text-lg font-bold mb-1" data-testid="text-step1-title">What are you reporting?</h2>
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
                      <SelectItem key={type.value} value={type.value} data-testid={`option-type-${type.value}`}>
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
                {locationSet ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-green-700 dark:text-green-300 font-medium" data-testid="text-location-coords">Location set: {formData.latitude}, {formData.longitude}</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={useCurrentLocation}
                      data-testid="button-update-location"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Update Location
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full justify-start bg-green-500 hover:bg-green-600 text-white border-green-500"
                    onClick={useCurrentLocation}
                    data-testid="button-use-location"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Use Current Location
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Alert Radius (meters)</Label>
                <Input
                  type="number"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) || 200 })}
                  data-testid="input-radius"
                />
                <p className="text-xs text-muted-foreground">
                  People within this radius will be notified
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleNext}
                disabled={!canContinueStep1}
                data-testid="button-continue-1"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <h2 className="text-lg font-bold mb-1" data-testid="text-step2-title">Incident Details</h2>
                <p className="text-sm text-muted-foreground">
                  Provide a clear description and upload photos or videos
                </p>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Brief summary of the incident"
                  value={formData.title}
                  onChange={(e) => {
                    if (e.target.value.length <= 100) {
                      setFormData({ ...formData, title: e.target.value });
                    }
                  }}
                  data-testid="input-title"
                />
                <p className="text-xs text-muted-foreground" data-testid="text-title-counter">
                  {formData.title.length}/100 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Provide more details about what happened..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      setFormData({ ...formData, description: e.target.value });
                    }
                  }}
                  data-testid="input-description"
                />
                <p className="text-xs text-muted-foreground" data-testid="text-desc-counter">
                  {formData.description.length}/1000 characters
                </p>
              </div>

              <div className="space-y-3">
                <Label>Photos & Videos (Optional)</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/mp4,video/mov"
                  multiple
                  onChange={handleFileSelect}
                  data-testid="input-file-upload"
                />
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-files"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photos or Videos
                </Button>

                {imagePreviews.length > 0 && (
                  <div className="space-y-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 bg-muted rounded-md p-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={preview.dataUrl} alt={preview.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                          <span className="text-sm truncate" data-testid={`text-file-${index}`}>{preview.name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-muted rounded-md p-3">
                  <p className="text-xs font-medium mb-1">File Requirements:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>Images: JPG, PNG (max 10MB, auto-compressed)</li>
                    <li>Videos: MP4, MOV (max 25MB)</li>
                    <li>Multiple files allowed</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleBack} data-testid="button-back-2">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleNext}
                  disabled={!canContinueStep2}
                  data-testid="button-continue-2"
                >
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
                <h2 className="text-lg font-bold mb-1" data-testid="text-step3-title">Review & Submit</h2>
                <p className="text-sm text-muted-foreground">
                  Please review your report before submitting
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-semibold" data-testid="review-type">{getTypeLabel(formData.type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="text-sm font-semibold" data-testid="review-title">{formData.title || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm" data-testid="review-description">{formData.description || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Media</p>
                  <div className="flex items-center gap-2 text-sm" data-testid="review-media">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {imagePreviews.length > 0 ? `${imagePreviews.length} file(s) attached` : "No files attached"}
                  </div>
                  {imagePreviews.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {imagePreviews.map((preview, index) => (
                        <img key={index} src={preview.dataUrl} alt={preview.name} className="w-16 h-16 rounded object-cover" />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Town</p>
                  <p className="text-sm font-semibold" data-testid="review-town">{formData.town || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <div className="flex items-center gap-2 text-sm" data-testid="review-location">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {locationSet ? `${formData.latitude}, ${formData.longitude}` : "Not set"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alert Radius</p>
                  <p className="text-sm font-semibold" data-testid="review-radius">{formData.radius} meters</p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  By submitting this report, you confirm that the information provided is accurate to the best of your knowledge. False reports may result in account suspension.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleBack} disabled={submitMutation.isPending} data-testid="button-back-3">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
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
