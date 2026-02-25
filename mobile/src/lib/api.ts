import { supabase, siteUrl } from './supabase';
import { User, Post, Group, Comment, TimelineEvent, GroupMessage, GroupMember, GroupJoinRequest, Case, TrackedDevice, SupportRequest } from './types';

let cachedUser: User | null = null;

const post1Image = require('../../assets/post1.jpg');
const post2Image = require('../../assets/post2.jpg');
const post3Image = require('../../assets/post3.jpg');
const post4Image = require('../../assets/post4.jpg');

export const postImages: Record<string, any> = {
  '1': post1Image,
  '2': post2Image,
  '3': post3Image,
  '4': post4Image,
};

function makeResponse<T>(data: T) {
  return { data };
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const user: User = {
      id: userId,
      email: data.user.email || email,
      displayName: profile?.display_name || data.user.user_metadata?.display_name || email.split('@')[0],
      phone: profile?.phone || data.user.phone || '',
      avatarUrl: profile?.avatar_url || '',
      level: profile?.level || 0,
      trustScore: profile?.trust_score || 0,
      followers: profile?.followers_count || 0,
      following: profile?.following_count || 0,
      subscriptionType: subscription?.plan_name || 'Free',
      subscriptionExpiry: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : '',
      town: profile?.town || '',
    };

    cachedUser = user;
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

    const userId = data.user?.id || '';
    const user: User = {
      id: userId,
      email,
      displayName: displayName || email.split('@')[0],
      phone: '',
      avatarUrl: '',
      level: 0,
      trustScore: 0,
      followers: 0,
      following: 0,
      subscriptionType: 'Free',
      subscriptionExpiry: '',
      town: '',
    };

    cachedUser = user;
    return makeResponse({ ...user, token: data.session?.access_token || '' });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    cachedUser = null;
    return makeResponse({ success: true });
  },
};

