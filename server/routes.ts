import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabase, getAuthClient } from "./supabase";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

function getStorageUrl(bucket: string, filePath: string): string {
  if (!filePath) return "";
  if (filePath.startsWith("http")) return filePath;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

function getClient(req: any) {
  const token = req.session?.accessToken;
  return token ? getAuthClient(token) : supabase;
}

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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = signupSchema.parse(req.body);
      const { data, error } = await supabase.auth.signUp({
        email: parsed.email,
        password: parsed.password,
        options: {
          data: { display_name: parsed.displayName || parsed.email.split("@")[0] },
        },
      });
      if (error) {
        return res.status(400).json({ message: error.message });
      }
      if (!data.user) {
        return res.status(400).json({ message: "Signup failed" });
      }
      req.session.userId = data.user.id;
      req.session.accessToken = data.session?.access_token || "";
      res.status(201).json({
        id: data.user.id,
        email: data.user.email,
        displayName: parsed.displayName || parsed.email.split("@")[0],
      });
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      });
      if (error) {
        console.log("Login failed:", error.message);
        return res.status(401).json({ message: error.message });
      }

      req.session.userId = data.user.id;
      req.session.accessToken = data.session.access_token;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("Login success for:", data.user.email);
      res.json({
        id: data.user.id,
        email: data.user.email,
        displayName: profile?.display_name || data.user.user_metadata?.display_name || parsed.email.split("@")[0],
        phone: profile?.phone || "",
        avatarUrl: profile?.avatar_url || "",
        level: profile?.level || 0,
        trustScore: profile?.trust_score || 0,
        followers: profile?.followers_count || 0,
        following: profile?.following_count || 0,
        subscriptionType: subscription?.plan_name || "Free",
        subscriptionExpiry: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "",
        town: profile?.town || "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const db = getClient(req);
      const { data: profile } = await db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: subscription } = await db
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: authData } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null })) as any;

      res.json({
        id: userId,
        email: authData?.user?.email || profile?.email || "",
        displayName: profile?.display_name || "",
        phone: profile?.phone || "",
        avatarUrl: profile?.avatar_url || "",
        level: profile?.level || 0,
        trustScore: profile?.trust_score || 0,
        followers: profile?.followers_count || 0,
        following: profile?.following_count || 0,
        subscriptionType: subscription?.plan_name || "Free",
        subscriptionExpiry: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "",
        town: profile?.town || "",
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const db = getClient(req);
      let query = db
        .from("incidents")
        .select(`
          id, type_id, title, description, town, lat, lng,
          status, verification_level, created_at, created_by,
          incident_types(id, code, label, severity),
          profiles:created_by(id, display_name, avatar_url, trust_score),
          incident_media(id, path, mime)
        `)
        .order("created_at", { ascending: false })
        .range(0, 49);

      const filter = req.query.filter as string | undefined;
      if (filter === "Verified") {
        query = query.gte("verification_level", 1);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Posts fetch error:", error);
        return res.status(500).json({ message: error.message });
      }

      const userId = req.session.userId;
      const postIds = (data || []).map((p: any) => p.id);

      let likeMap: Record<string, number> = {};
      let commentMap: Record<string, number> = {};
      let voteMap: Record<string, { upvotes: number; downvotes: number; userVote: string | null }> = {};

      if (postIds.length > 0) {
        const { data: likes } = await db.from("incident_likes").select("incident_id").in("incident_id", postIds);
        const { data: comments } = await db.from("incident_comments").select("incident_id").in("incident_id", postIds);
        const { data: votes } = await db.from("incident_votes").select("incident_id, vote_type, user_id").in("incident_id", postIds);

        (likes || []).forEach((l: any) => { likeMap[l.incident_id] = (likeMap[l.incident_id] || 0) + 1; });
        (comments || []).forEach((c: any) => { commentMap[c.incident_id] = (commentMap[c.incident_id] || 0) + 1; });
        (votes || []).forEach((v: any) => {
          if (!voteMap[v.incident_id]) voteMap[v.incident_id] = { upvotes: 0, downvotes: 0, userVote: null };
          if (v.vote_type === "up") voteMap[v.incident_id].upvotes++;
          else voteMap[v.incident_id].downvotes++;
          if (v.user_id === userId) voteMap[v.incident_id].userVote = v.vote_type;
        });
      }

      const posts = (data || []).map((item: any) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        const incidentType = Array.isArray(item.incident_types) ? item.incident_types[0] : item.incident_types;
        const media = item.incident_media || [];
        const images = media.map((m: any) => getStorageUrl("incident-media", m.path)).filter(Boolean);
        const v = voteMap[item.id];
        return {
          id: item.id,
          userId: item.created_by,
          userName: profile?.display_name || "Anonymous",
          userAvatar: profile?.avatar_url || "",
          userTown: item.town || "",
          type: incidentType?.code || incidentType?.label || "alert",
          title: item.title || "",
          description: item.description || "",
          images,
          radius: 200,
          createdAt: item.created_at,
          verified: (item.verification_level || 0) > 0,
          likes: likeMap[item.id] || 0,
          comments: commentMap[item.id] || 0,
          shares: 0,
          votes: v || { upvotes: 0, downvotes: 0, userVote: null },
        };
      });

      res.json(posts);
    } catch (error) {
      console.error("Posts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = getClient(req);
      const { data, error } = await db
        .from("incidents")
        .insert({
          created_by: userId,
          title: req.body.title || "Untitled",
          description: req.body.description || "",
          type_id: req.body.type_id || null,
          town: req.body.town || "",
          lat: req.body.latitude || null,
          lng: req.body.longitude || null,
          status: "open",
        })
        .select(`
          id, type_id, title, description, town, lat, lng,
          status, verification_level, created_at, created_by,
          incident_types(id, code, label, severity),
          profiles:created_by(id, display_name, avatar_url)
        `)
        .single();

      if (error) return res.status(400).json({ message: error.message });

      if (req.body.images && req.body.images.length > 0) {
        for (const imgUrl of req.body.images) {
          await db.from("incident_media").insert({
            incident_id: data.id,
            path: imgUrl,
            mime: "image/jpeg",
          });
        }
      }

      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      const incidentType = Array.isArray((data as any).incident_types) ? (data as any).incident_types[0] : (data as any).incident_types;

      res.status(201).json({
        id: data.id,
        userId: data.created_by,
        userName: profile?.display_name || "Anonymous",
        userAvatar: profile?.avatar_url || "",
        userTown: data.town || "",
        type: incidentType?.code || "alert",
        title: data.title || "",
        description: data.description || "",
        images: req.body.images || [],
        radius: 200,
        createdAt: data.created_at,
        verified: false,
        likes: 0,
        comments: 0,
        shares: 0,
      });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("incidents")
        .select(`
          id, type_id, title, description, town, lat, lng,
          status, verification_level, created_at, created_by,
          incident_types(id, code, label, severity),
          profiles:created_by(id, display_name, avatar_url, trust_score),
          incident_media(id, path, mime)
        `)
        .eq("id", req.params.id)
        .single();

      if (error || !data) return res.status(404).json({ message: "Post not found" });

      const userId = req.session.userId;
      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      const incidentType = Array.isArray((data as any).incident_types) ? (data as any).incident_types[0] : (data as any).incident_types;
      const media = (data as any).incident_media || [];
      const images = media.map((m: any) => getStorageUrl("incident-media", m.path)).filter(Boolean);

      const { count: likeCount } = await db.from("incident_likes").select("*", { count: "exact", head: true }).eq("incident_id", req.params.id);
      const { count: commentCount } = await db.from("incident_comments").select("*", { count: "exact", head: true }).eq("incident_id", req.params.id);
      const { data: votesData } = await db.from("incident_votes").select("vote_type, user_id").eq("incident_id", req.params.id);

      let upvotes = 0, downvotes = 0, userVote: string | null = null;
      (votesData || []).forEach((v: any) => {
        if (v.vote_type === "up") upvotes++;
        else downvotes++;
        if (v.user_id === userId) userVote = v.vote_type;
      });

      res.json({
        id: data.id,
        userId: data.created_by,
        userName: profile?.display_name || "Anonymous",
        userAvatar: profile?.avatar_url || "",
        userTown: data.town || "",
        type: incidentType?.code || incidentType?.label || "alert",
        title: data.title || "",
        description: data.description || "",
        images,
        radius: 200,
        createdAt: data.created_at,
        verified: (data.verification_level || 0) > 0,
        likes: likeCount || 0,
        comments: commentCount || 0,
        shares: 0,
        votes: { upvotes, downvotes, userVote },
      });
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("incident_comments")
        .select(`id, incident_id, user_id, content, image_url, created_at, profiles:user_id(display_name, avatar_url)`)
        .eq("incident_id", req.params.id)
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ message: error.message });

      const comments = (data || []).map((c: any) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return {
          id: c.id,
          postId: c.incident_id,
          userId: c.user_id,
          userName: profile?.display_name || "Anonymous",
          userAvatar: profile?.avatar_url || "",
          text: c.content || "",
          imageUrl: c.image_url || null,
          createdAt: c.created_at,
        };
      });
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = getClient(req);
      const { data, error } = await db
        .from("incident_comments")
        .insert({
          incident_id: req.params.id,
          user_id: userId,
          content: req.body.text,
        })
        .select(`id, incident_id, user_id, content, image_url, created_at, profiles:user_id(display_name, avatar_url)`)
        .single();

      if (error) return res.status(400).json({ message: error.message });

      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      res.status(201).json({
        id: data.id,
        postId: data.incident_id,
        userId: data.user_id,
        userName: profile?.display_name || "Anonymous",
        userAvatar: profile?.avatar_url || "",
        text: data.content || "",
        imageUrl: data.image_url || null,
        createdAt: data.created_at,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id/timeline", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("incident_timeline")
        .select(`id, incident_id, user_id, event_type, description, created_at, profiles:user_id(display_name)`)
        .eq("incident_id", req.params.id)
        .order("created_at", { ascending: true });

      if (error) return res.json([]);

      const timeline = (data || []).map((t: any) => {
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
        return {
          id: t.id,
          postId: t.incident_id,
          userId: t.user_id,
          userName: profile?.display_name || "System",
          type: t.event_type || "update",
          description: t.description || "",
          createdAt: t.created_at,
        };
      });
      res.json(timeline);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/posts/:id/vote", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = getClient(req);
      const { vote } = req.body;
      if (vote !== "up" && vote !== "down") return res.status(400).json({ message: "Vote must be 'up' or 'down'" });

      const { data: existing } = await db
        .from("incident_votes")
        .select("id, vote_type")
        .eq("incident_id", req.params.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        if (existing.vote_type === vote) {
          await db.from("incident_votes").delete().eq("id", existing.id);
        } else {
          await db.from("incident_votes").update({ vote_type: vote }).eq("id", existing.id);
        }
      } else {
        await db.from("incident_votes").insert({ incident_id: req.params.id, user_id: userId, vote_type: vote });
      }

      const { data: allVotes } = await db.from("incident_votes").select("vote_type, user_id").eq("incident_id", req.params.id);
      let upvotes = 0, downvotes = 0, userVote: string | null = null;
      (allVotes || []).forEach((v: any) => {
        if (v.vote_type === "up") upvotes++;
        else downvotes++;
        if (v.user_id === userId) userVote = v.vote_type;
      });
      res.json({ upvotes, downvotes, userVote });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = getClient(req);
      const { data: existing } = await db
        .from("incident_likes")
        .select("id")
        .eq("incident_id", req.params.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await db.from("incident_likes").delete().eq("id", existing.id);
      } else {
        await db.from("incident_likes").insert({ incident_id: req.params.id, user_id: userId });
      }

      const { count } = await db.from("incident_likes").select("*", { count: "exact", head: true }).eq("incident_id", req.params.id);
      res.json({ liked: !existing, likes: count || 0 });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/avatar", upload.single("avatar"), async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const db = getClient(req);
      const avatarUrl = `/attached_assets/${file.filename}`;
      const { error } = await db
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);

      if (error) return res.status(500).json({ message: error.message });
      res.json({ avatarUrl });
    } catch (error) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.post("/api/upload", upload.array("files", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ message: "No files uploaded" });
      const urls = files.map(f => `/attached_assets/${f.filename}`);
      res.json({ urls });
    } catch (error) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("groups")
        .select(`
          id, name, geohash_prefix, visibility, created_at, created_by,
          group_members(count)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Groups fetch error:", error);
        return res.status(500).json({ message: error.message });
      }

      const userId = req.session.userId;
      let membershipSet = new Set<string>();
      if (userId) {
        const { data: memberships } = await db
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId);
        (memberships || []).forEach((m: any) => membershipSet.add(m.group_id));
      }

      const groups = (data || []).map((g: any) => {
        const memberCountArr = g.group_members;
        const memberCount = Array.isArray(memberCountArr) && memberCountArr.length > 0
          ? memberCountArr[0].count : 0;
        return {
          id: g.id,
          name: g.name,
          area: g.geohash_prefix || "",
          isPublic: g.visibility === "public",
          memberCount,
          createdBy: g.created_by,
          isMember: membershipSet.has(g.id),
        };
      });
      res.json(groups);
    } catch (error) {
      console.error("Groups error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = getClient(req);
      const { data, error } = await db.rpc("create_group_with_creator", {
        p_name: req.body.name,
        p_geohash_prefix: req.body.area || req.body.geohash_prefix || "",
        p_visibility: (req.body.isPublic === false || req.body.visibility === "private") ? "private" : "public",
      });

      if (error) return res.status(400).json({ message: error.message });
      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("groups")
        .select(`
          id, name, geohash_prefix, visibility, created_at, created_by,
          group_members(count)
        `)
        .eq("id", req.params.id)
        .single();

      if (error || !data) return res.status(404).json({ message: "Group not found" });

      const userId = req.session.userId;
      let isMember = false;
      let userRole: string | null = null;
      if (userId) {
        const { data: member } = await db
          .from("group_members")
          .select("role")
          .eq("group_id", req.params.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (member) {
          isMember = true;
          userRole = member.role;
        }
      }

      const memberCountArr = (data as any).group_members;
      const memberCount = Array.isArray(memberCountArr) && memberCountArr.length > 0
        ? memberCountArr[0].count : 0;

      res.json({
        id: data.id,
        name: data.name,
        area: (data as any).geohash_prefix || "",
        isPublic: (data as any).visibility === "public",
        memberCount,
        createdBy: data.created_by,
        isMember,
        userRole,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.area !== undefined) updateData.geohash_prefix = req.body.area;
      if (req.body.isPublic !== undefined) updateData.visibility = req.body.isPublic ? "public" : "private";

      const db = getClient(req);
      const { data, error } = await db
        .from("groups")
        .update(updateData)
        .eq("id", req.params.id)
        .select("id, name, geohash_prefix, visibility, created_by")
        .single();

      if (error || !data) return res.status(404).json({ message: "Group not found" });
      res.json({
        id: data.id,
        name: data.name,
        area: (data as any).geohash_prefix || "",
        isPublic: (data as any).visibility === "public",
        memberCount: 0,
        createdBy: data.created_by,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    try {
      const db = getClient(req);
      const { error } = await db.from("groups").delete().eq("id", req.params.id);
      if (error) return res.status(404).json({ message: "Group not found" });
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/messages", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("group_messages")
        .select(`id, group_id, user_id, message, image_url, created_at, profiles:user_id(display_name, avatar_url)`)
        .eq("group_id", req.params.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Group messages error:", error);
        return res.json([]);
      }

      const messages = (data || []).map((m: any) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          id: m.id,
          groupId: m.group_id,
          userId: m.user_id,
          userName: profile?.display_name || "Anonymous",
          userAvatar: profile?.avatar_url || "",
          text: m.message || "",
          imageUrl: m.image_url || null,
          createdAt: m.created_at,
        };
      });
      res.json(messages);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/groups/:id/messages", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = getClient(req);
      const text = req.body.text || (req.body.imageUrl ? "📷 Photo" : "");
      const { data, error } = await db
        .from("group_messages")
        .insert({
          group_id: req.params.id,
          user_id: userId,
          message: text,
          image_url: req.body.imageUrl || null,
        })
        .select(`id, group_id, user_id, message, image_url, created_at, profiles:user_id(display_name, avatar_url)`)
        .single();

      if (error) return res.status(400).json({ message: error.message });

      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      res.status(201).json({
        id: data.id,
        groupId: data.group_id,
        userId: data.user_id,
        userName: profile?.display_name || "Anonymous",
        userAvatar: profile?.avatar_url || "",
        text: (data as any).message || "",
        imageUrl: data.image_url || null,
        createdAt: data.created_at,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("group_members")
        .select(`id, group_id, user_id, role, joined_at, profiles:user_id(display_name, avatar_url)`)
        .eq("group_id", req.params.id)
        .order("joined_at", { ascending: true });

      if (error) return res.json([]);

      const members = (data || []).map((m: any) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          id: m.id,
          groupId: m.group_id,
          userId: m.user_id,
          userName: profile?.display_name || "Anonymous",
          userAvatar: profile?.avatar_url || "",
          role: m.role || "member",
          joinedAt: m.joined_at,
        };
      });
      res.json(members);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/groups/:id/join", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = getClient(req);
      const { data, error } = await db.rpc("request_join_group", {
        p_group_id: req.params.id,
      });

      if (error) {
        const { data: group } = await db.from("groups").select("visibility").eq("id", req.params.id).single();
        if (group?.visibility === "public") {
          await db.from("group_members").insert({ group_id: req.params.id, user_id: userId, role: "member" });
          return res.json({ joined: true, status: "joined" });
        } else {
          await db.from("group_requests").insert({ group_id: req.params.id, user_id: userId, status: "pending" });
          return res.json({ joined: false, status: "requested" });
        }
      }

      const status = data?.status || data;
      res.json({ joined: status === "joined" || status === "already_member", status });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/leave", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const db = getClient(req);
      await db.from("group_members").delete().eq("group_id", req.params.id).eq("user_id", userId);
      res.json({ left: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/requests", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("group_requests")
        .select(`id, group_id, user_id, status, created_at, profiles:user_id(display_name, avatar_url)`)
        .eq("group_id", req.params.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) return res.json([]);

      const requests = (data || []).map((r: any) => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: r.id,
          groupId: r.group_id,
          userId: r.user_id,
          userName: profile?.display_name || "Unknown",
          userAvatar: profile?.avatar_url || "",
          status: r.status,
          createdAt: r.created_at,
        };
      });
      res.json(requests);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/groups/:id/requests/:requestId/approve", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db.rpc("approve_group_request", {
        p_request_id: req.params.requestId,
      });
      if (error) return res.status(400).json({ message: error.message });
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups/:id/requests/:requestId/deny", async (req, res) => {
    try {
      const db = getClient(req);
      const { data, error } = await db
        .from("group_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", req.params.requestId)
        .select()
        .single();

      if (error || !data) return res.status(404).json({ message: "Request not found" });
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/groups/:id/members/:userId", async (req, res) => {
    try {
      const db = getClient(req);
      await db.from("group_members").delete().eq("group_id", req.params.id).eq("user_id", req.params.userId);
      res.json({ removed: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    accessToken: string;
  }
}
