import { z } from "zod";

export const users = {
  id: "",
  email: "",
  password: "",
  displayName: "",
  phone: "",
  avatarUrl: "",
  level: 0,
  trustScore: 0,
  followers: 0,
  following: 0,
  subscriptionType: "",
  subscriptionExpiry: "",
  town: ""
};

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;

export type User = {
  id: string;
  email: string;
  password: string;
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
  likes: number;
  comments: number;
  shares: number;
};

export const insertPostSchema = z.object({
  type: z.enum(["missing_person", "incident", "alert"]),
  title: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.string()).optional(),
  radius: z.number().optional(),
  town: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type InsertPost = z.infer<typeof insertPostSchema>;

export type Group = {
  id: string;
  name: string;
  area: string;
  isPublic: boolean;
  memberCount: number;
  createdBy: string;
};

export const insertGroupSchema = z.object({
  name: z.string().min(1),
  area: z.string().min(1),
  isPublic: z.boolean(),
});

export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type Incident = {
  id: string;
  latitude: number;
  longitude: number;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  description: string;
  createdAt: string;
};
