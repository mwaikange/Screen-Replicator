import { randomUUID } from "crypto";
import type { User, Post, Group, InsertUser, InsertPost, InsertGroup } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPosts(filter?: string): Promise<Post[]>;
  createPost(post: InsertPost, userId: string): Promise<Post>;
  getGroups(): Promise<Group[]>;
  createGroup(group: InsertGroup, userId: string): Promise<Group>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private groups: Map<string, Group>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.groups = new Map();
    
    this.seedData();
  }

  private seedData() {
    const sampleUser: User = {
      id: "user-1",
      email: "ngocbo@yopmail.com",
      password: "password123",
      displayName: "Ngobo D...",
      phone: "+27781669885",
      avatarUrl: "",
      level: 0,
      trustScore: 0,
      followers: 0,
      following: 0,
      subscriptionType: "Individual 1 Month",
      subscriptionExpiry: "2/21/2026",
      town: "Swakopmund"
    };
    this.users.set(sampleUser.id, sampleUser);

    const samplePost: Post = {
      id: "post-1",
      userId: "user-1",
      userName: "Cykes man",
      userAvatar: "",
      userTown: "Swakopmund",
      type: "missing_person",
      title: "MISSING CHILD REPORT",
      description: "Child is wearing a t-shirt and nappy only. No shoes so if seen please do contact the parents...",
      images: [],
      radius: 200,
      createdAt: new Date().toISOString(),
      verified: false
    };
    this.posts.set(samplePost.id, samplePost);

    const group1: Group = {
      id: "group-1",
      name: "Kudu watchers",
      area: "Gobabis",
      isPublic: true,
      memberCount: 4,
      createdBy: "user-1"
    };
    this.groups.set(group1.id, group1);

    const group2: Group = {
      id: "group-2",
      name: "Outjo herero location neighborhood watch",
      area: "067",
      isPublic: false,
      memberCount: 6,
      createdBy: "user-1"
    };
    this.groups.set(group2.id, group2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: insertUser.email,
      password: insertUser.password,
      displayName: insertUser.displayName || "",
      phone: insertUser.phone || "",
      avatarUrl: "",
      level: 0,
      trustScore: 0,
      followers: 0,
      following: 0,
      subscriptionType: "Free",
      subscriptionExpiry: "",
      town: ""
    };
    this.users.set(id, user);
    return user;
  }

  async getPosts(filter?: string): Promise<Post[]> {
    const posts = Array.from(this.posts.values());
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (filter === "Verified") {
      return posts.filter(p => p.verified);
    }
    return posts;
  }

  async createPost(insertPost: InsertPost, userId: string): Promise<Post> {
    const user = await this.getUser(userId);
    const id = randomUUID();
    const post: Post = {
      id,
      userId,
      userName: user?.displayName || "Anonymous",
      userAvatar: user?.avatarUrl || "",
      userTown: insertPost.town || user?.town || "",
      type: insertPost.type,
      title: insertPost.title,
      description: insertPost.description,
      images: insertPost.images || [],
      radius: insertPost.radius || 200,
      createdAt: new Date().toISOString(),
      verified: false
    };
    this.posts.set(id, post);
    return post;
  }

  async getGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async createGroup(insertGroup: InsertGroup, userId: string): Promise<Group> {
    const id = randomUUID();
    const group: Group = {
      id,
      name: insertGroup.name,
      area: insertGroup.area,
      isPublic: insertGroup.isPublic,
      memberCount: 1,
      createdBy: userId
    };
    this.groups.set(id, group);
    return group;
  }
}

export const storage = new MemStorage();
