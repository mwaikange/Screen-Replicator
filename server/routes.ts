import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertPostSchema, insertGroupSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";

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
      const user = await storage.getUserByEmail(parsed.email);
      if (!user || user.password !== parsed.password) {
        return res.status(401).json({ message: "Invalid email or password" });
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

  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const userId = req.session.userId || "user-1";
      const result = await storage.toggleLikePost(req.params.id, userId);
      res.json(result);
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
