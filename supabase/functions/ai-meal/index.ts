// MacroBot AI meal/label analysis edge function.
//
// Proxies requests to the OpenAI API so the API key never reaches the browser.
// Supabase enforces auth on this function (verify_jwt = true in config.toml),
// so only signed-in users can call it.
//
// Deploy:  supabase functions deploy ai-meal
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-6-luna'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface AnalyzeRequest {
  mode: 'meal' | 'label'
  text?: string
  image?: string // base64 data URL
}

const mealSchema = {
  name: 'meal_items',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        description: 'One entry per distinct food in the meal.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', description: 'Short food name, e.g. "Eggs".' },
            amount: {
              type: 'number',
              description: 'Numeric amount consumed, in terms of "unit".',
            },
            unit: {
              type: 'string',
              description:
                'Unit for "amount". Use a weight/volume unit ("g", "ml") with the ' +
                'numeric weight when a weight is given or implied; a singular count ' +
                'noun ("egg", "slice", "strip") with the count when the food is ' +
                'counted; or "serving" with amount 1 when it cannot be quantified.',
            },
            calories: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fats_g: { type: 'number' },
            fiber_g: { type: 'number' },
          },
          required: [
            'name',
            'amount',
            'unit',
            'calories',
            'protein_g',
            'carbs_g',
            'fats_g',
            'fiber_g',
          ],
        },
      },
    },
    required: ['items'],
  },
}

const labelSchema = {
  name: 'nutrition_label',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      food: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Product name.' },
          brand: { type: ['string', 'null'], description: 'Brand if visible.' },
          serving_size: {
            type: 'number',
            description: 'Numeric serving size as printed on the label.',
          },
          serving_unit: {
            type: 'string',
            description: 'Serving unit, e.g. g, ml, piece.',
          },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fats_g: { type: 'number' },
          fiber_g: { type: 'number' },
        },
        required: [
          'name',
          'brand',
          'serving_size',
          'serving_unit',
          'calories',
          'protein_g',
          'carbs_g',
          'fats_g',
          'fiber_g',
        ],
      },
    },
    required: ['food'],
  },
}

const mealSystemPrompt =
  'You are a meticulous nutrition expert. Estimate the macronutrients for the ' +
  'food(s) the user describes and/or that appear in the provided photo. Return ' +
  'one item per distinct food. For each item set "amount" and "unit" to describe ' +
  'how much was eaten, and make the macro values the TOTAL for that amount (not ' +
  'per 100g and not per serving). Use a weight/volume unit ("g" or "ml") with the ' +
  'numeric weight whenever a weight is given or can be reasonably inferred (e.g. ' +
  '"100g of cooked chicken breast" -> amount 100, unit "g"). Use a singular count ' +
  'noun with the count for countable foods (e.g. "4 eggs" -> amount 4, unit ' +
  '"egg"). Only when the quantity truly cannot be expressed as a weight or count ' +
  '(e.g. "a beef burger") use amount 1 and unit "serving". Use realistic ' +
  'USDA-based estimates. When a photo is provided with a stated total weight, ' +
  'distribute that weight across the visible components. Never return zero items.'

const labelSystemPrompt =
  'You are an OCR and nutrition extraction expert. Read the nutrition facts ' +
  'label in the image and return the values exactly as printed, per single ' +
  'serving. serving_size must be the numeric amount and serving_unit its unit ' +
  '(e.g. 30 and "g"). Include the brand only if clearly visible, otherwise null. ' +
  'If a value is missing from the label, use 0.'

async function callOpenAi(
  apiKey: string,
  system: string,
  userContent: unknown,
  schema: unknown,
): Promise<unknown> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_schema', json_schema: schema },
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`OpenAI ${res.status}: ${detail}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned no content')
  return JSON.parse(content)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return json({ error: 'OPENAI_API_KEY is not configured on the server.' }, 500)
  }

  let body: AnalyzeRequest
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { mode, text, image } = body

  if (mode === 'label') {
    if (!image) return json({ error: 'A label image is required.' }, 400)
    try {
      const result = await callOpenAi(
        apiKey,
        labelSystemPrompt,
        [
          { type: 'text', text: 'Extract the nutrition facts from this label.' },
          { type: 'image_url', image_url: { url: image } },
        ],
        labelSchema,
      )
      return json(result)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) }, 502)
    }
  }

  // Default: meal description (text and/or photo).
  if (!text?.trim() && !image) {
    return json({ error: 'Describe the meal or attach a photo.' }, 400)
  }

  const userContent: unknown[] = []
  if (text?.trim()) userContent.push({ type: 'text', text: text.trim() })
  if (image) userContent.push({ type: 'image_url', image_url: { url: image } })

  try {
    const result = await callOpenAi(
      apiKey,
      mealSystemPrompt,
      userContent,
      mealSchema,
    )
    return json(result)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 502)
  }
})
