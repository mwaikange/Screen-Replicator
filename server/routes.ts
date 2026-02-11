import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertPostSchema, insertGroupSchema, insertCommentSchema, insertGroupMessageSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const uploadStorage = multer.diskStorage({
  destination: path.resolve(process.cwd(), "attached_assets"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `upload_${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|mp4|mov|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(parsed.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const user = await storage.createUser(parsed);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.parse(req.body);
      let user = await storage.getUserByEmail(parsed.email);
      if (!user) {
        user = await storage.createUser({
          email: parsed.email,
          password: parsed.password,
          displayName: parsed.email.split("@")[0],
        });
      }
      const { password, ...userWithoutPassword } = user;
      req.session.userId = user.id;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user", async (req, res) => {
    try {
      const userId = req.session.userId || "user-1";
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const filter = req.query.filter as string | undefined;
      const posts = await storage.getPosts(filter);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const parsed = insertPostSchema.parse(req.body);
      const userId = req.session.userId || "user-1";
      const post = await storage.createPost(parsed, userId);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const parsed = insertGroupSchema.parse(req.body);
      const userId = req.session.userId || "user-1";
      const group = await storage.createGroup(parsed, userId);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const userId = req.session.userId || "user-1";
      const votes = await storage.getPostVotes(post.id, userId);
      res.json({ ...post, votes });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    try {
      const parsed = insertCommentSchema.parse(req.body);
      const userId = req.session.userId || "user-1";
      const comment = await storage.createComment(req.params.id, userId, parsed);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id/timeline", async (req, res) => {
    try {
      const events = await storage.getTimeline(req.params.id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts/:id/vote", async (req, res) => {
    try {
      const { vote } = req.body;
      if (vote !== "up" && vote !== "down") {
        return res.status(400).json({ message: "Vote must be 'up' or 'down'" });
      }
      const userId = req.session.userId || "user-1";
      const result = await storage.votePost(req.params.id, userId, vote);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/upload", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const urls = files.map(f => `/attached_assets/${f.filename}`);
      res.json({ urls });
    } catch (error) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const userId = req.session.userId || "user-1";
      const result = await storage.toggleLikePost(req.params.id, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const userId = req.session.userId || "user-1";
      const isMember = await storage.isGroupMember(group.id, userId);
      const members = await storage.getGroupMembers(group.id);
      const userMember = members.find(m => m.userId === userId);
      res.json({ ...group, isMember, userRole: userMember?.role || null });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getGroupMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/messages", async (req, res) => {
    try {
      const parsed = insertGroupMessageSchema.parse(req.body);
      const userId = req.session.userId || "user-1";
      const message = await storage.createGroupMessage(req.params.id, userId, parsed);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/join", async (req, res) => {
    try {
      const userId = req.session.userId || "user-1";
      const group = await storage.getGroup(req.params.id);
      if (!group) return res.status(404).json({ message: "Group not found" });
      const isMember = await storage.isGroupMember(group.id, userId);
      if (isMember) return res.status(400).json({ message: "Already a member" });
      if (group.isPublic) {
        const member = await storage.addGroupMember(group.id, userId, "member");
        res.json({ joined: true, member });
      } else {
        const request = await storage.createJoinRequest(group.id, userId);
        res.json({ joined: false, request });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/leave", async (req, res) => {
    try {
      const userId = req.session.userId || "user-1";
      await storage.removeGroupMember(req.params.id, userId);
      res.json({ left: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/requests", async (req, res) => {
    try {
      const requests = await storage.getGroupJoinRequests(req.params.id);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/requests/:requestId/approve", async (req, res) => {
    try {
      const result = await storage.updateJoinRequest(req.params.requestId, "approved");
      if (!result) return res.status(404).json({ message: "Request not found" });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/requests/:requestId/deny", async (req, res) => {
    try {
      const result = await storage.updateJoinRequest(req.params.requestId, "denied");
      if (!result) return res.status(404).json({ message: "Request not found" });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.updateGroup(req.params.id, req.body);
      if (!group) return res.status(404).json({ message: "Group not found" });
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGroup(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Group not found" });
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/groups/:id/members/:userId", async (req, res) => {
    try {
      const removed = await storage.removeGroupMember(req.params.id, req.params.userId);
      res.json({ removed });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}
