import { supabase, siteUrl, supabaseUrl } from './supabase';
import { User, Post, Group, Comment, TimelineEvent, GroupMessage, GroupMember, GroupJoinRequest, Case, TrackedDevice, SupportRequest } from './types';

export const postImages: Record<string, any> = {};

function makeResponse<T>(data: T) {
  return { data };
}

// FIX 1: resolveMediaUrl handles both full Vercel Blob URLs and relative Supabase paths
function resolveMediaUrl(bucket: string, filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('https://') || filePath.startsWith('http://')) return filePath;
  if (filePath.startsWith('data:')) return filePath;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function uploadMedia(uri: string): Promise<string | null> {
  try {
    const filename = uri.split('/').pop() || 'upload.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    const safeName = `upload_${Date.now()}.${ext}`;

    // React Native FormData — do NOT set Content-Type manually
    // fetch will set it automatically with the correct multipart boundary
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: safeName,
      type: mimeType,
    } as any);

    const uploadUrl = 'https://app.ngumus-eye.site';
    console.log('[upload] Sending to:', `${uploadUrl}/api/upload`);

    const response = await fetch(`${uploadUrl}/api/upload`, {
      method: 'POST',
      // No Content-Type header — React Native sets it automatically with boundary
      // No Authorization header — endpoint is public
      body: formData,
    });

    console.log('[upload] Status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('[upload] Success:', result.url);
      return result.url || null;
    } else {
      const errText = await response.text();
      console.error('[upload] Server error:', response.status, errText);
      return null;
    }
  } catch (error) {
    console.error('[upload] Network error:', error);
    return null;
  }
}

export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const userId = data.user.id;

    const [profileRes, subscriptionRes, followersRes, followingRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, display_name, full_name, phone, avatar_url, trust_score, level, created_at, town')
        .eq('id', userId)
        .single(),
      supabase.from('user_subscriptions')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .maybeSingle(),
      supabase.from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId),
      supabase.from('user_follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId),
    ]);

    const profile = profileRes.data;
    const subscription = subscriptionRes.data;
    const followersCount = followersRes.count || 0;
    const followingCount = followingRes.count || 0;

    const user: User = {
      id: userId,
      email: data.user.email || email,
      displayName: profile?.display_name || data.user.user_metadata?.display_name || email.split('@')[0],
      phone: profile?.phone || data.user.phone || '',
      avatarUrl: profile?.avatar_url || '',
      level: profile?.level ?? 1,
      trustScore: profile?.trust_score || 0,
      followers: followersCount,
      following: followingCount,
      subscriptionType: (subscription as any)?.plans?.name || (subscription ? 'Active' : 'Free'),
      subscriptionExpiry: subscription?.expires_at || '',
      subscriptionStatus: subscription ? 'active' : 'none',
      subscriptionPlanName: (subscription as any)?.plans?.name || null,
      town: profile?.town || '',
    };

    return makeResponse({ ...user, token: data.session.access_token });
  },

  signup: async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Signup failed: no user returned');

    return makeResponse({ token: data.session?.access_token || '' });
  },

  forgotPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'ngumuseye://reset-password',
    });
    if (error) throw new Error(error.message);
    return makeResponse({ success: true });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    return makeResponse({ success: true });
  },
};

