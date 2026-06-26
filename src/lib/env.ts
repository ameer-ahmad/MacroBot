function requireEnv(key: string): string {
  const value = import.meta.env[key]
  if (!value) {
    console.warn(`Missing environment variable: ${key}`)
    return ''
  }
  return value
}

export const env = {
  supabaseUrl: requireEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('VITE_SUPABASE_ANON_KEY'),
  usdaApiKey: requireEnv('VITE_USDA_API_KEY'),
} as const
