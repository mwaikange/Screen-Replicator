import { randomUUID } from "crypto";
import type { User, Post, Group, Comment, TimelineEvent, PostVotes, InsertUser, InsertPost, InsertGroup, InsertComment } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPosts(filter?: string): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost, userId: string): Promise<Post>;
  getGroups(): Promise<Group[]>;
  createGroup(group: InsertGroup, userId: string): Promise<Group>;
  getComments(postId: string): Promise<Comment[]>;
  createComment(postId: string, userId: string, comment: InsertComment): Promise<Comment>;
  getTimeline(postId: string): Promise<TimelineEvent[]>;
  addTimelineEvent(postId: string, userId: string, type: TimelineEvent["type"], description: string): Promise<TimelineEvent>;
  getPostVotes(postId: string, userId?: string): Promise<PostVotes>;
  votePost(postId: string, userId: string, vote: "up" | "down"): Promise<PostVotes>;
  toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likes: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private posts: Map<string, Post>;
  private groups: Map<string, Group>;
  private comments: Map<string, Comment>;
  private timeline: Map<string, TimelineEvent>;
  private votes: Map<string, { upvotes: Set<string>; downvotes: Set<string> }>;
  private postLikes: Map<string, Set<string>>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.groups = new Map();
    this.comments = new Map();
    this.timeline = new Map();
    this.votes = new Map();
    this.postLikes = new Map();
    
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

    const cykesUser: User = {
      id: "user-2",
      email: "cykes@example.com",
      password: "password123",
      displayName: "Cykes man",
      phone: "",
      avatarUrl: "",
      level: 2,
      trustScore: 85,
      followers: 234,
      following: 56,
      subscriptionType: "Premium",
      subscriptionExpiry: "12/31/2026",
      town: "Swakopmund"
    };
    this.users.set(cykesUser.id, cykesUser);

    const dezzyUser: User = {
      id: "user-3",
      email: "dezzy@example.com",
      password: "password123",
      displayName: "Dezzy",
      phone: "",
      avatarUrl: "",
      level: 1,
      trustScore: 72,
      followers: 128,
      following: 45,
      subscriptionType: "Free",
      subscriptionExpiry: "",
      town: "Kamanjab"
    };
    this.users.set(dezzyUser.id, dezzyUser);

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    const post1: Post = {
      id: "post-1",
      userId: "user-2",
      userName: "Cykes man",
      userAvatar: "",
      userTown: "Windhoek",
      type: "incident",
      title: "NEW GUN LAWS, SINCE POLICE STARTED KILLING DEFENCELESS",
      description: "Gun laws invoked amid unlawful police killings. The government has announced new measures to address the growing concerns...",
      images: ["/attached_assets/1770575351049-ucib6_1770661190550.jpg"],
      radius: 5000,
      createdAt: new Date().toISOString(),
      verified: true,
      likes: 142,
      comments: 89,
      shares: 56
    };
    this.posts.set(post1.id, post1);

    const post2: Post = {
      id: "post-2",
      userId: "user-3",
      userName: "Dezzy",
      userAvatar: "",
      userTown: "Kamanjab",
      type: "alert",
      title: "MEASURES INTRODUCED TO MANAGE SOCIAL GRANT QUEUES",
      description: "New measures have been introduced to manage the long queues at social grant pay points across the country...",
      images: ["/attached_assets/1769090152419-pux56_1770661190547.jpg"],
      radius: 2000,
      createdAt: new Date(now.getTime() - oneDay).toISOString(),
      verified: true,
      likes: 234,
      comments: 67,
      shares: 45
    };
    this.posts.set(post2.id, post2);

    const post3: Post = {
      id: "post-3",
      userId: "user-2",
      userName: "Cykes man",
      userAvatar: "",
      userTown: "Namibia",
      type: "incident",
      title: "NAMIBIAN POLICE UNDER SCRUTINY",
      description: "The Namibian Police force is facing increased scrutiny following a series of incidents involving use of excessive force...",
      images: ["/attached_assets/1768991272446-ig4hrk_1770661190549.jpg"],
      radius: 2000,
      createdAt: new Date(now.getTime() - (2 * oneDay)).toISOString(),
      verified: false,
      likes: 312,
      comments: 156,
      shares: 89
    };
    this.posts.set(post3.id, post3);

    const post4: Post = {
      id: "post-4",
      userId: "user-3",
      userName: "Dezzy",
      userAvatar: "",
      userTown: "Dakar",
      type: "alert",
      title: "AFRICA CELEBRATES HISTORIC AFCON VICTORY",
      description: "Celebrations continue across the continent as the AFCON champions lift the trophy in a thrilling final match...",
      images: ["/attached_assets/1768821746081-wlwl0s_1770661190544.jpg"],
      radius: 5000,
      createdAt: new Date(now.getTime() - (3 * oneDay)).toISOString(),
      verified: false,
      likes: 567,
      comments: 203,
      shares: 178
    };
    this.posts.set(post4.id, post4);

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

    const seedTimeline = (postId: string, userId: string, userName: string, createdAt: string) => {
      const te: TimelineEvent = {
        id: randomUUID(),
        postId,
        userId,
        userName,
        type: "created",
        description: "Incident created",
        createdAt,
      };
      this.timeline.set(te.id, te);
    };
    seedTimeline("post-1", "user-2", "Cykes man", post1.createdAt);
    seedTimeline("post-2", "user-3", "Dezzy", post2.createdAt);
    seedTimeline("post-3", "user-2", "Cykes man", post3.createdAt);
    seedTimeline("post-4", "user-3", "Dezzy", post4.createdAt);

    const comment1: Comment = {
      id: "comment-1",
      postId: "post-1",
      userId: "user-1",
      userName: "Ngobo D...",
      userAvatar: "",
      text: "This is very concerning. We need more community awareness.",
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(comment1.id, comment1);

    const comment2: Comment = {
      id: "comment-2",
      postId: "post-1",
      userId: "user-3",
      userName: "Dezzy",
      userAvatar: "",
      text: "Stay safe everyone. Report any suspicious activity.",
      imageUrl: null,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    };
    this.comments.set(comment2.id, comment2);

    this.votes.set("post-1", { upvotes: new Set(["user-1"]), downvotes: new Set() });
    this.votes.set("post-2", { upvotes: new Set(["user-1", "user-2"]), downvotes: new Set() });
    this.votes.set("post-3", { upvotes: new Set(), downvotes: new Set() });
    this.votes.set("post-4", { upvotes: new Set(["user-3"]), downvotes: new Set() });
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

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
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
      verified: false,
      likes: 0,
      comments: 0,
      shares: 0
    };
    this.posts.set(id, post);
    await this.addTimelineEvent(id, userId, "created", "Incident created");
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

  async getComments(postId: string): Promise<Comment[]> {
    const comments = Array.from(this.comments.values()).filter(c => c.postId === postId);
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return comments;
  }

  async createComment(postId: string, userId: string, comment: InsertComment): Promise<Comment> {
    const user = await this.getUser(userId);
    const id = randomUUID();
    const newComment: Comment = {
      id,
      postId,
      userId,
      userName: user?.displayName || "Anonymous",
      userAvatar: user?.avatarUrl || "",
      text: comment.text,
      imageUrl: comment.imageUrl || null,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(id, newComment);
    const post = this.posts.get(postId);
    if (post) {
      post.comments += 1;
    }
    await this.addTimelineEvent(postId, userId, "comment", `${newComment.userName} commented`);
    return newComment;
  }

  async getTimeline(postId: string): Promise<TimelineEvent[]> {
    const events = Array.from(this.timeline.values()).filter(e => e.postId === postId);
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return events;
  }

  async addTimelineEvent(postId: string, userId: string, type: TimelineEvent["type"], description: string): Promise<TimelineEvent> {
    const user = await this.getUser(userId);
    const id = randomUUID();
    const event: TimelineEvent = {
      id,
      postId,
      userId,
      userName: user?.displayName || "Anonymous",
      type,
      description,
      createdAt: new Date().toISOString(),
    };
    this.timeline.set(id, event);
    return event;
  }

  async getPostVotes(postId: string, userId?: string): Promise<PostVotes> {
    const voteData = this.votes.get(postId) || { upvotes: new Set<string>(), downvotes: new Set<string>() };
    return {
      upvotes: voteData.upvotes.size,
      downvotes: voteData.downvotes.size,
      userVote: userId ? (voteData.upvotes.has(userId) ? "up" : voteData.downvotes.has(userId) ? "down" : null) : null,
    };
  }

  async votePost(postId: string, userId: string, vote: "up" | "down"): Promise<PostVotes> {
    if (!this.votes.has(postId)) {
      this.votes.set(postId, { upvotes: new Set(), downvotes: new Set() });
    }
    const voteData = this.votes.get(postId)!;
    if (vote === "up") {
      if (voteData.upvotes.has(userId)) {
        voteData.upvotes.delete(userId);
      } else {
        voteData.upvotes.add(userId);
        voteData.downvotes.delete(userId);
      }
    } else {
      if (voteData.downvotes.has(userId)) {
        voteData.downvotes.delete(userId);
      } else {
        voteData.downvotes.add(userId);
        voteData.upvotes.delete(userId);
      }
    }
    return this.getPostVotes(postId, userId);
  }

  async toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likes: number }> {
    if (!this.postLikes.has(postId)) {
      this.postLikes.set(postId, new Set());
    }
    const likeSet = this.postLikes.get(postId)!;
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");

    if (likeSet.has(userId)) {
      likeSet.delete(userId);
      post.likes = Math.max(0, post.likes - 1);
      return { liked: false, likes: post.likes };
    } else {
      likeSet.add(userId);
      post.likes += 1;
      return { liked: true, likes: post.likes };
    }
  }
}

export const storage = new MemStorage();
