import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const siteUrl = Constants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL || '';

console.log('SUPABASE URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'UNDEFINED');
console.log('SUPABASE KEY:', supabaseAnonKey ? 'SET (' + supabaseAnonKey.length + ' chars)' : 'UNDEFINED');
console.log('SITE URL:', siteUrl || 'UNDEFINED');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials are missing! The app will not connect to the backend.');
}

// SecureStore has a 2048 byte limit per key.
// We chunk large values across multiple keys to avoid the warning.
const CHUNK_SIZE = 1900; // safe margin under 2048
const chunkKey = (key: string, i: number) => `${key}_chunk_${i}`;

async function secureStoreSet(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    // Clean up any old chunks from a previous larger value
    await SecureStore.deleteItemAsync(chunkKey(key, 0)).catch(() => {});
    return;
  }
  // Split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  // Store chunk count in main key
  await SecureStore.setItemAsync(key, `__chunked__${chunks.length}`);
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
  }
}

async function secureStoreGet(key: string): Promise<string | null> {
  const value = await SecureStore.getItemAsync(key);
  if (!value) return null;
  if (!value.startsWith('__chunked__')) return value;
  // Reassemble chunks
  const count = parseInt(value.replace('__chunked__', ''), 10);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (!part) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function secureStoreDelete(key: string): Promise<void> {
  const value = await SecureStore.getItemAsync(key);
  if (value?.startsWith('__chunked__')) {
    const count = parseInt(value.replace('__chunked__', ''), 10);
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {});
    }
  }
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    try { return await secureStoreGet(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    try { await secureStoreSet(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    try { await secureStoreDelete(key); } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { siteUrl, supabaseUrl };