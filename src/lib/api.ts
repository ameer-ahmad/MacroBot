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
  Recipe,
  RecipeIngredient,
  RecipeIngredientInsert,
  RecipeWithIngredients,
  WeightEntry,
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
  weightEntries: ['weight-entries'] as const,
  recipes: ['recipes'] as const,
  recipe: (id: string) => ['recipes', id] as const,
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

/** Recent daily weight logs, newest first. */
export async function fetchWeightEntries(limit = 180): Promise<WeightEntry[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .order('logged_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/** Insert or update the weight for a given day (one entry per day). */
export async function upsertWeightEntry(input: {
  logged_date: string
  weight_kg: number
}): Promise<WeightEntry> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('weight_entries')
    .upsert(
      { user_id: user.id, logged_date: input.logged_date, weight_kg: input.weight_kg },
      { onConflict: 'user_id,logged_date' },
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('weight_entries').delete().eq('id', id)
  if (error) throw error
}

/**
 * Delete all food log entries and weight logs for the current user.
 * Does not touch profile goals or the saved food library.
 */
export async function resetLoggedData(): Promise<void> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ error: logError }, { error: weightError }] = await Promise.all([
    supabase.from('log_entries').delete().eq('user_id', user.id),
    supabase.from('weight_entries').delete().eq('user_id', user.id),
  ])

  if (logError) throw logError
  if (weightError) throw weightError

  // Clear weekly-adjustment cooldown so it can re-evaluate after new data.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ last_adjustment_date: null })
    .eq('id', user.id)

  if (profileError) throw profileError
}

export type RecipeIngredientInput = Omit<
  RecipeIngredientInsert,
  'id' | 'user_id' | 'recipe_id' | 'created_at' | 'updated_at'
>

export async function fetchRecipes(): Promise<Recipe[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('name')

  if (error) throw error
  return data ?? []
}

/** All recipes with ingredients — used for search cards and totals. */
export async function fetchRecipesWithIngredients(): Promise<RecipeWithIngredients[]> {
  const supabase = getSupabase()
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .order('name')

  if (error) throw error
  if (!recipes?.length) return []

  const { data: ingredients, error: ingError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .order('sort_order')

  if (ingError) throw ingError

  const byRecipe = new Map<string, RecipeIngredient[]>()
  for (const ing of ingredients ?? []) {
    const list = byRecipe.get(ing.recipe_id) ?? []
    list.push(ing)
    byRecipe.set(ing.recipe_id, list)
  }

  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: byRecipe.get(recipe.id) ?? [],
  }))
}

export async function fetchRecipe(id: string): Promise<RecipeWithIngredients | null> {
  const supabase = getSupabase()
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!recipe) return null

  const { data: ingredients, error: ingError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', id)
    .order('sort_order')

  if (ingError) throw ingError

  return { ...recipe, ingredients: ingredients ?? [] }
}

export async function createRecipe(input: {
  name: string
  servings?: number
  notes?: string | null
  ingredients: RecipeIngredientInput[]
}): Promise<RecipeWithIngredients> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      servings: input.servings ?? 1,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw error

  if (input.ingredients.length === 0) {
    return { ...recipe, ingredients: [] }
  }

  const rows = input.ingredients.map((ing, index) => ({
    ...ing,
    recipe_id: recipe.id,
    user_id: user.id,
    sort_order: ing.sort_order ?? index,
  }))

  const { data: ingredients, error: ingError } = await supabase
    .from('recipe_ingredients')
    .insert(rows)
    .select()
    .order('sort_order')

  if (ingError) throw ingError

  return { ...recipe, ingredients: ingredients ?? [] }
}

export async function updateRecipe(
  id: string,
  input: {
    name: string
    servings?: number
    notes?: string | null
    ingredients: RecipeIngredientInput[]
  },
): Promise<RecipeWithIngredients> {
  const supabase = getSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: recipe, error } = await supabase
    .from('recipes')
    .update({
      name: input.name.trim(),
      servings: input.servings ?? 1,
      notes: input.notes ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Replace ingredients wholesale for a simple edit model.
  const { error: deleteError } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', id)

  if (deleteError) throw deleteError

  if (input.ingredients.length === 0) {
    return { ...recipe, ingredients: [] }
  }

  const rows = input.ingredients.map((ing, index) => ({
    ...ing,
    recipe_id: id,
    user_id: user.id,
    sort_order: ing.sort_order ?? index,
  }))

  const { data: ingredients, error: ingError } = await supabase
    .from('recipe_ingredients')
    .insert(rows)
    .select()
    .order('sort_order')

  if (ingError) throw ingError

  return { ...recipe, ingredients: ingredients ?? [] }
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

/** Scale recipe ingredients for logging N servings of a recipe. */
export function scaleRecipeForLog(
  recipe: RecipeWithIngredients,
  servings: number,
): Array<{
  food_id: string | null
  name: string
  quantity: number
  serving_unit: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
}> {
  const baseServings = Number(recipe.servings) || 1
  const factor = servings / baseServings

  return recipe.ingredients.map((ing) => ({
    food_id: ing.food_id,
    name: ing.name,
    quantity: Math.round(Number(ing.quantity) * factor * 1000) / 1000,
    serving_unit: ing.serving_unit,
    calories: Math.round(Number(ing.calories) * factor),
    protein_g: Math.round(Number(ing.protein_g) * factor * 10) / 10,
    carbs_g: Math.round(Number(ing.carbs_g) * factor * 10) / 10,
    fats_g: Math.round(Number(ing.fats_g) * factor * 10) / 10,
    fiber_g: Math.round(Number(ing.fiber_g) * factor * 10) / 10,
  }))
}

export function sumMacros(entries: Pick<LogEntry | RecipeIngredient, keyof Macros>[]) {
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
