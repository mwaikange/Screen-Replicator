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

async function getClient(req: any) {
  if (req.session?.refreshToken) {
    const token = req.session.accessToken;
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const expiresAt = payload.exp * 1000;
        if (Date.now() < expiresAt - 60000) {
          return getAuthClient(token);
        }
      } catch {}
    }
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: req.session.refreshToken,
    });
    if (data?.session) {
      req.session.accessToken = data.session.access_token;
      req.session.refreshToken = data.session.refresh_token;
      return getAuthClient(data.session.access_token);
    }
    if (error) {
      console.error("Token refresh failed:", error.message);
    }
  }
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
      req.session.refreshToken = data.session?.refresh_token || "";
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
      req.session.refreshToken = data.session.refresh_token;

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

      const db = await getClient(req);
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
      const db = await getClient(req);
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
        const { data: reactions } = await db.from("incident_reactions").select("incident_id, reaction_type, user_id").in("incident_id", postIds);
        const { data: comments } = await db.from("comments").select("incident_id").in("incident_id", postIds);

        (reactions || []).forEach((r: any) => {
          if (r.reaction_type === "helpful" || r.reaction_type === "verified") {
            likeMap[r.incident_id] = (likeMap[r.incident_id] || 0) + 1;
          }
          if (!voteMap[r.incident_id]) voteMap[r.incident_id] = { upvotes: 0, downvotes: 0, userVote: null };
          if (r.reaction_type === "helpful" || r.reaction_type === "verified") voteMap[r.incident_id].upvotes++;
          else if (r.reaction_type === "not_helpful") voteMap[r.incident_id].downvotes++;
          if (r.user_id === userId) voteMap[r.incident_id].userVote = r.reaction_type === "not_helpful" ? "down" : "up";
        });
        (comments || []).forEach((c: any) => { commentMap[c.incident_id] = (commentMap[c.incident_id] || 0) + 1; });
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
          verificationLevel: item.verification_level || 0,
          severity: incidentType?.severity || 3,
          likes: likeMap[item.id] || 0,
          comments: commentMap[item.id] || 0,
          shares: 0,
          votes: v || { upvotes: 0, downvotes: 0, userVote: null },
          latitude: item.lat,
          longitude: item.lng,
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

      const db = await getClient(req);

      let geohash = null;
      const lat = req.body.latitude;
      const lng = req.body.longitude;
      if (lat && lng) {
        geohash = '';
        const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
        let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
        let isLng = true, bit = 0, idx = 0;
        while (geohash.length < 7) {
          if (isLng) { const mid = (minLng + maxLng) / 2; if (lng >= mid) { idx = idx * 2 + 1; minLng = mid; } else { idx = idx * 2; maxLng = mid; } }
          else { const mid = (minLat + maxLat) / 2; if (lat >= mid) { idx = idx * 2 + 1; minLat = mid; } else { idx = idx * 2; maxLat = mid; } }
          isLng = !isLng; bit++;
          if (bit === 5) { geohash += chars[idx]; idx = 0; bit = 0; }
        }
      }

      let typeId = req.body.type_id || null;
      if (!typeId && req.body.type) {
        const { data: typeRow } = await db.from("incident_types").select("id").eq("code", req.body.type).maybeSingle();
        if (typeRow) typeId = typeRow.id;
      }

      const insertData: any = {
        type_id: typeId,
        title: req.body.title || "Untitled",
        description: req.body.description || null,
        town: req.body.town || null,
        lat: lat || null,
        lng: lng || null,
        geohash: geohash || null,
        area_radius_m: req.body.radius || 200,
        created_by: userId,
      };

      const { data, error } = await db
        .from("incidents")
        .insert(insertData)
        .select()
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

      const { data: fullData } = await db
        .from("incidents")
        .select(`
          id, type_id, title, description, town, lat, lng,
          status, verification_level, created_at, created_by,
          incident_types(id, code, label, severity),
          profiles:created_by(id, display_name, avatar_url)
        `)
        .eq("id", data.id)
        .single();

      const profile = Array.isArray((fullData as any)?.profiles) ? (fullData as any).profiles[0] : (fullData as any)?.profiles;
      const incidentType = Array.isArray((fullData as any)?.incident_types) ? (fullData as any).incident_types[0] : (fullData as any)?.incident_types;

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
        verificationLevel: 0,
        severity: incidentType?.severity || 3,
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
      const db = await getClient(req);
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

      const { data: reactionsData } = await db.from("incident_reactions").select("reaction_type, user_id").eq("incident_id", req.params.id);
      const { count: commentCount } = await db.from("comments").select("*", { count: "exact", head: true }).eq("incident_id", req.params.id);

      let likeCount = 0, upvotes = 0, downvotes = 0, userVote: string | null = null;
      (reactionsData || []).forEach((r: any) => {
        if (r.reaction_type === "helpful" || r.reaction_type === "verified") { likeCount++; upvotes++; }
        else if (r.reaction_type === "not_helpful") downvotes++;
        if (r.user_id === userId) userVote = r.reaction_type === "not_helpful" ? "down" : "up";
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
        verificationLevel: data.verification_level || 0,
        severity: incidentType?.severity || 3,
        likes: likeCount || 0,
        comments: commentCount || 0,
        shares: 0,
        votes: { upvotes, downvotes, userVote },
        latitude: data.lat,
        longitude: data.lng,
      });
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const db = await getClient(req);
      const { data, error } = await db
        .from("comments")
        .select(`id, incident_id, author, body, image_url, created_at, profiles:author(display_name, avatar_url)`)
        .eq("incident_id", req.params.id)
        .order("created_at", { ascending: true });

      if (error) return res.status(500).json({ message: error.message });

      const comments = (data || []).map((c: any) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return {
          id: c.id,
          postId: c.incident_id,
          userId: c.author,
          userName: profile?.display_name || "Anonymous",
          userAvatar: profile?.avatar_url || "",
          text: c.body || "",
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

      const db = await getClient(req);
      const { data, error } = await db
        .from("comments")
        .insert({
          incident_id: req.params.id,
          author: userId,
          body: req.body.text,
          image_url: null,
        })
        .select(`id, incident_id, author, body, image_url, created_at, profiles:author(display_name, avatar_url)`)
        .single();

      if (error) return res.status(400).json({ message: error.message });

      const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      res.status(201).json({
        id: data.id,
        postId: data.incident_id,
        userId: data.author,
        userName: profile?.display_name || "Anonymous",
        userAvatar: profile?.avatar_url || "",
        text: data.body || "",
        imageUrl: data.image_url || null,
        createdAt: data.created_at,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/posts/:id/timeline", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/posts/:id/vote", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = await getClient(req);
      const { vote } = req.body;
      if (vote !== "up" && vote !== "down") return res.status(400).json({ message: "Vote must be 'up' or 'down'" });

      const reactionType = vote === "up" ? "helpful" : "not_helpful";

      const { data: existing } = await db
        .from("incident_reactions")
        .select("id, reaction_type")
        .eq("incident_id", req.params.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          await db.from("incident_reactions").delete().eq("id", existing.id);
        } else {
          await db.from("incident_reactions").update({ reaction_type: reactionType }).eq("id", existing.id);
        }
      } else {
        await db.from("incident_reactions").insert({ incident_id: req.params.id, user_id: userId, reaction_type: reactionType });
      }

      const { data: allReactions } = await db.from("incident_reactions").select("reaction_type, user_id").eq("incident_id", req.params.id);
      let upvotes = 0, downvotes = 0, userVote: string | null = null;
      (allReactions || []).forEach((r: any) => {
        if (r.reaction_type === "helpful" || r.reaction_type === "verified") upvotes++;
        else if (r.reaction_type === "not_helpful") downvotes++;
        if (r.user_id === userId) userVote = r.reaction_type === "not_helpful" ? "down" : "up";
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

      const db = await getClient(req);
      const { data: existing } = await db
        .from("incident_reactions")
        .select("id")
        .eq("incident_id", req.params.id)
        .eq("user_id", userId)
        .eq("reaction_type", "helpful")
        .maybeSingle();

      if (existing) {
        await db.from("incident_reactions").delete().eq("id", existing.id);
      } else {
        await db.from("incident_reactions").insert({ incident_id: req.params.id, user_id: userId, reaction_type: "helpful" });
      }

      const { count } = await db.from("incident_reactions").select("*", { count: "exact", head: true }).eq("incident_id", req.params.id).in("reaction_type", ["helpful", "verified"]);
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

      const db = await getClient(req);
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
      const db = await getClient(req);
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
      let pendingSet = new Set<string>();
      if (userId) {
        const [membershipsRes, pendingRes] = await Promise.all([
          db.from("group_members").select("group_id").eq("user_id", userId),
          db.from("group_requests").select("group_id").eq("user_id", userId).eq("status", "pending"),
        ]);
        (membershipsRes.data || []).forEach((m: any) => membershipSet.add(m.group_id));
        (pendingRes.data || []).forEach((r: any) => pendingSet.add(r.group_id));
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
          requestPending: pendingSet.has(g.id),
        };
      });
      res.json({ groups, currentUserId: userId || null });
    } catch (error) {
      console.error("Groups error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const db = await getClient(req);
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
      const db = await getClient(req);
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
        currentUserId: userId || null,
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

      const db = await getClient(req);
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
      const db = await getClient(req);
      const { error } = await db.from("groups").delete().eq("id", req.params.id);
      if (error) return res.status(404).json({ message: "Group not found" });
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/messages", async (req, res) => {
    try {
      const db = await getClient(req);
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

      const db = await getClient(req);
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
      const db = await getClient(req);
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

      const db = await getClient(req);
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
      const db = await getClient(req);
      await db.from("group_members").delete().eq("group_id", req.params.id).eq("user_id", userId);
      res.json({ left: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/groups/:id/requests", async (req, res) => {
    try {
      const db = await getClient(req);
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
      const db = await getClient(req);
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
      const db = await getClient(req);
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
      const db = await getClient(req);
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
    refreshToken: string;
  }
}
