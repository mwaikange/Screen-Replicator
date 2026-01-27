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

export type Post = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTown: string;
  type: "missing_person" | "incident" | "alert";
  title: string;
  description: string;
  images: string[];
  radius: number;
  createdAt: string;
  verified: boolean;
};

export type Group = {
  id: string;
  name: string;
  area: string;
  isPublic: boolean;
  memberCount: number;
  createdBy: string;
};

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Map: undefined;
  Report: undefined;
  Files: undefined;
  Groups: undefined;
  Profile: undefined;
};
