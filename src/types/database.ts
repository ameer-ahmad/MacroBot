export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'manual' | 'custom' | 'usda' | 'open_food_facts'
export type UnitSystem = 'metric' | 'imperial'

export interface Macros {
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          units: UnitSystem
          calorie_goal: number
          protein_goal: number
          carbs_goal: number
          fats_goal: number
          fiber_goal: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          units?: UnitSystem
          calorie_goal?: number
          protein_goal?: number
          carbs_goal?: number
          fats_goal?: number
          fiber_goal?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          units?: UnitSystem
          calorie_goal?: number
          protein_goal?: number
          carbs_goal?: number
          fats_goal?: number
          fiber_goal?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          id: string
          user_id: string
          name: string
          brand: string | null
          serving_size: number
          serving_unit: string
          calories: number
          protein_g: number
          carbs_g: number
          fats_g: number
          fiber_g: number
          barcode: string | null
          source: FoodSource
          external_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          brand?: string | null
          serving_size?: number
          serving_unit?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fats_g?: number
          fiber_g?: number
          barcode?: string | null
          source?: FoodSource
          external_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brand?: string | null
          serving_size?: number
          serving_unit?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fats_g?: number
          fiber_g?: number
          barcode?: string | null
          source?: FoodSource
          external_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      log_entries: {
        Row: {
          id: string
          user_id: string
          food_id: string | null
          logged_date: string
          meal: MealType
          name: string
          quantity: number
          serving_unit: string
          calories: number
          protein_g: number
          carbs_g: number
          fats_g: number
          fiber_g: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          food_id?: string | null
          logged_date?: string
          meal: MealType
          name: string
          quantity?: number
          serving_unit?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fats_g?: number
          fiber_g?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          food_id?: string | null
          logged_date?: string
          meal?: MealType
          name?: string
          quantity?: number
          serving_unit?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fats_g?: number
          fiber_g?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      meal_type: MealType
      food_source: FoodSource
      unit_system: UnitSystem
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type Food = Database['public']['Tables']['foods']['Row']
export type FoodInsert = Database['public']['Tables']['foods']['Insert']
export type LogEntry = Database['public']['Tables']['log_entries']['Row']
export type LogEntryInsert = Database['public']['Tables']['log_entries']['Insert']