export const postsApi = {
  getAll: async (filter?: string) => {
    let query = supabase
      .from('incidents')
      .select(`
        id, type_id, title, description, town, lat, lng,
        status, verification_level, created_at, created_by,
        incident_types(id, code, label, severity),
        profiles:created_by(id, display_name, avatar_url, trust_score),
        incident_media(id, path, mime)
      `)
      .order('created_at', { ascending: false })
      .range(0, 49);

    if (filter === 'Verified') {
      query = query.gte('verification_level', 1);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching posts:', error.message, error.details);
      throw new Error('Failed to load feed: ' + error.message);
    }

    const userId = await getCurrentUserId();

    const posts: Post[] = (data || []).map((item: any) => {
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      const incidentType = Array.isArray(item.incident_types) ? item.incident_types[0] : item.incident_types;
      const media = item.incident_media || [];
      // FIX 3: Use resolveMediaUrl instead of getStorageUrl
      const images = media.map((m: any) => resolveMediaUrl('incident-media', m.path)).filter(Boolean);
      return {
        id: item.id,
        userId: item.created_by,
        userName: profile?.display_name || 'Anonymous',
        // FIX 4: avatar_url is a full Vercel Blob URL — use directly
        userAvatar: profile?.avatar_url || '',
        userTown: item.town || '',
        type: incidentType?.code || incidentType?.label || 'alert',
        title: item.title || '',
        description: item.description || '',
        images,
        radius: 200,
        createdAt: item.created_at,
        verified: (item.verification_level || 0) > 0,
        verificationLevel: item.verification_level || 0,
        severity: incidentType?.severity || 3,
        likes: 0,
        comments: 0,
        shares: 0,
        latitude: item.lat,
        longitude: item.lng,
      };
    });

    if (posts.length > 0) {
      const postIds = posts.map(p => p.id);

      const { data: reactionCounts } = await supabase
        .from('incident_reactions')
        .select('incident_id, reaction_type, user_id')
        .in('incident_id', postIds);

      const { data: commentCounts } = await supabase
        .from('comments')
        .select('incident_id')
        .in('incident_id', postIds);

      const likeMap: Record<string, number> = {};
      const voteMap: Record<string, { up: number; down: number; userVote: 'up' | 'down' | null }> = {};
      (reactionCounts || []).forEach((r: any) => {
        if (r.reaction_type === 'upvote' || r.reaction_type === 'love' || r.reaction_type === 'confirm') {
          likeMap[r.incident_id] = (likeMap[r.incident_id] || 0) + 1;
        }
        if (!voteMap[r.incident_id]) voteMap[r.incident_id] = { up: 0, down: 0, userVote: null };
        if (r.reaction_type === 'upvote' || r.reaction_type === 'love' || r.reaction_type === 'confirm') voteMap[r.incident_id].up += 1;
        else if (r.reaction_type === 'downvote') voteMap[r.incident_id].down += 1;
        if (r.user_id === userId) {
          voteMap[r.incident_id].userVote = (r.reaction_type === 'downvote') ? 'down' : 'up';
        }
      });

      const commentMap: Record<string, number> = {};
      (commentCounts || []).forEach((c: any) => {
        commentMap[c.incident_id] = (commentMap[c.incident_id] || 0) + 1;
      });

      posts.forEach(p => {
        p.likes = likeMap[p.id] || 0;
        p.comments = commentMap[p.id] || 0;
        const v = voteMap[p.id];
        if (v) p.votes = { upvotes: v.up, downvotes: v.down, userVote: v.userVote };
      });
    }

    return makeResponse(posts);
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        id, type_id, title, description, town, lat, lng,
        status, verification_level, created_at, created_by,
        incident_types(id, code, label, severity),
        profiles:created_by(id, display_name, avatar_url, trust_score),
        incident_media(id, path, mime)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return makeResponse(null);

    const userId = await getCurrentUserId();
    const profile = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
    const incidentType = Array.isArray((data as any).incident_types) ? (data as any).incident_types[0] : (data as any).incident_types;
    const media = (data as any).incident_media || [];
    // FIX 5: resolveMediaUrl for incident detail images
    const images = media.map((m: any) => resolveMediaUrl('incident-media', m.path)).filter(Boolean);

    const { data: reactionsData } = await supabase
      .from('incident_reactions')
      .select('reaction_type, user_id')
      .eq('incident_id', id);

    const { count: commentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('incident_id', id);

    let likeCount = 0, upvotes = 0, downvotes = 0;
    let userVote: 'up' | 'down' | null = null;
    (reactionsData || []).forEach((r: any) => {
      if (r.reaction_type === 'upvote' || r.reaction_type === 'love' || r.reaction_type === 'confirm') {
        likeCount++;
        upvotes++;
      } else if (r.reaction_type === 'downvote') {
        downvotes++;
      }
      if (r.user_id === userId) {
        userVote = r.reaction_type === 'downvote' ? 'down' : 'up';
      }
    });

    const post: Post = {
      id: data.id,
      userId: data.created_by,
      userName: profile?.display_name || 'Anonymous',
      userAvatar: profile?.avatar_url || '',
      userTown: data.town || '',
      type: incidentType?.code || incidentType?.label || 'alert',
      title: data.title || '',
      description: data.description || '',
      images,
      radius: 200,
      createdAt: data.created_at,
      verified: (data.verification_level || 0) > 0,
      likes: likeCount || 0,
      comments: commentCount || 0,
      shares: 0,
      votes: { upvotes, downvotes, userVote },
      latitude: data.lat,
      longitude: data.lng,
    };

    return makeResponse(post);
  },

  getComments: async (postId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, incident_id, author, body, image_url, created_at,
        profiles:author(display_name, avatar_url)
      `)
      .eq('incident_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Comments fetch error:', error.message);
      return makeResponse([]);
    }

    const comments: Comment[] = (data || []).map((c: any) => {
      const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return {
        id: c.id,
        postId: c.incident_id,
        userId: c.author,
        userName: profile?.display_name || 'Anonymous',
        userAvatar: profile?.avatar_url || '',
        text: c.body || '',
        imageUrl: c.image_url,
        createdAt: c.created_at,
      };
    });

    return makeResponse(comments);
  },

  getTimeline: async (_postId: string) => {
    return makeResponse([]);
  },

  addComment: async (postId: string, text: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        incident_id: postId,
        author: userId,
        body: text,
        image_url: null,
      })
      .select(`
        id, incident_id, author, body, image_url, created_at,
        profiles:author(display_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(error.message);

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    const comment: Comment = {
      id: data.id,
      postId: data.incident_id,
      userId: data.author,
      userName: profile?.display_name || 'Anonymous',
      userAvatar: profile?.avatar_url || '',
      text: data.body || '',
      createdAt: data.created_at,
    };

    return makeResponse(comment);
  },

  vote: async (postId: string, vote: 'up' | 'down') => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const reactionType = vote === 'up' ? 'upvote' : 'downvote';

    const { data: existing } = await supabase
      .from('incident_reactions')
      .select('id, reaction_type')
      .eq('incident_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        await supabase.from('incident_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('incident_reactions').update({ reaction_type: reactionType }).eq('id', existing.id);
      }
    } else {
      await supabase.from('incident_reactions').insert({
        incident_id: postId,
        user_id: userId,
        reaction_type: reactionType,
      });
    }

    return postsApi.getById(postId);
  },

  like: async (postId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('incident_reactions')
      .select('id')
      .eq('incident_id', postId)
      .eq('user_id', userId)
      .eq('reaction_type', 'upvote')
      .maybeSingle();

    if (existing) {
      await supabase.from('incident_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('incident_reactions').insert({
        incident_id: postId,
        user_id: userId,
        reaction_type: 'upvote',
      });
    }

    return postsApi.getById(postId);
  },

  // React to a post — handles mutual exclusivity, toggle off, and notification
  react: async (postId: string, reactionType: 'upvote' | 'downvote' | 'love' | 'confirm') => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const REACTION_MESSAGES: Record<string, string> = {
      upvote:   'Your post received an upvote',
      downvote: 'Your post received a downvote',
      love:     'Your post received some love',
      confirm:  'Your post received a confirmation',
    };

    // Fetch all existing reactions for this user+incident
    const { data: existing } = await supabase
      .from('incident_reactions')
      .select('reaction_type')
      .eq('incident_id', postId)
      .eq('user_id', userId);

    const existingTypes = new Set((existing || []).map((r: any) => r.reaction_type as string));

    if (existingTypes.has(reactionType)) {
      // Toggle off — delete it
      await supabase.from('incident_reactions').delete()
        .eq('incident_id', postId).eq('user_id', userId).eq('reaction_type', reactionType);
      return makeResponse({ action: 'removed', reactionType });
    }

    // Delete opposite if upvote/downvote
    if (reactionType === 'upvote' && existingTypes.has('downvote')) {
      await supabase.from('incident_reactions').delete()
        .eq('incident_id', postId).eq('user_id', userId).eq('reaction_type', 'downvote');
    }
    if (reactionType === 'downvote' && existingTypes.has('upvote')) {
      await supabase.from('incident_reactions').delete()
        .eq('incident_id', postId).eq('user_id', userId).eq('reaction_type', 'upvote');
    }

    // Insert new reaction
    await supabase.from('incident_reactions').insert({
      incident_id: postId,
      user_id: userId,
      reaction_type: reactionType,
    });

    // Get incident owner to notify
    const { data: incident } = await supabase
      .from('incidents')
      .select('created_by')
      .eq('id', postId)
      .maybeSingle();

    if (incident?.created_by && incident.created_by !== userId) {
      // Get reactor's display name for the notification message
      const { data: reactorProfile } = await supabase
        .from('profiles').select('display_name').eq('id', userId).maybeSingle();
      const reactorName = reactorProfile?.display_name ?? 'Someone';

      const isConfirm = reactionType === 'confirm';
      const { error: notifErr } = await supabase.from('user_notifications').insert({
        user_id: incident.created_by,
        type: isConfirm ? 'trust_badge' : 'reaction',
        title: isConfirm
          ? '🥳 Congrats!! Community Trust Badge'
          : 'Your post got a reaction',
        message: isConfirm
          ? `🥳 Congrats!! ${reactorName} has given your post a Trust Badge!`
          : REACTION_MESSAGES[reactionType] ?? 'Someone reacted to your post',
        entity_id: postId,
      });
      console.log('[react] notification insert:', notifErr ? 'ERROR: ' + notifErr.message : 'OK', 'owner:', incident.created_by);
    } else {
      console.log('[react] skipping notification - own post or no owner. userId:', userId, 'owner:', incident?.created_by);
    }

    return makeResponse({ action: 'added', reactionType });
  },

  // FIX 6: report function added
  report: async (postId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('incident_reports')
      .select('id')
      .eq('incident_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return makeResponse({ alreadyReported: true });
    }

    await supabase.from('incident_reports').insert({
      incident_id: postId,
      user_id: userId,
    });

    return makeResponse({ alreadyReported: false });
  },

  getByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        id, type_id, title, description, town, lat, lng,
        status, verification_level, created_at, created_by,
        incident_types(id, code, label, severity),
        profiles:created_by(id, display_name, avatar_url, trust_score),
        incident_media(id, path, mime)
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .range(0, 49);

    if (error) throw new Error(error.message);
    return makeResponse(data || []);
  },

    getIncidentTypes: async () => {
    const { data, error } = await supabase
      .from('incident_types')
      .select('id, code, label, severity')
      .order('label');

    if (error) {
      console.error('Failed to load incident types:', error.message);
      return makeResponse([]);
    }
    return makeResponse(data || []);
  },

  create: async (data: any) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    let imageUrls: string[] = [];
    if (data.images && data.images.length > 0) {
      for (const img of data.images) {
        if (img.startsWith('file://') || img.startsWith('content://')) {
          const url = await uploadMedia(img);
          if (url) imageUrls.push(url);
        } else {
          imageUrls.push(img);
        }
      }
    }

    let geohash = '';
    if (data.latitude && data.longitude) {
      const lat = data.latitude;
      const lng = data.longitude;
      const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
      let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
      let isLng = true;
      let bit = 0;
      let idx = 0;
      while (geohash.length < 7) {
        if (isLng) {
          const mid = (minLng + maxLng) / 2;
          if (lng >= mid) { idx = idx * 2 + 1; minLng = mid; }
          else { idx = idx * 2; maxLng = mid; }
        } else {
          const mid = (minLat + maxLat) / 2;
          if (lat >= mid) { idx = idx * 2 + 1; minLat = mid; }
          else { idx = idx * 2; maxLat = mid; }
        }
        isLng = !isLng;
        bit++;
        if (bit === 5) { geohash += chars[idx]; idx = 0; bit = 0; }
      }
    }

    let typeId = data.type_id;
    if (!typeId && data.type) {
      const { data: types } = await supabase
        .from('incident_types')
        .select('id, code')
        .eq('code', data.type)
        .limit(1)
        .maybeSingle();
      if (types) typeId = types.id;
    }

    const insertData: any = {
      type_id: typeId || null,
      title: data.title || 'Untitled Report',
      description: data.description || null,
      town: data.town || null,
      lat: data.latitude || null,
      lng: data.longitude || null,
      geohash: geohash || null,
      area_radius_m: data.radius || 200,
      created_by: userId,
    };

    const { data: newIncident, error } = await supabase
      .from('incidents')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(error.message);

    const { data: fullIncident } = await supabase
      .from('incidents')
      .select(`
        id, type_id, title, description, town, lat, lng,
        status, verification_level, created_at, created_by,
        incident_types(id, code, label, severity),
        profiles:created_by(id, display_name, avatar_url, trust_score)
      `)
      .eq('id', newIncident.id)
      .single();

    const profile = Array.isArray((fullIncident as any)?.profiles) ? (fullIncident as any).profiles[0] : (fullIncident as any)?.profiles;
    const incidentType = Array.isArray((fullIncident as any)?.incident_types) ? (fullIncident as any).incident_types[0] : (fullIncident as any)?.incident_types;

    if (imageUrls.length > 0) {
      for (const url of imageUrls) {
        await supabase.from('incident_media').insert({
          incident_id: newIncident.id,
          path: url,
          mime: 'image/jpeg',
        });
      }
    }

    const post: Post = {
      id: newIncident.id,
      userId: newIncident.created_by,
      userName: profile?.display_name || 'Anonymous',
      userAvatar: profile?.avatar_url || '',
      userTown: newIncident.town || data.town || '',
      type: incidentType?.code || incidentType?.label || 'alert',
      title: newIncident.title || '',
      description: newIncident.description || '',
      images: imageUrls,
      radius: 200,
      createdAt: newIncident.created_at,
      verified: false,
      likes: 0,
      comments: 0,
      shares: 0,
      votes: { upvotes: 0, downvotes: 0, userVote: null },
      latitude: newIncident.lat,
      longitude: newIncident.lng,
    };

    return makeResponse(post);
  },
};

