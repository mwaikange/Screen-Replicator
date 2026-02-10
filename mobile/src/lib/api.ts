import { User, Post, Group, Comment, TimelineEvent } from './types';

let currentUser: User | null = null;

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

const samplePosts: Post[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Cykes man',
    userAvatar: '',
    userTown: 'Windhoek',
    type: 'incident',
    title: 'NEW GUN LAWS, SINCE POLICE STARTED KILLING DEFENCELESS',
    description: 'Gun laws invoked amid unlawful police killings. The government has announced new measures to address the growing concerns about law enforcement practices.',
    images: ['local:post1'],
    radius: 5000,
    createdAt: new Date(Date.now() - 300000).toISOString(),
    verified: true,
    likes: 142,
    comments: 89,
    shares: 56,
    votes: { upvotes: 1, downvotes: 0, userVote: null },
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Dezzy',
    userAvatar: '',
    userTown: 'Kamainjab',
    type: 'alert',
    title: 'MEASURES INTRODUCED TO MANAGE SOCIAL GRANT QUEUES',
    description: 'New measures have been introduced to manage the long queues at social grant payment points. Officials are working to improve the distribution system.',
    images: ['local:post2'],
    radius: 300,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    verified: true,
    likes: 87,
    comments: 45,
    shares: 32,
    votes: { upvotes: 3, downvotes: 1, userVote: null },
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Maria N.',
    userAvatar: '',
    userTown: 'Swakopmund',
    type: 'missing_person',
    title: 'MISSING CHILD REPORT - URGENT',
    description: 'Child is wearing a t-shirt and nappy only. No shoes so if seen please do contact the parents immediately. Last seen near the town center playground.',
    images: ['local:post3'],
    radius: 200,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    verified: true,
    likes: 234,
    comments: 156,
    shares: 189,
    votes: { upvotes: 12, downvotes: 0, userVote: null },
  },
  {
    id: '4',
    userId: 'user4',
    userName: 'John K.',
    userAvatar: '',
    userTown: 'Walvis Bay',
    type: 'gender_based_violence',
    title: 'GBV AWARENESS CAMPAIGN LAUNCHED',
    description: 'A new campaign against gender-based violence has been launched in the coastal town. Community leaders are calling for action and support for victims.',
    images: ['local:post4'],
    radius: 400,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    verified: false,
    likes: 67,
    comments: 23,
    shares: 45,
    votes: { upvotes: 5, downvotes: 2, userVote: null },
  },
  {
    id: '5',
    userId: 'user5',
    userName: 'Priscilla T.',
    userAvatar: '',
    userTown: 'Oshakati',
    type: 'theft',
    title: 'VEHICLE THEFT REPORTED AT SHOPPING CENTER',
    description: 'A white Toyota Hilux was stolen from the parking lot of the main shopping center. Security footage is being reviewed. Contact police if you have information.',
    images: [],
    radius: 500,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    verified: true,
    likes: 98,
    comments: 34,
    shares: 67,
    votes: { upvotes: 8, downvotes: 0, userVote: null },
  },
  {
    id: '6',
    userId: 'user6',
    userName: 'David M.',
    userAvatar: '',
    userTown: 'Rundu',
    type: 'suspicious_activity',
    title: 'SUSPICIOUS VEHICLE CIRCLING RESIDENTIAL AREA',
    description: 'A white van with no registration plates has been seen driving slowly through residential areas. Multiple residents have reported it circling the neighborhood.',
    images: [],
    radius: 300,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    verified: false,
    likes: 45,
    comments: 12,
    shares: 28,
    votes: { upvotes: 2, downvotes: 1, userVote: null },
  },
];

