import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const authApi = {
  login: (email: string, password: string) => 
    api.post('/api/auth/login', { email, password }),
  signup: (email: string, password: string, displayName?: string) => 
    api.post('/api/auth/signup', { email, password, displayName }),
};

export const postsApi = {
  getAll: (filter?: string) => 
    api.get('/api/posts', { params: { filter } }),
  create: (data: any) => 
    api.post('/api/posts', data),
};

export const groupsApi = {
  getAll: () => api.get('/api/groups'),
  create: (data: any) => api.post('/api/groups', data),
};

export const userApi = {
  getProfile: () => api.get('/api/user'),
};

export default api;
