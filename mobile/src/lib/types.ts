export type User = {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  avatarUrl: string;
  level: number;
  trustScore: number;
  followers: number;
  following: number;
  subscriptionType: string;
  subscriptionExpiry: string;
  town: string;
};

export type PostVotes = {
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
};

export type Post = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTown: string;
  type: "missing_person" | "incident" | "alert" | "gender_based_violence" | "theft" | "suspicious_activity";
  title: string;
  description: string;
  images: string[];
  radius: number;
  createdAt: string;
  verified: boolean;
  likes: number;
  comments: number;
  shares: number;
  votes?: PostVotes;
  latitude?: number;
  longitude?: number;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
};

export type TimelineEvent = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  type: string;
  description: string;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  area: string;
  isPublic: boolean;
  memberCount: number;
  createdBy: string;
  isMember?: boolean;
  requestPending?: boolean;
};

export type GroupMessage = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  imageUrl: string | null;
  createdAt: string;
};

export type GroupMember = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
};

export type GroupJoinRequest = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
};

export type Case = {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  caseType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  evidence: CaseEvidence[];
  documents: CaseDocument[];
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseEvidence = {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  description: string;
  addedAt: string;
};

export type CaseDocument = {
  id: string;
  name: string;
  url: string;
  type: string;
  addedAt: string;
};

export type TrackedDevice = {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  imei: string;
  status: 'active' | 'lost' | 'stolen' | 'recovered';
  lastKnownLocation: { lat: number; lng: number } | null;
  lastSeen: string | null;
  createdAt: string;
};

export type SupportRequest = {
  id: string;
  userId: string;
  type: 'counseling' | 'legal' | 'medical' | 'emergency';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  contactMethod: string;
  createdAt: string;
};

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  IncidentDetails: { postId: string };
  Subscribe: undefined;
  GroupChat: { groupId: string };
  CreateGroup: undefined;
  CaseDetail: { caseId: string };
  OpenNewCase: undefined;
  DeviceTracking: undefined;
  Counseling: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Map: undefined;
  Report: undefined;
  CaseDeck: undefined;
  Groups: undefined;
  Profile: undefined;
};
