import { getSupabase } from '@/lib/supabase'

/** A single food parsed from a meal description or photo (macros are totals consumed). */
export interface AiMealItem {
  name: string
  serving_description: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
}

/** A food extracted from a nutrition-label photo (values are per serving). */
export interface AiLabelFood {
  name: string
  brand: string | null
  serving_size: number
  serving_unit: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
}

const FUNCTION_NAME = 'ai-meal'

/** Read a File into a base64 data URL. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Downscale + re-encode an image to keep the upload small (and AI costs low).
 * Falls back to the original data URL if canvas processing is unavailable.
 */
export async function compressImage(
  file: File,
  maxDim = 1024,
  quality = 0.8,
): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Unsupported image format.'))
      img.src = dataUrl
    })

    let { width, height } = img
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabase()
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body })

  if (error) {
    let message = error.message
    // FunctionsHttpError carries the Response in `context`; pull the server message.
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const parsed = await context.json()
        if (parsed?.error) message = parsed.error
      } catch {
        /* keep default message */
      }
    }
    throw new Error(message || 'AI request failed.')
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error))
  }

  return data as T
}

/** Parse a meal from free text and/or a food photo into individual items. */
export async function analyzeMeal(input: {
  text?: string
  imageDataUrl?: string
}): Promise<AiMealItem[]> {
  const data = await invoke<{ items: AiMealItem[] }>({
    mode: 'meal',
    text: input.text,
    image: input.imageDataUrl,
  })
  return data.items ?? []
}

/** Extract a single food from a nutrition-label photo. */
export async function analyzeLabel(input: {
  imageDataUrl: string
}): Promise<AiLabelFood> {
  const data = await invoke<{ food: AiLabelFood }>({
    mode: 'label',
    image: input.imageDataUrl,
  })
  return data.food
}