export const postsApi = {
  getAll: async (filter?: string) => {
    let query = supabase
      .from('incidents')
      .select(`
        id, user_id, title, description, type, images, radius,
        latitude, longitude, geohash, verified, created_at,
        profiles!incidents_user_id_fkey(display_name, avatar_url, town)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter === 'Verified') {
      query = query.eq('verified', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching posts:', error);
      return makeResponse([]);
    }

    const userId = await getCurrentUserId();

    const posts: Post[] = (data || []).map((item: any) => {
      const profile = item.profiles || {};
      return {
        id: item.id,
        userId: item.user_id,
        userName: profile.display_name || 'Anonymous',
        userAvatar: profile.avatar_url || '',
        userTown: profile.town || '',
        type: item.type || 'alert',
        title: item.title || '',
        description: item.description || '',
        images: item.images || [],
        radius: item.radius || 200,
        createdAt: item.created_at,
        verified: item.verified || false,
        likes: 0,
        comments: 0,
        shares: 0,
        latitude: item.latitude,
        longitude: item.longitude,
      };
    });

    if (posts.length > 0) {
      const postIds = posts.map(p => p.id);

      const { data: likeCounts } = await supabase
        .from('incident_likes')
        .select('incident_id')
        .in('incident_id', postIds);

      const { data: commentCounts } = await supabase
        .from('incident_comments')
        .select('incident_id')
        .in('incident_id', postIds);

      const { data: votesData } = await supabase
        .from('incident_votes')
        .select('incident_id, vote_type, user_id')
        .in('incident_id', postIds);

      const likeMap: Record<string, number> = {};
      (likeCounts || []).forEach((l: any) => {
        likeMap[l.incident_id] = (likeMap[l.incident_id] || 0) + 1;
      });

      const commentMap: Record<string, number> = {};
      (commentCounts || []).forEach((c: any) => {
        commentMap[c.incident_id] = (commentMap[c.incident_id] || 0) + 1;
      });

      const voteMap: Record<string, { up: number; down: number; userVote: 'up' | 'down' | null }> = {};
      (votesData || []).forEach((v: any) => {
        if (!voteMap[v.incident_id]) voteMap[v.incident_id] = { up: 0, down: 0, userVote: null };
        if (v.vote_type === 'up') voteMap[v.incident_id].up += 1;
        else voteMap[v.incident_id].down += 1;
        if (v.user_id === userId) voteMap[v.incident_id].userVote = v.vote_type;
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
        id, user_id, title, description, type, images, radius,
        latitude, longitude, geohash, verified, created_at,
        profiles!incidents_user_id_fkey(display_name, avatar_url, town)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return makeResponse(null);

    const userId = await getCurrentUserId();
    const profile = (data as any).profiles || {};

    const { count: likeCount } = await supabase
      .from('incident_likes')
      .select('*', { count: 'exact', head: true })
      .eq('incident_id', id);

    const { count: commentCount } = await supabase
      .from('incident_comments')
      .select('*', { count: 'exact', head: true })
      .eq('incident_id', id);

    const { data: votesData } = await supabase
      .from('incident_votes')
      .select('vote_type, user_id')
      .eq('incident_id', id);

    let upvotes = 0, downvotes = 0;
    let userVote: 'up' | 'down' | null = null;
    (votesData || []).forEach((v: any) => {
      if (v.vote_type === 'up') upvotes++;
      else downvotes++;
      if (v.user_id === userId) userVote = v.vote_type;
    });

    const post: Post = {
      id: data.id,
      userId: data.user_id,
      userName: profile.display_name || 'Anonymous',
      userAvatar: profile.avatar_url || '',
      userTown: profile.town || '',
      type: data.type || 'alert',
      title: data.title || '',
      description: data.description || '',
      images: data.images || [],
      radius: data.radius || 200,
      createdAt: data.created_at,
      verified: data.verified || false,
      likes: likeCount || 0,
      comments: commentCount || 0,
      shares: 0,
      votes: { upvotes, downvotes, userVote },
      latitude: data.latitude,
      longitude: data.longitude,
    };

    return makeResponse(post);
  },

  getComments: async (postId: string) => {
    const { data, error } = await supabase
      .from('incident_comments')
      .select(`
        id, incident_id, user_id, content, image_url, created_at,
        profiles!incident_comments_user_id_fkey(display_name, avatar_url)
      `)
      .eq('incident_id', postId)
      .order('created_at', { ascending: false });

    if (error) return makeResponse([]);

    const comments: Comment[] = (data || []).map((c: any) => ({
      id: c.id,
      postId: c.incident_id,
      userId: c.user_id,
      userName: c.profiles?.display_name || 'Anonymous',
      userAvatar: c.profiles?.avatar_url || '',
      text: c.content || '',
      imageUrl: c.image_url,
      createdAt: c.created_at,
    }));

    return makeResponse(comments);
  },

  getTimeline: async (postId: string) => {
    const { data, error } = await supabase
      .from('incident_timeline')
      .select(`
        id, incident_id, user_id, event_type, description, created_at,
        profiles!incident_timeline_user_id_fkey(display_name)
      `)
      .eq('incident_id', postId)
      .order('created_at', { ascending: true });

    if (error) return makeResponse([]);

    const timeline: TimelineEvent[] = (data || []).map((t: any) => ({
      id: t.id,
      postId: t.incident_id,
      userId: t.user_id,
      userName: t.profiles?.display_name || 'System',
      type: t.event_type || 'update',
      description: t.description || '',
      createdAt: t.created_at,
    }));

    return makeResponse(timeline);
  },

  addComment: async (postId: string, text: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('incident_comments')
      .insert({
        incident_id: postId,
        user_id: userId,
        content: text,
      })
      .select(`
        id, incident_id, user_id, content, image_url, created_at,
        profiles!incident_comments_user_id_fkey(display_name, avatar_url)
      `)
      .single();

    if (error) throw new Error(error.message);

    const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    const comment: Comment = {
      id: data.id,
      postId: data.incident_id,
      userId: data.user_id,
      userName: profile?.display_name || 'Anonymous',
      userAvatar: profile?.avatar_url || '',
      text: data.content || '',
      createdAt: data.created_at,
    };

    return makeResponse(comment);
  },

  vote: async (postId: string, vote: 'up' | 'down') => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('incident_votes')
      .select('id, vote_type')
      .eq('incident_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.vote_type === vote) {
        await supabase.from('incident_votes').delete().eq('id', existing.id);
      } else {
        await supabase.from('incident_votes').update({ vote_type: vote }).eq('id', existing.id);
      }
    } else {
      await supabase.from('incident_votes').insert({
        incident_id: postId,
        user_id: userId,
        vote_type: vote,
      });
    }

    return postsApi.getById(postId);
  },

  like: async (postId: string) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('incident_likes')
      .select('id')
      .eq('incident_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('incident_likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('incident_likes').insert({
        incident_id: postId,
        user_id: userId,
      });
    }

    return postsApi.getById(postId);
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

    let geohash = null;
    if (data.latitude && data.longitude) {
      try {
        const ngeohash = require('ngeohash');
        geohash = ngeohash.encode(data.latitude, data.longitude, 7);
      } catch {}
    }

    const { data: newIncident, error } = await supabase
      .from('incidents')
      .insert({
        user_id: userId,
        title: data.title || 'Untitled Report',
        description: data.description || '',
        type: data.type || 'alert',
        images: imageUrls,
        radius: data.radius || 200,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        geohash,
      })
      .select(`
        id, user_id, title, description, type, images, radius,
        latitude, longitude, verified, created_at,
        profiles!incidents_user_id_fkey(display_name, avatar_url, town)
      `)
      .single();

    if (error) throw new Error(error.message);

    const profile = (newIncident as any).profiles || {};
    const post: Post = {
      id: newIncident.id,
      userId: newIncident.user_id,
      userName: profile.display_name || 'Anonymous',
      userAvatar: profile.avatar_url || '',
      userTown: profile.town || data.town || '',
      type: newIncident.type || 'alert',
      title: newIncident.title || '',
      description: newIncident.description || '',
      images: newIncident.images || [],
      radius: newIncident.radius || 200,
      createdAt: newIncident.created_at,
      verified: false,
      likes: 0,
      comments: 0,
      shares: 0,
      votes: { upvotes: 0, downvotes: 0, userVote: null },
    };

    return makeResponse(post);
  },
};

export const groupsApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, area, is_public, member_count, created_by')
      .order('created_at', { ascending: false });

    if (error) return makeResponse([]);

    const groups: Group[] = (data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      area: g.area || '',
      isPublic: g.is_public ?? true,
      memberCount: g.member_count || 0,
      createdBy: g.created_by,
    }));

    return makeResponse(groups);
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, area, is_public, member_count, created_by')
      .eq('id', id)
      .single();

    if (error || !data) return makeResponse(null);

    return makeResponse({
      id: data.id,
      name: data.name,
      area: data.area || '',
      isPublic: data.is_public ?? true,
      memberCount: data.member_count || 0,
      createdBy: data.created_by,
    } as Group);
  },

  getMessages: async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_messages')
      .select(`
        id, group_id, user_id, content, image_url, created_at,
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
      text: m.content || '',
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
        content: text || (finalImageUrl ? '📷 Photo' : ''),
        image_url: finalImageUrl,
      })
      .select(`
        id, group_id, user_id, content, image_url, created_at,
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
      text: data.content || '',
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
      const { data: group } = await supabase.from('groups').select('is_public').eq('id', groupId).single();
      if (group?.is_public) {
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
        const { error: reqErr } = await supabase.from('group_join_requests').insert({
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
    if (data.area !== undefined) updateData.area = data.area;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;

    const { data: updated, error } = await supabase
      .from('groups')
      .update(updateData)
      .eq('id', groupId)
      .select('id, name, area, is_public, member_count, created_by')
      .single();

    if (error) return makeResponse(null);

    return makeResponse({
      id: updated.id,
      name: updated.name,
      area: updated.area || '',
      isPublic: updated.is_public ?? true,
      memberCount: updated.member_count || 0,
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
      .from('group_join_requests')
      .select(`
        id, group_id, user_id, status, created_at,
        profiles!group_join_requests_user_id_fkey(display_name, avatar_url)
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
      await supabase.from('group_join_requests').update({ status: 'approved' }).eq('id', requestId);
      const { data: req } = await supabase.from('group_join_requests').select('user_id').eq('id', requestId).single();
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
    await supabase.from('group_join_requests').update({ status: 'denied' }).eq('id', requestId);
    return makeResponse({ success: true });
  },

  create: async (data: any) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Not authenticated');

    try {
      const { data: result, error } = await supabase.rpc('create_group_with_creator', {
        p_name: data.name || 'New Group',
        p_area: data.area || '',
        p_is_public: data.isPublic ?? true,
        p_user_id: userId,
      });

      if (error) throw error;

      const groupId = result?.id || result;

      const { data: group } = await supabase
        .from('groups')
        .select('id, name, area, is_public, member_count, created_by')
        .eq('id', groupId)
        .single();

      if (group) {
        return makeResponse({
          id: group.id,
          name: group.name,
          area: group.area || '',
          isPublic: group.is_public ?? true,
          memberCount: group.member_count || 1,
          createdBy: group.created_by,
        } as Group);
      }
    } catch {}

    const { data: newGroup, error } = await supabase
      .from('groups')
      .insert({
        name: data.name || 'New Group',
        area: data.area || '',
        is_public: data.isPublic ?? true,
        created_by: userId,
        member_count: 1,
      })
      .select('id, name, area, is_public, member_count, created_by')
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
      area: newGroup.area || '',
      isPublic: newGroup.is_public ?? true,
      memberCount: 1,
      createdBy: userId,
    } as Group);
  },
};

