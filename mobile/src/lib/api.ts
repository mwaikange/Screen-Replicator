import { supabase, siteUrl, supabaseUrl } from './supabase';
import { User, Post, Group, Comment, TimelineEvent, GroupMessage, GroupMember, GroupJoinRequest, Case, TrackedDevice, SupportRequest } from './types';

export const postImages: Record<string, any> = {};

function makeResponse<T>(data: T) {
  return { data };
}

function getStorageUrl(bucket: string, filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
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
    const token = await getAuthToken();
    if (!token) return null;

    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    const uploadUrl = siteUrl || process.env.EXPO_PUBLIC_SITE_URL || '';
    const response = await fetch(`${uploadUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      return result.url || result.publicUrl || null;
    }
    return null;
  } catch (error) {
    console.error('Upload failed:', error);
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
        .select('id, display_name, full_name, phone, email, avatar_url, trust_score, level, bio, created_at, town')
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

    console.log('Login success, token:', data.session.access_token.substring(0, 20) + '...');
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

    console.log('Feed data count:', data?.length);
    if (data && data.length > 0) {
      console.log('First post:', JSON.stringify({ id: data[0].id, title: data[0].title, created_by: data[0].created_by }));
    }

    const userId = await getCurrentUserId();

    const posts: Post[] = (data || []).map((item: any) => {
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      const incidentType = Array.isArray(item.incident_types) ? item.incident_types[0] : item.incident_types;
      const media = item.incident_media || [];
      const images = media.map((m: any) => getStorageUrl('incident-media', m.path)).filter(Boolean);
      return {
        id: item.id,
        userId: item.created_by,
        userName: profile?.display_name || 'Anonymous',
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
    const images = media.map((m: any) => getStorageUrl('incident-media', m.path)).filter(Boolean);

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
    const { data, error } = await supabase
      .from('group_messages')
      .select(`
        id, group_id, user_id, message, image_url, created_at,
        profiles!group_messages_user_id_fkey(display_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

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
        id, group_id, user_id, role, joined_at,
        profiles!group_members_user_id_fkey(display_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) return makeResponse([]);

    const members: GroupMember[] = (data || []).map((m: any) => ({
      id: m.id,
      groupId: m.group_id,
      userId: m.user_id,
      userName: m.profiles?.display_name || 'Anonymous',
      userAvatar: m.profiles?.avatar_url || '',
      role: m.role || 'member',
      joinedAt: m.joined_at,
    }));

    return makeResponse(members);
  },

  join: async (groupId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase.rpc('request_join_group', {
        p_group_id: groupId,
        p_user_id: userId,
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
          try { await supabase.rpc('increment_group_member_count', { p_group_id: groupId }); } catch {}
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
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
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
      const { error } = await supabase.rpc('approve_group_request', {
        p_request_id: requestId,
        p_group_id: groupId,
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

  denyRequest: async (groupId: string, requestId: string) => {
    await supabase.from('group_requests').update({ status: 'denied' }).eq('id', requestId);
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
        .select('id, display_name, full_name, phone, email, avatar_url, trust_score, level, bio, created_at, town')
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

    console.log('Profile fetched from API:', JSON.stringify({ id: user.id, name: user.displayName, email: user.email }));
    return makeResponse(user);
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
      caseType: c.case_type || 'general',
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
      caseType: data.case_type || 'general',
      priority: data.priority || 'medium',
      evidence: data.evidence || [],
      documents: data.documents || [],
      assignedTo: data.assigned_to || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at || data.created_at,
    };

    return makeResponse(caseItem);
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
        case_type: caseData.caseType || 'general',
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
      caseType: data.case_type,
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
      contactMethod: r.contact_method || 'phone',
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
        contact_method: requestData.contactMethod || 'phone',
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
      contactMethod: data.contact_method,
      createdAt: data.created_at,
    } as SupportRequest);
  },
};

export default {};
