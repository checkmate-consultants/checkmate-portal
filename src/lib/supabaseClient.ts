import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let cachedClient: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
} else {
  console.warn(
    'Supabase credentials are missing. Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY',
  )
}

export const getSupabaseClient = () => {
  if (!cachedClient) {
    throw new Error(
      'Supabase client is not configured. Ensure env vars are set and restart dev server.',
    )
  }
  return cachedClient
}

