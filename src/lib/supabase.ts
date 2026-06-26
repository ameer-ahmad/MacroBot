import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { Database } from '@/types/database'

let client: SupabaseClient<Database> | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}

export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
    )
  }

  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}

export function getSupabaseOrNull(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  return getSupabase()
}

export type SupabaseConnectionStatus = 'not_configured' | 'connected' | 'error'

export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  if (!isSupabaseConfigured()) {
    return 'not_configured'
  }

  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    return error ? 'error' : 'connected'
  } catch {
    return 'error'
  }
}
