import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isMockMode = !supabaseUrl || !supabaseAnonKey;

if (isMockMode) {
  console.warn("Running in MOCK MODE: Supabase environment variables are missing.");
}

export const isSupabaseConfigured = () => {
  return !isMockMode;
};

export const getSupabaseClient = () => {
  if (isMockMode) {
    // Return a proxy that does nothing or warns
    return new Proxy({}, {
      get: (target, prop) => {
        return () => {
          console.warn(`Supabase ${String(prop)} called in MOCK MODE. No action taken.`);
          return { data: null, error: null };
        };
      }
    }) as any;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : getSupabaseClient();