export const userApi = {
  getProfile: async () => {
    if (cachedUser) return makeResponse(cachedUser);

    const userId = await getCurrentUserId();
    if (!userId) {
      return makeResponse({
        id: '',
        email: '',
        displayName: 'Guest',
        phone: '',
        avatarUrl: '',
        level: 0,
        trustScore: 0,
        followers: 0,
        following: 0,
        subscriptionType: 'Free',
        subscriptionExpiry: '',
        town: '',
      } as User);
    }

    const { data: authUser } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const user: User = {
      id: userId,
      email: authUser?.user?.email || '',
      displayName: profile?.display_name || authUser?.user?.user_metadata?.display_name || '',
      phone: profile?.phone || '',
      avatarUrl: profile?.avatar_url || '',
      level: profile?.level || 0,
      trustScore: profile?.trust_score || 0,
      followers: profile?.followers_count || 0,
      following: profile?.following_count || 0,
      subscriptionType: subscription?.plan_name || 'Free',
      subscriptionExpiry: subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : '',
      town: profile?.town || '',
    };

    cachedUser = user;
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

    if (cachedUser) cachedUser.avatarUrl = avatarUrl;
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
      type: r.type || 'counseling',
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
        type: requestData.type || 'counseling',
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
      type: data.type,
      status: data.status,
      description: data.description,
      contactMethod: data.contact_method,
      createdAt: data.created_at,
    } as SupportRequest);
  },
};

export default {};
