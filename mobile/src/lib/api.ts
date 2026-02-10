import { User, Post, Group } from './types';

let currentUser: User | null = null;

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
    images: [],
    radius: 500,
    createdAt: new Date().toISOString(),
    verified: true,
    likes: 142,
    comments: 89,
    shares: 56,
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
    images: [],
    radius: 300,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    verified: true,
    likes: 87,
    comments: 45,
    shares: 32,
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
    images: [],
    radius: 200,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    verified: true,
    likes: 234,
    comments: 156,
    shares: 189,
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
    images: [],
    radius: 400,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    verified: false,
    likes: 67,
    comments: 23,
    shares: 45,
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
  },
];

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
