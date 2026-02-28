import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Send,
  Settings,
  Users,
  Globe,
  Lock,
  UserPlus,
  UserMinus,
  Check,
  X,
  Trash2,
  LogOut,
  ImagePlus,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import type { GroupMessage, GroupMember, GroupJoinRequest, Group } from "@shared/schema";

type GroupDetail = Group & { isMember: boolean; userRole: string | null; currentUserId: string | null };

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [messageText, setMessageText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: group, isLoading: groupLoading } = useQuery<GroupDetail>({
    queryKey: ["/api/groups", id],
  });

  const { data: messages = [] } = useQuery<GroupMessage[]>({
    queryKey: ["/api/groups", id, "messages"],
    refetchInterval: group?.isMember ? 3000 : false,
  });

  const { data: members = [] } = useQuery<GroupMember[]>({
    queryKey: ["/api/groups", id, "members"],
  });

  const { data: requests = [] } = useQuery<GroupJoinRequest[]>({
    queryKey: ["/api/groups", id, "requests"],
    enabled: group?.userRole === "creator",
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async ({ text, imageUrl }: { text: string; imageUrl?: string | null }) => {
      await apiRequest("POST", `/api/groups/${id}/messages`, { text, imageUrl });
    },
    onSuccess: () => {
      setMessageText("");
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "messages"] });
    },
  });

  const joinGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  const leaveGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/groups/${id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
    },
  });

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("POST", `/api/groups/${id}/requests/${requestId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
    },
  });

  const denyRequest = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("POST", `/api/groups/${id}/requests/${requestId}/deny`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "requests"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/groups/${id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setLocation("/groups");
    },
  });

  const handleSend = () => {
    if (!messageText.trim() && !imagePreview) return;
    sendMessage.mutate({ text: messageText.trim() || (imagePreview ? "📷 Photo" : ""), imageUrl: imagePreview });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentUserId = group?.currentUserId;

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Loading..." />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <PageHeader title="Group Not Found" />
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">This group doesn't exist or has been deleted.</p>
          <Button onClick={() => setLocation("/groups")} data-testid="button-back-groups">
            Back to Groups
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <div className="bg-card border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/groups")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate" data-testid="text-group-name">
              {group.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {group.isPublic ? (
                <Globe className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              <span>{group.memberCount} members</span>
              <span>-</span>
              <span>Area: {group.area}</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowMembers(true)}
            data-testid="button-members"
          >
            <Users className="w-5 h-5" />
          </Button>
          {group.userRole === "creator" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowSettings(true)}
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {!group.isMember ? (
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-bold mb-2">{group.name}</h2>
              <p className="text-sm text-muted-foreground mb-1">
                {group.isPublic ? "Public" : "Private"} group - {group.memberCount} members
              </p>
              <p className="text-sm text-muted-foreground mb-4">Area: {group.area}</p>
              <Button
                className="w-full"
                variant={group.isPublic ? "default" : "outline"}
                onClick={() => joinGroup.mutate()}
                disabled={joinGroup.isPending}
                data-testid="button-join-group"
              >
                {joinGroup.isPending
                  ? "Processing..."
                  : group.isPublic
                  ? "Join Group"
                  : "Request to Join"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="messages-container">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No messages yet. Start the conversation!
              </div>
            )}
            {messages.map((msg) => {
              const isOwn = currentUserId && msg.userId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {msg.userName.charAt(0)}
                    </span>
                  </div>
                  <div className={`max-w-[75%] min-w-0 ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                    <div className={`flex items-center gap-2 mb-0.5 flex-wrap ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs font-semibold">{msg.userName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <div className={`rounded-2xl px-3 py-2 ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Shared image"
                          className="max-w-[220px] rounded-lg mb-1 cursor-pointer"
                          data-testid={`msg-image-${msg.id}`}
                        />
                      )}
                      {msg.text && msg.text !== "📷 Photo" && <p className="text-sm break-words">{msg.text}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t bg-card px-4 py-3">
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-24 rounded-lg" />
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                  onClick={() => setImagePreview(null)}
                  data-testid="button-remove-image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageSelect}
                data-testid="input-image-file"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-attach-image"
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sendMessage.isPending}
                className="flex-1"
                data-testid="input-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!messageText.trim() && !imagePreview) || sendMessage.isPending}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Members ({members.length})</DialogTitle>
            <DialogDescription>Current group members</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3" data-testid={`member-${member.userId}`}>
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {member.userName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{member.userName}</span>
                  <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                </div>
                {group?.userRole === "creator" && member.role !== "creator" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMember.mutate(member.userId)}
                    data-testid={`button-remove-${member.userId}`}
                  >
                    <UserMinus className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {group?.isMember && group.userRole !== "creator" && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  leaveGroup.mutate();
                  setShowMembers(false);
                }}
                data-testid="button-leave-group"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Group
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        group={group}
        groupId={id!}
        requests={requests}
        onShowRequests={() => {
          setShowSettings(false);
          setShowRequests(true);
        }}
        onDelete={() => deleteGroup.mutate()}
      />

      <Dialog open={showRequests} onOpenChange={setShowRequests}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Requests</DialogTitle>
            <DialogDescription>Pending requests to join this group</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {requests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
            )}
            {requests.map((req) => (
              <div key={req.id} className="flex items-center gap-3" data-testid={`request-${req.id}`}>
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {req.userName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{req.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(req.createdAt)}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => approveRequest.mutate(req.id)}
                  data-testid={`button-approve-${req.id}`}
                >
                  <Check className="w-4 h-4 text-green-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => denyRequest.mutate(req.id)}
                  data-testid={`button-deny-${req.id}`}
                >
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  group,
  groupId,
  requests,
  onShowRequests,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: GroupDetail;
  groupId: string;
  requests: GroupJoinRequest[];
  onShowRequests: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [area, setArea] = useState(group.area);
  const [isPublic, setIsPublic] = useState(group.isPublic);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(group.name);
    setArea(group.area);
    setIsPublic(group.isPublic);
    setConfirmDelete(false);
  }, [group, open]);

  const updateGroup = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/groups/${groupId}`, { name, area, isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Group Settings</DialogTitle>
          <DialogDescription>Manage your group settings</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-group-name"
            />
          </div>
          <div>
            <Label htmlFor="group-area">Area</Label>
            <Input
              id="group-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              data-testid="input-group-area"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="group-public">Public Group</Label>
            <Switch
              id="group-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              data-testid="switch-public"
            />
          </div>

          {!group.isPublic && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onShowRequests}
              data-testid="button-view-requests"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Join Requests ({requests.length})
            </Button>
          )}

          <Button
            className="w-full"
            onClick={() => updateGroup.mutate()}
            disabled={updateGroup.isPending}
            data-testid="button-save-settings"
          >
            {updateGroup.isPending ? "Saving..." : "Save Changes"}
          </Button>

          <div className="border-t pt-4">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium">
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmDelete(false)}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={onDelete}
                    data-testid="button-confirm-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full text-destructive"
                onClick={() => setConfirmDelete(true)}
                data-testid="button-delete-group"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}
