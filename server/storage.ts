import { randomUUID } from "crypto";
import type { User, Post, Group, Comment, TimelineEvent, PostVotes, InsertUser, InsertPost, InsertGroup, InsertComment, GroupMessage, InsertGroupMessage, GroupMember, GroupJoinRequest } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined>;
  getPosts(filter?: string): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost, userId: string): Promise<Post>;
  getGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup, userId: string): Promise<Group>;
  updateGroup(id: string, data: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  getGroupMessages(groupId: string): Promise<GroupMessage[]>;
  createGroupMessage(groupId: string, userId: string, message: InsertGroupMessage): Promise<GroupMessage>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  addGroupMember(groupId: string, userId: string, role: GroupMember["role"]): Promise<GroupMember>;
  removeGroupMember(groupId: string, userId: string): Promise<boolean>;
  isGroupMember(groupId: string, userId: string): Promise<boolean>;
  getGroupJoinRequests(groupId: string): Promise<GroupJoinRequest[]>;
  createJoinRequest(groupId: string, userId: string): Promise<GroupJoinRequest>;
  updateJoinRequest(requestId: string, status: "approved" | "denied"): Promise<GroupJoinRequest | undefined>;
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
  private groupMessages: Map<string, GroupMessage>;
  private groupMembers: Map<string, GroupMember>;
  private groupJoinRequests: Map<string, GroupJoinRequest>;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.groups = new Map();
    this.comments = new Map();
    this.timeline = new Map();
    this.votes = new Map();
    this.postLikes = new Map();
    this.groupMessages = new Map();
    this.groupMembers = new Map();
    this.groupJoinRequests = new Map();
    
    this.seedData();
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    user.avatarUrl = avatarUrl;
    return user;
  }

  private seedData() {
    const sampleUser: User = {
      id: "user-1",
      email: "ngocbo@yopmail.com",
      password: "password123",
      displayName: "Ngobo D.",
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
      name: "Katutura Kudumo Str. Awareness",
      area: "061",
      isPublic: false,
      memberCount: 1,
      createdBy: "user-2"
    };
    this.groups.set(group2.id, group2);

    const group3: Group = {
      id: "group-3",
      name: "Kuisebmond Neighborhood Watch",
      area: "064",
      isPublic: true,
      memberCount: 3,
      createdBy: "user-1"
    };
    this.groups.set(group3.id, group3);

    const group4: Group = {
      id: "group-4",
      name: "Osona Neighborhood Watch",
      area: "062",
      isPublic: true,
      memberCount: 1,
      createdBy: "user-3"
    };
    this.groups.set(group4.id, group4);

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

    const seedMember = (groupId: string, userId: string, role: GroupMember["role"]) => {
      const id = randomUUID();
      const user = this.users.get(userId);
      const member: GroupMember = {
        id,
        groupId,
        userId,
        userName: user?.displayName || "Unknown",
        userAvatar: user?.avatarUrl || "",
        role,
        joinedAt: new Date().toISOString(),
      };
      this.groupMembers.set(id, member);
    };

    seedMember("group-1", "user-1", "creator");
    seedMember("group-1", "user-2", "member");
    seedMember("group-1", "user-3", "member");
    seedMember("group-2", "user-2", "creator");
    seedMember("group-3", "user-1", "creator");
    seedMember("group-3", "user-3", "member");
    seedMember("group-4", "user-3", "creator");

    const seedMessage = (groupId: string, userId: string, text: string, minutesAgo: number) => {
      const id = randomUUID();
      const user = this.users.get(userId);
      const msg: GroupMessage = {
        id,
        groupId,
        userId,
        userName: user?.displayName || "Unknown",
        userAvatar: user?.avatarUrl || "",
        text,
        imageUrl: null,
        createdAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      };
      this.groupMessages.set(id, msg);
    };

    seedMessage("group-1", "user-1", "Welcome to Kudu watchers! Stay alert.", 120);
    seedMessage("group-1", "user-2", "Spotted suspicious activity near the main road.", 60);
    seedMessage("group-1", "user-3", "Thanks for the heads up, will keep watch.", 30);
    seedMessage("group-3", "user-1", "Neighborhood watch meeting this Saturday.", 180);
    seedMessage("group-3", "user-3", "Count me in!", 90);
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

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
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
    await this.addGroupMember(id, userId, "creator");
    return group;
  }

  async updateGroup(id: string, data: Partial<InsertGroup>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    if (data.name !== undefined) group.name = data.name;
    if (data.area !== undefined) group.area = data.area;
    if (data.isPublic !== undefined) group.isPublic = data.isPublic;
    return group;
  }

  async deleteGroup(id: string): Promise<boolean> {
    if (!this.groups.has(id)) return false;
    this.groups.delete(id);
    for (const [key, member] of this.groupMembers) {
      if (member.groupId === id) this.groupMembers.delete(key);
    }
    for (const [key, msg] of this.groupMessages) {
      if (msg.groupId === id) this.groupMessages.delete(key);
    }
    for (const [key, req] of this.groupJoinRequests) {
      if (req.groupId === id) this.groupJoinRequests.delete(key);
    }
    return true;
  }

  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    const messages = Array.from(this.groupMessages.values()).filter(m => m.groupId === groupId);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return messages;
  }

  async createGroupMessage(groupId: string, userId: string, message: InsertGroupMessage): Promise<GroupMessage> {
    const user = await this.getUser(userId);
    const id = randomUUID();
    const msg: GroupMessage = {
      id,
      groupId,
      userId,
      userName: user?.displayName || "Anonymous",
      userAvatar: user?.avatarUrl || "",
      text: message.text,
      imageUrl: message.imageUrl || null,
      createdAt: new Date().toISOString(),
    };
    this.groupMessages.set(id, msg);
    return msg;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return Array.from(this.groupMembers.values()).filter(m => m.groupId === groupId);
  }

  async addGroupMember(groupId: string, userId: string, role: GroupMember["role"]): Promise<GroupMember> {
    const existing = Array.from(this.groupMembers.values()).find(m => m.groupId === groupId && m.userId === userId);
    if (existing) return existing;
    const user = await this.getUser(userId);
    const id = randomUUID();
    const member: GroupMember = {
      id,
      groupId,
      userId,
      userName: user?.displayName || "Unknown",
      userAvatar: user?.avatarUrl || "",
      role,
      joinedAt: new Date().toISOString(),
    };
    this.groupMembers.set(id, member);
    const group = this.groups.get(groupId);
    if (group) group.memberCount = (await this.getGroupMembers(groupId)).length;
    return member;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<boolean> {
    for (const [key, member] of this.groupMembers) {
      if (member.groupId === groupId && member.userId === userId) {
        this.groupMembers.delete(key);
        const group = this.groups.get(groupId);
        if (group) group.memberCount = (await this.getGroupMembers(groupId)).length;
        return true;
      }
    }
    return false;
  }

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    return Array.from(this.groupMembers.values()).some(m => m.groupId === groupId && m.userId === userId);
  }

  async getGroupJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
    return Array.from(this.groupJoinRequests.values())
      .filter(r => r.groupId === groupId && r.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createJoinRequest(groupId: string, userId: string): Promise<GroupJoinRequest> {
    const existing = Array.from(this.groupJoinRequests.values()).find(
      r => r.groupId === groupId && r.userId === userId && r.status === "pending"
    );
    if (existing) return existing;
    const user = await this.getUser(userId);
    const id = randomUUID();
    const request: GroupJoinRequest = {
      id,
      groupId,
      userId,
      userName: user?.displayName || "Unknown",
      userAvatar: user?.avatarUrl || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.groupJoinRequests.set(id, request);
    return request;
  }

  async updateJoinRequest(requestId: string, status: "approved" | "denied"): Promise<GroupJoinRequest | undefined> {
    const request = this.groupJoinRequests.get(requestId);
    if (!request) return undefined;
    request.status = status;
    if (status === "approved") {
      await this.addGroupMember(request.groupId, request.userId, "member");
    }
    return request;
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