const sampleComments: Record<string, Comment[]> = {
  '1': [
    {
      id: 'c1',
      postId: '1',
      userId: 'user7',
      userName: 'Ngobo D.',
      userAvatar: '',
      text: 'This is very concerning. We need more community awareness.',
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: 'c2',
      postId: '1',
      userId: 'user2',
      userName: 'Dezzy',
      userAvatar: '',
      text: 'Stay safe everyone. Report any suspicious activity.',
      createdAt: new Date(Date.now() - 2100000).toISOString(),
    },
    {
      id: 'c3',
      postId: '1',
      userId: 'user8',
      userName: 'Sarah L.',
      userAvatar: '',
      text: 'The community needs to come together on this issue. Our voices matter.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  '2': [
    {
      id: 'c4',
      postId: '2',
      userId: 'user3',
      userName: 'Maria N.',
      userAvatar: '',
      text: 'Finally some action on this. The queues were unbearable.',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 'c5',
      postId: '2',
      userId: 'user9',
      userName: 'Peter V.',
      userAvatar: '',
      text: 'Hope this actually makes a difference for elderly people.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  '3': [
    {
      id: 'c6',
      postId: '3',
      userId: 'user1',
      userName: 'Cykes man',
      userAvatar: '',
      text: 'Shared this with all my contacts. Praying for the safe return.',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'c7',
      postId: '3',
      userId: 'user10',
      userName: 'Anna K.',
      userAvatar: '',
      text: 'Everyone please keep your eyes open and report any sightings.',
      createdAt: new Date(Date.now() - 2400000).toISOString(),
    },
  ],
};

const sampleTimelines: Record<string, TimelineEvent[]> = {
  '1': [
    {
      id: 't1',
      postId: '1',
      userId: 'user1',
      userName: 'Cykes man',
      type: 'post_created',
      description: 'Incident report submitted',
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: 't2',
      postId: '1',
      userId: 'system',
      userName: 'System',
      type: 'verified',
      description: 'Post verified by partner organization',
      createdAt: new Date(Date.now() - 240000).toISOString(),
    },
    {
      id: 't3',
      postId: '1',
      userId: 'user7',
      userName: 'Ngobo D.',
      type: 'comment',
      description: 'Added a comment',
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
  ],
  '2': [
    {
      id: 't4',
      postId: '2',
      userId: 'user2',
      userName: 'Dezzy',
      type: 'post_created',
      description: 'Alert report submitted',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  '3': [
    {
      id: 't5',
      postId: '3',
      userId: 'user3',
      userName: 'Maria N.',
      type: 'post_created',
      description: 'Missing person report submitted',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 't6',
      postId: '3',
      userId: 'system',
      userName: 'System',
      type: 'verified',
      description: 'Post verified and escalated to authorities',
      createdAt: new Date(Date.now() - 3000000).toISOString(),
    },
  ],
};

const sampleGroups: Group[] = [
  {
    id: 'g1',
    name: 'Kudu watchers',
    area: 'Gobabis',
    isPublic: true,
    memberCount: 4,
    createdBy: 'user1',
  },
  {
    id: 'g2',
    name: 'Outjo herero location neighborhood watch',
    area: '067',
    isPublic: false,
    memberCount: 6,
    createdBy: 'user2',
  },
  {
    id: 'g3',
    name: 'Windhoek Neighborhood Safety',
    area: 'Windhoek West',
    isPublic: true,
    memberCount: 124,
    createdBy: 'user3',
  },
  {
    id: 'g4',
    name: 'Walvis Bay Community Watch',
    area: 'Walvis Bay',
    isPublic: true,
    memberCount: 67,
    createdBy: 'user4',
  },
  {
    id: 'g5',
    name: 'Oshakati Alert Network',
    area: 'Oshakati Town',
    isPublic: false,
    memberCount: 35,
    createdBy: 'user5',
  },
];

const localPosts = [...samplePosts];
const localComments: Record<string, Comment[]> = { ...sampleComments };

function makeResponse<T>(data: T) {
  return Promise.resolve({ data });
}

export const authApi = {
  login: (email: string, _password: string) => {
    const displayName = email.split('@')[0];
    currentUser = {
      id: 'local-user-' + Date.now(),
      email,
      displayName,
      phone: '+27781669885',
      avatarUrl: '',
      level: 3,
      trustScore: 72,
      followers: 15,
      following: 28,
      subscriptionType: 'Individual 1 Month',
      subscriptionExpiry: '2/21/2026',
      town: 'Swakopmund',
    };
    return makeResponse({ ...currentUser, token: 'mock-token-' + Date.now() });
  },
  signup: (email: string, _password: string, displayName?: string) => {
    currentUser = {
      id: 'local-user-' + Date.now(),
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
    return makeResponse({ ...currentUser, token: 'mock-token-' + Date.now() });
  },
};

export const postsApi = {
  getAll: (_filter?: string) => {
    return makeResponse(localPosts);
  },
  getById: (id: string) => {
    const post = localPosts.find(p => p.id === id);
    return makeResponse(post || null);
  },
  getComments: (postId: string) => {
    return makeResponse(localComments[postId] || []);
  },
  getTimeline: (postId: string) => {
    return makeResponse(sampleTimelines[postId] || []);
  },
  addComment: (postId: string, text: string) => {
    const comment: Comment = {
      id: 'c-' + Date.now(),
      postId,
      userId: currentUser?.id || 'local-user',
      userName: currentUser?.displayName || 'Anonymous',
      userAvatar: '',
      text,
      createdAt: new Date().toISOString(),
    };
    if (!localComments[postId]) localComments[postId] = [];
    localComments[postId].unshift(comment);

    const post = localPosts.find(p => p.id === postId);
    if (post) post.comments += 1;

    return makeResponse(comment);
  },
  vote: (postId: string, vote: 'up' | 'down') => {
    const post = localPosts.find(p => p.id === postId);
    if (post && post.votes) {
      if (vote === 'up') {
        if (post.votes.userVote === 'up') {
          post.votes.upvotes -= 1;
          post.votes.userVote = null;
        } else {
          if (post.votes.userVote === 'down') post.votes.downvotes -= 1;
          post.votes.upvotes += 1;
          post.votes.userVote = 'up';
        }
      } else {
        if (post.votes.userVote === 'down') {
          post.votes.downvotes -= 1;
          post.votes.userVote = null;
        } else {
          if (post.votes.userVote === 'up') post.votes.upvotes -= 1;
          post.votes.downvotes += 1;
          post.votes.userVote = 'down';
        }
      }
    }
    return makeResponse(post);
  },
  like: (postId: string) => {
    const post = localPosts.find(p => p.id === postId);
    if (post) post.likes += 1;
    return makeResponse(post);
  },
  create: (data: any) => {
    const newPost: Post = {
      id: 'post-' + Date.now(),
      userId: currentUser?.id || 'local-user',
      userName: currentUser?.displayName || 'Anonymous',
      userAvatar: '',
      userTown: data.town || currentUser?.town || 'Unknown',
      type: data.type || 'alert',
      title: data.title || 'Untitled Report',
      description: data.description || '',
      images: data.images || [],
      radius: data.radius || 200,
      createdAt: new Date().toISOString(),
      verified: false,
      likes: 0,
      comments: 0,
      shares: 0,
      votes: { upvotes: 0, downvotes: 0, userVote: null },
    };
    localPosts.unshift(newPost);
    return makeResponse(newPost);
  },
};

export const groupsApi = {
  getAll: () => {
    return makeResponse(sampleGroups);
  },
  create: (data: any) => {
    const newGroup: Group = {
      id: 'group-' + Date.now(),
      name: data.name || 'New Group',
      area: data.area || 'Unknown Area',
      isPublic: data.isPublic ?? true,
      memberCount: 1,
      createdBy: currentUser?.id || 'local-user',
    };
    sampleGroups.push(newGroup);
    return makeResponse(newGroup);
  },
};

export const userApi = {
  getProfile: () => {
    const user = currentUser || {
      id: 'default-user',
      email: 'ngocbo@yopmail.com',
      displayName: 'Ngobo D.',
      phone: '+27781669885',
      avatarUrl: '',
      level: 3,
      trustScore: 72,
      followers: 15,
      following: 28,
      subscriptionType: 'Individual 1 Month',
      subscriptionExpiry: '2/21/2026',
      town: 'Swakopmund',
    };
    return makeResponse(user);
  },
};

export default {};
