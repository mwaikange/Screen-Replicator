import { User, Post, Group } from './types';

let currentUser: User | null = null;

const samplePosts: Post[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Cykes man',
    userAvatar: '',
    userTown: 'Swakopmund',
    type: 'missing_person',
    title: 'MISSING CHILD REPORT',
    description: 'Child is wearing a t-shirt and nappy only. No shoes so if seen please do contact the parents immediately. Last seen near the town center playground area.',
    images: [],
    radius: 200,
    createdAt: new Date().toISOString(),
    verified: true,
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Maria N.',
    userAvatar: '',
    userTown: 'Windhoek',
    type: 'incident',
    title: 'Break-in Reported on Independence Ave',
    description: 'A break-in was reported at a local shop on Independence Avenue early this morning. Suspects were seen fleeing towards the northern suburbs. Residents are advised to stay alert.',
    images: [],
    radius: 500,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    verified: true,
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'John K.',
    userAvatar: '',
    userTown: 'Walvis Bay',
    type: 'alert',
    title: 'Flooding Alert - Coastal Road',
    description: 'Heavy rainfall has caused flooding on the coastal road between Walvis Bay and Swakopmund. Please avoid this route and use alternative roads until further notice.',
    images: [],
    radius: 1000,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    verified: false,
  },
  {
    id: '4',
    userId: 'user4',
    userName: 'Priscilla T.',
    userAvatar: '',
    userTown: 'Oshakati',
    type: 'missing_person',
    title: 'Missing Elderly Person - Urgent',
    description: 'An elderly man aged 72 has been missing since yesterday afternoon. He was last seen wearing a brown jacket and grey trousers near the market. He has a medical condition requiring daily medication.',
    images: [],
    radius: 300,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    verified: true,
  },
  {
    id: '5',
    userId: 'user5',
    userName: 'David M.',
    userAvatar: '',
    userTown: 'Rundu',
    type: 'incident',
    title: 'Suspicious Vehicle Sighting',
    description: 'A white van with no registration plates has been seen driving slowly through residential areas. Multiple residents have reported it circling the neighborhood over the past two days.',
    images: [],
    radius: 400,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    verified: false,
  },
  {
    id: '6',
    userId: 'user6',
    userName: 'Sarah L.',
    userAvatar: '',
    userTown: 'Otjiwarongo',
    type: 'alert',
    title: 'Power Outage Warning',
    description: 'Scheduled power maintenance will affect the northern suburbs this weekend. Please prepare accordingly and secure all perishable items.',
    images: [],
    radius: 800,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    verified: true,
  },
];

const sampleGroups: Group[] = [
  {
    id: 'g1',
    name: 'Swakopmund Watch',
    area: 'Swakopmund Central',
    isPublic: true,
    memberCount: 48,
    createdBy: 'user1',
  },
  {
    id: 'g2',
    name: 'Windhoek Neighborhood Safety',
    area: 'Windhoek West',
    isPublic: true,
    memberCount: 124,
    createdBy: 'user2',
  },
  {
    id: 'g3',
    name: 'Walvis Bay Community Watch',
    area: 'Walvis Bay',
    isPublic: true,
    memberCount: 67,
    createdBy: 'user3',
  },
  {
    id: 'g4',
    name: 'Oshakati Alert Network',
    area: 'Oshakati Town',
    isPublic: false,
    memberCount: 35,
    createdBy: 'user4',
  },
  {
    id: 'g5',
    name: 'Rundu Safety Group',
    area: 'Rundu Central',
    isPublic: true,
    memberCount: 89,
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
