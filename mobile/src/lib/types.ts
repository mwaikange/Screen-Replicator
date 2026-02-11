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
};

export type GroupMessage = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
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

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  IncidentDetails: { postId: string };
  Subscribe: undefined;
  GroupChat: { groupId: string };
  CreateGroup: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Map: undefined;
  Report: undefined;
  Files: undefined;
  Groups: undefined;
  Profile: undefined;
};
