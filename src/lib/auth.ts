import { getSupabase } from '@/lib/supabase'
import type { ProfileUpdate } from '@/types/database'

export function needsOnboarding(user: { user_metadata?: Record<string, unknown> } | null) {
  if (!user) return false
  return user.user_metadata?.onboarding_complete !== true
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, onboarding_complete: false },
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function completeOnboarding(updates: ProfileUpdate) {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error: profileError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (profileError) throw profileError

  const { error: authError } = await supabase.auth.updateUser({
    data: { onboarding_complete: true },
  })

  if (authError) throw authError

  await supabase.auth.refreshSession()
}
