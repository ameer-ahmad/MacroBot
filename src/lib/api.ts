import { getSupabase } from '@/lib/supabase'
import type {
  Food,
  FoodInsert,
  LogEntry,
  LogEntryInsert,
  Macros,
  MealType,
  Profile,
  ProfileUpdate,
} from '@/types/database'

export const queryKeys = {
  profile: ['profile'] as const,
  foods: ['foods'] as const,
  food: (id: string) => ['foods', id] as const,
  foodSearch: (query: string) => ['food-search', query] as const,
  logEntries: (date: string) => ['log-entries', date] as const,
  dailyTotals: (date: string) => ['daily-totals', date] as const,
  trends: (start: string, end: string) => ['trends', start, end] as const,
  recentFoods: ['recent-foods'] as const,
  loggableSearch: (query: string) => ['loggable-search', query] as const,
}

export async function fetchProfile(): Promise<Profile | null> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(updates: ProfileUpdate): Promise<Profile> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchFoods(): Promise<Food[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function createFood(food: Omit<FoodInsert, 'user_id'>): Promise<Food> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('foods')
    .insert({ ...food, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchLogEntries(date: string): Promise<LogEntry[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('log_entries')
    .select('*')
    .eq('logged_date', date)
    .order('meal')
    .order('created_at')

  if (error) throw error
  return data ?? []
}

/** Most recent log entries across all dates, newest first (for the recent-foods list). */
export async function fetchRecentLogEntries(limit = 250): Promise<LogEntry[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('log_entries')
    .select('*')
    .order('logged_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function fetchLogEntriesInRange(
  startDate: string,
  endDate: string,
): Promise<LogEntry[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('log_entries')
    .select('*')
    .gte('logged_date', startDate)
    .lte('logged_date', endDate)
    .order('logged_date')
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function createLogEntry(
  entry: Omit<LogEntryInsert, 'user_id'>,
): Promise<LogEntry> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('log_entries')
    .insert({ ...entry, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLogEntry(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('log_entries').delete().eq('id', id)
  if (error) throw error
}

export async function updateLogEntry(
  id: string,
  updates: {
    quantity?: number
    meal?: MealType
    calories?: number
    protein_g?: number
    carbs_g?: number
    fats_g?: number
    fiber_g?: number
    name?: string
    serving_unit?: string
  },
): Promise<LogEntry> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('log_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export function sumMacros(entries: Pick<LogEntry, keyof Macros>[]) {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + Number(entry.calories),
      protein_g: totals.protein_g + Number(entry.protein_g),
      carbs_g: totals.carbs_g + Number(entry.carbs_g),
      fats_g: totals.fats_g + Number(entry.fats_g),
      fiber_g: totals.fiber_g + Number(entry.fiber_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 },
  )
}

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}