export const groupsApi = {
  getAll: async () => {
    const [userIdResult, groupsResult] = await Promise.all([
      getCurrentUserId(),
      supabase
        .from('groups')
        .select(`
          id, name, geohash_prefix, visibility, created_at, created_by,
          member_count,
          group_members(count)
        `)
        .order('created_at', { ascending: false }),
    ]);

    const userId = userIdResult;
    const { data, error } = groupsResult;

    if (error) return makeResponse([]);

    let membershipSet = new Set<string>();
    let pendingSet = new Set<string>();
    if (userId) {
      const [membershipsRes, pendingRes] = await Promise.all([
        supabase.from('group_members').select('group_id').eq('user_id', userId),
        supabase.from('group_requests').select('group_id').eq('user_id', userId).eq('status', 'pending'),
      ]);
      (membershipsRes.data || []).forEach((m: any) => membershipSet.add(m.group_id));
      (pendingRes.data || []).forEach((r: any) => pendingSet.add(r.group_id));
    }

    const groups: Group[] = (data || []).map((g: any) => {
      const denormalizedCount = typeof g.member_count === 'number' ? g.member_count : null;
      const memberCountArr = g.group_members;
      const subSelectCount = Array.isArray(memberCountArr) && memberCountArr.length > 0
        ? memberCountArr[0].count : 0;
      const memberCount = denormalizedCount !== null ? denormalizedCount : subSelectCount;
      return {
        id: g.id,
        name: g.name,
        area: g.geohash_prefix || '',
        isPublic: g.visibility === 'public',
        memberCount,
        createdBy: g.created_by,
        isMember: membershipSet.has(g.id),
        requestPending: pendingSet.has(g.id),
      };
    });

    return makeResponse(groups);
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id, name, geohash_prefix, visibility, created_at, created_by,
        group_members(count)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return makeResponse(null);

    const memberCountArr = (data as any).group_members;
    const memberCount = Array.isArray(memberCountArr) && memberCountArr.length > 0
      ? memberCountArr[0].count : 0;

    return makeResponse({
      id: data.id,
      name: data.name,
      area: (data as any).geohash_prefix || '',
      isPublic: (data as any).visibility === 'public',
      memberCount,
      createdBy: data.created_by,
    } as Group);
  },

  getMessages: async (groupId: string) => {
    // FIX 7: Only load last 24 hours of messages
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('group_messages')
      .select(`
        id, group_id, user_id, message, image_url, created_at,
        profiles!group_messages_user_id_fkey(display_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .gt('created_at', since)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) return makeResponse([]);

    const messages: GroupMessage[] = (data || []).map((m: any) => ({
      id: m.id,
      groupId: m.group_id,
      userId: m.user_id,
      userName: m.profiles?.display_name || 'Anonymous',
      userAvatar: m.profiles?.avatar_url || '',
      text: m.message || '',
      imageUrl: m.image_url || null,
      createdAt: m.created_at,
    }));

    return makeResponse(messages);
  },

  sendMessage: async (groupId: string, text: string, imageUrl?: string | null) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    let finalImageUrl = imageUrl || null;
    if (finalImageUrl && (finalImageUrl.startsWith('file://') || finalImageUrl.startsWith('content://'))) {
      finalImageUrl = await uploadMedia(finalImageUrl);
    }

    const { data, error } = await supabase
      .from('group_messages')
      .insert({
        group_id: groupId,
        user_id: userId,
        message: text || (finalImageUrl ? '📷 Photo' : ''),
        image_url: finalImageUrl,
      })
      .select(`
        id, group_id, user_id, message, image_url, created_at,
        profiles!group_messages_user_id_fkey(display_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(error.message);

    const msgProfile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    const msg: GroupMessage = {
      id: data.id,
      groupId: data.group_id,
      userId: data.user_id,
      userName: msgProfile?.display_name || 'Anonymous',
      userAvatar: msgProfile?.avatar_url || '',
      text: data.message || '',
      imageUrl: data.image_url || null,
      createdAt: data.created_at,
    };

    return makeResponse(msg);
  },

  getMembers: async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id, user_id, role, joined_at,
        profiles:user_id(display_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('[getMembers] error:', error);
      return makeResponse([]);
    }

    const members: GroupMember[] = (data || []).map((m: any) => ({
      id: `${m.group_id}_${m.user_id}`,
      groupId: m.group_id,
      userId: m.user_id,
      userName: m.profiles?.display_name || 'Anonymous',
      userAvatar: m.profiles?.avatar_url || '',
      role: m.role || 'member',
      joinedAt: m.joined_at,
    }));

    return makeResponse(members);
  },

  // FIX 8: checkMembership helper for member pill
  checkMembership: async (groupId: string): Promise<{ isMember: boolean; role: string | null }> => {
    const userId = await getCurrentUserId();
    if (!userId) return { isMember: false, role: null };

    const { data } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    return { isMember: !!data, role: data?.role || null };
  },

  join: async (groupId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    try {
      // FIX 9: request_join_group only takes p_group_id — no p_user_id
      const { data, error } = await supabase.rpc('request_join_group', {
        p_group_id: groupId,
      });

      if (error) throw error;

      const status = data?.status || data;
      if (status === 'joined' || status === 'already_member') {
        return makeResponse({ joined: true, status });
      }
      return makeResponse({ joined: false, status: status || 'requested' });
    } catch (err: any) {
      const { data: group } = await supabase.from('groups').select('visibility').eq('id', groupId).single();
      if (group?.visibility === 'public') {
        const { error: insertErr } = await supabase.from('group_members').insert({
          group_id: groupId,
          user_id: userId,
          role: 'member',
        });
        if (!insertErr) {
          return makeResponse({ joined: true, status: 'joined' });
        }
      } else {
        const { error: reqErr } = await supabase.from('group_requests').insert({
          group_id: groupId,
          user_id: userId,
          status: 'pending',
        });
        if (!reqErr) return makeResponse({ joined: false, status: 'requested' });
      }
      return makeResponse({ joined: false, status: 'error' });
    }
  },

  leave: async (groupId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    return makeResponse({ success: true });
  },

  update: async (groupId: string, data: { name?: string; area?: string; isPublic?: boolean }) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.area !== undefined) updateData.geohash_prefix = data.area;
    if (data.isPublic !== undefined) updateData.visibility = data.isPublic ? 'public' : 'private';

    const { data: updated, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', groupId)
      .select(`
        id, name, geohash_prefix, visibility, created_at, created_by,
        group_members(count)
      `)
      .single();

    if (error) return makeResponse(null);

    const memberCountArr = (updated as any).group_members;
    const memberCount = Array.isArray(memberCountArr) && memberCountArr.length > 0
      ? memberCountArr[0].count : 0;

    return makeResponse({
      id: updated.id,
      name: updated.name,
      area: (updated as any).geohash_prefix || '',
      isPublic: (updated as any).visibility === 'public',
      memberCount,
      createdBy: updated.created_by,
    } as Group);
  },

  deleteGroup: async (groupId: string) => {
    await supabase.from('groups').delete().eq('id', groupId);
    return makeResponse({ success: true });
  },

  removeMember: async (groupId: string, userId: string) => {
    // FIX 10: use remove_group_member RPC with correct params
    try {
      await supabase.rpc('remove_group_member', {
        p_group_id: groupId,
        p_user_id_to_remove: userId,
      });
    } catch {
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    }
    return makeResponse({ success: true });
  },

  getJoinRequests: async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_requests')
      .select(`
        id, group_id, user_id, status, created_at,
        profiles:user_id(display_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) return makeResponse([]);

    const requests: GroupJoinRequest[] = (data || []).map((r: any) => ({
      id: r.id,
      groupId: r.group_id,
      userId: r.user_id,
      userName: r.profiles?.display_name || 'Anonymous',
      userAvatar: r.profiles?.avatar_url || '',
      status: r.status,
      createdAt: r.created_at,
    }));

    return makeResponse(requests);
  },

  approveRequest: async (groupId: string, requestId: string) => {
    try {
      // FIX 11: approve_group_request only takes p_request_id — no p_group_id
      const { error } = await supabase.rpc('approve_group_request', {
        p_request_id: requestId,
      });
      if (error) throw error;
    } catch {
      await supabase.from('group_requests').update({ status: 'approved' }).eq('id', requestId);
      const { data: req } = await supabase.from('group_requests').select('user_id').eq('id', requestId).single();
      if (req) {
        await supabase.from('group_members').insert({
          group_id: groupId,
          user_id: req.user_id,
          role: 'member',
        });
      }
    }
    return makeResponse({ success: true });
  },

  // FIX 12: status must be 'rejected' not 'denied'
  denyRequest: async (groupId: string, requestId: string) => {
    await supabase.from('group_requests').update({ status: 'rejected' }).eq('id', requestId);
    return makeResponse({ success: true });
  },

  // Report group — members only, one report per user
  reportGroup: async (groupId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    // Check if already reported
    const { data: existing } = await supabase
      .from('group_reports')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return makeResponse({ alreadyReported: true });

    await supabase.from('group_reports').insert({ group_id: groupId, user_id: userId });
    await supabase.rpc('increment_group_reports', { p_group_id: groupId });
    return makeResponse({ success: true });
  },

  create: async (data: any) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    try {
      const { data: result, error } = await supabase.rpc('create_group_with_creator', {
        p_name: data.name || 'New Group',
        p_geohash_prefix: data.area || '',
        p_visibility: (data.isPublic ?? true) ? 'public' : 'private',
      });

      if (error) throw error;

      const groupId = result?.id || result;

      const { data: group } = await supabase
        .from('groups')
        .select(`
          id, name, geohash_prefix, visibility, created_at, created_by,
          group_members(count)
        `)
        .eq('id', groupId)
        .single();

      if (group) {
        const memberCountArr = (group as any).group_members;
        const memberCount = Array.isArray(memberCountArr) && memberCountArr.length > 0
          ? memberCountArr[0].count : 1;
        return makeResponse({
          id: group.id,
          name: group.name,
          area: (group as any).geohash_prefix || '',
          isPublic: (group as any).visibility === 'public',
          memberCount,
          createdBy: group.created_by,
        } as Group);
      }
    } catch {}

    const { data: newGroup, error } = await supabase
      .from('groups')
      .insert({
        name: data.name || 'New Group',
        geohash_prefix: data.area || '',
        visibility: (data.isPublic ?? true) ? 'public' : 'private',
        created_by: userId,
      })
      .select(`
        id, name, geohash_prefix, visibility, created_at, created_by,
        group_members(count)
      `)
      .single();

    if (error) throw new Error(error.message);

    await supabase.from('group_members').insert({
      group_id: newGroup.id,
      user_id: userId,
      role: 'creator',
    });

    return makeResponse({
      id: newGroup.id,
      name: newGroup.name,
      area: (newGroup as any).geohash_prefix || '',
      isPublic: (newGroup as any).visibility === 'public',
      memberCount: 1,
      createdBy: userId,
    } as Group);
  },
};

export const userApi = {
  getProfile: async () => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data: authUser } = await supabase.auth.getUser();

    const [profileRes, subscriptionRes, followersRes, followingRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, display_name, full_name, phone, avatar_url, trust_score, level, created_at, town')
        .eq('id', userId)
        .single(),
      supabase.from('user_subscriptions')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .maybeSingle(),
      supabase.from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId),
      supabase.from('user_follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId),
    ]);

    const profile = profileRes.data;
    const subscription = subscriptionRes.data;
    const followersCount = followersRes.count || 0;
    const followingCount = followingRes.count || 0;

    const user: User = {
      id: userId,
      email: authUser?.user?.email || '',
      displayName: profile?.display_name || authUser?.user?.user_metadata?.display_name || '',
      phone: profile?.phone || '',
      // FIX 13: avatar_url is already a full URL — use directly
      avatarUrl: profile?.avatar_url || '',
      level: profile?.level ?? 1,
      trustScore: profile?.trust_score || 0,
      followers: followersCount,
      following: followingCount,
      subscriptionType: (subscription as any)?.plans?.name || (subscription ? 'Active' : 'Free'),
      subscriptionExpiry: subscription?.expires_at || '',
      subscriptionStatus: subscription ? 'active' : 'none',
      subscriptionPlanName: (subscription as any)?.plans?.name || null,
      town: profile?.town || '',
    };

    return makeResponse(user);
  },

  // FIX 14: getPublicProfile for viewing other users
  getPublicProfile: async (targetUserId: string) => {
    const currentUserId = await getCurrentUserId();

    const [profileRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, display_name, full_name, avatar_url, trust_score, level, town')
        .eq('id', targetUserId)
        .maybeSingle(),
      supabase.from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', targetUserId),
      supabase.from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', targetUserId),
      currentUserId ? supabase.from('user_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      console.error('[getPublicProfile] No profile found for userId:', targetUserId, 'error:', profileRes.error);
      return makeResponse(null);
    }

    return makeResponse({
      id: profile.id,
      displayName: profile.display_name || profile.full_name || 'Anonymous',
      avatarUrl: profile.avatar_url || '',
      trustScore: profile.trust_score || 0,
      level: profile.level ?? 1,
      town: profile.town || '',
      bio: '',
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
      isFollowing: !!(isFollowingRes as any).data,
      isOwnProfile: currentUserId === targetUserId,
    });
  },

  // FIX 15: follow a user
  follow: async (targetUserId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    await supabase.from('user_follows').insert({
      follower_id: userId,
      following_id: targetUserId,
    });

    // Notify via user_notifications (correct table)
    await supabase.from('user_notifications').insert({
      user_id: targetUserId,
      type: 'follow',
      title: 'New Follower',
      message: 'Someone started following you',
      entity_id: userId,
    });

    return makeResponse({ success: true });
  },

  // FIX 16: unfollow a user
  unfollow: async (targetUserId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    await supabase.from('user_follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetUserId);

    return makeResponse({ success: true });
  },

  // FIX 17: get followers list
  getFollowers: async (targetUserId: string) => {
    const { data: follows } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', targetUserId);

    if (!follows || follows.length === 0) return makeResponse([]);

    const ids = follows.map((f: any) => f.follower_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, trust_score')
      .in('id', ids);

    return makeResponse(profiles || []);
  },

  // FIX 18: get following list
  getFollowing: async (targetUserId: string) => {
    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', targetUserId);

    if (!follows || follows.length === 0) return makeResponse([]);

    const ids = follows.map((f: any) => f.following_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, trust_score')
      .in('id', ids);

    return makeResponse(profiles || []);
  },

  // FIX 19: update display name
  updateDisplayName: async (displayName: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', userId);

    if (error) throw new Error(error.message);
    return makeResponse({ success: true });
  },

  updateAvatar: async (avatarUri: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    let avatarUrl = avatarUri;
    if (avatarUri.startsWith('file://') || avatarUri.startsWith('content://')) {
      const uploaded = await uploadMedia(avatarUri);
      if (uploaded) avatarUrl = uploaded;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    return makeResponse({ success: true, avatarUrl });
  },
};

export const casesApi = {
  getAll: async () => {
    const userId = await getCurrentUserId();
    if (!userId) return makeResponse([]);

    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return makeResponse([]);

    const cases: Case[] = (data || []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      title: c.title || '',
      description: c.description || '',
      status: c.status || 'open',
      caseType: c.category || 'other',
      priority: c.priority || 'medium',
      evidence: c.evidence || [],
      documents: c.documents || [],
      assignedTo: c.assigned_to || null,
      createdAt: c.created_at,
      updatedAt: c.updated_at || c.created_at,
    }));

    return makeResponse(cases);
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return makeResponse(null);

    const caseItem: Case = {
      id: data.id,
      userId: data.user_id,
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'open',
      caseType: data.category || 'other',
      priority: data.priority || 'medium',
      evidence: data.evidence || [],
      documents: data.documents || [],
      assignedTo: data.assigned_to || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
    };

    return makeResponse(caseItem);
  },

  // FIX 20: subscription check uses correct table and both conditions
  checkAccess: async (): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    return !error && !!data;
  },

  create: async (caseData: any) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    let evidence: any[] = [];
    if (caseData.images && caseData.images.length > 0) {
      for (const img of caseData.images) {
        let url = img;
        if (img.startsWith('file://') || img.startsWith('content://')) {
          const uploaded = await uploadMedia(img);
          if (uploaded) url = uploaded;
        }
        evidence.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: 'image',
          url,
          description: '',
          addedAt: new Date().toISOString(),
        });
      }
    }

    const { data, error } = await supabase
      .from('cases')
      .insert({
        user_id: userId,
        title: caseData.title || 'Untitled Case',
        description: caseData.description || '',
        status: 'open',
        category: caseData.caseType || 'other',
        priority: caseData.priority || 'medium',
        evidence,
        documents: [],
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return makeResponse({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      status: data.status,
      caseType: data.category,
      priority: data.priority,
      evidence: data.evidence || [],
      documents: data.documents || [],
      assignedTo: data.assigned_to || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
    } as Case);
  },

  update: async (id: string, updateData: any) => {
    const dbData: any = { updated_at: new Date().toISOString() };
    if (updateData.title !== undefined) dbData.title = updateData.title;
    if (updateData.description !== undefined) dbData.description = updateData.description;
    if (updateData.status !== undefined) dbData.status = updateData.status;
    if (updateData.priority !== undefined) dbData.priority = updateData.priority;
    if (updateData.evidence !== undefined) dbData.evidence = updateData.evidence;
    if (updateData.documents !== undefined) dbData.documents = updateData.documents;

    const { data, error } = await supabase
      .from('cases')
      .update(dbData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return makeResponse(data);
  },
};

export const devicesApi = {
  getAll: async () => {
    const userId = await getCurrentUserId();
    if (!userId) return makeResponse([]);

    const { data, error } = await supabase
      .from('tracked_devices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return makeResponse([]);

    const devices: TrackedDevice[] = (data || []).map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      deviceName: d.device_name || '',
      deviceType: d.device_type || 'phone',
      imei: d.imei || '',
      status: d.status || 'active',
      lastKnownLocation: d.last_known_location || null,
      lastSeen: d.last_seen || null,
      createdAt: d.created_at,
    }));

    return makeResponse(devices);
  },

  register: async (deviceData: any) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tracked_devices')
      .insert({
        user_id: userId,
        device_name: deviceData.deviceName,
        device_type: deviceData.deviceType || 'phone',
        imei: deviceData.imei || '',
        status: 'active',
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return makeResponse({
      id: data.id,
      userId: data.user_id,
      deviceName: data.device_name,
      deviceType: data.device_type,
      imei: data.imei,
      status: data.status,
      lastKnownLocation: data.last_known_location || null,
      lastSeen: data.last_seen || null,
      createdAt: data.created_at,
    } as TrackedDevice);
  },

  updateStatus: async (id: string, status: string) => {
    const { error } = await supabase
      .from('tracked_devices')
      .update({ status })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return makeResponse({ success: true });
  },
};

export const supportApi = {
  getAll: async () => {
    const userId = await getCurrentUserId();
    if (!userId) return makeResponse([]);

    const { data, error } = await supabase
      .from('support_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return makeResponse([]);

    const requests: SupportRequest[] = (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      type: r.request_type || 'counseling',
      status: r.status || 'pending',
      description: r.description || '',
      contactMethod: r.contact_method || 'phone', doc1: r.doc_1 || null, doc2: r.doc_2 || null, doc3: r.doc_3 || null,
      createdAt: r.created_at,
    }));

    return makeResponse(requests);
  },

  create: async (requestData: any) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('support_requests')
      .insert({
        user_id: userId,
        request_type: requestData.type || 'counseling',
        description: requestData.description || '',
        contact_method: requestData.contactMethod || 'phone', doc_1: requestData.doc1 || null, doc_2: requestData.doc2 || null, doc_3: requestData.doc3 || null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    return makeResponse({
      id: data.id,
      userId: data.user_id,
      type: data.request_type,
      status: data.status,
      description: data.description,
      contactMethod: data.contact_method, doc1: data.doc_1 || null, doc2: data.doc_2 || null, doc3: data.doc_3 || null,
      createdAt: data.created_at,
    } as SupportRequest);
  },
};

export default {};