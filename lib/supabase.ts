/**
 * Client Supabase unique de l'application. Utilise expo-secure-store comme
 * storage adapter (jamais AsyncStorage) car la session contient le JWT
 * d'authentification — donnee sensible au sens nLPD.
 */
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra.supabaseUrl as string | undefined) ?? '';
const supabaseAnonKey = (extra.supabaseAnonKey as string | undefined) ?? '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // On ne throw pas : permet de lancer l'app en mode demo/mocks sans backend configure.
  console.warn(
    '[supabase] SUPABASE_URL / SUPABASE_ANON_KEY manquants — verifie ton .env (voir .env.example).',
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export function isSupabaseError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}
