import { createHash, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { sumMacros } from '../src/lib/sumMacros.ts'
import { roundMacro } from '../src/types/food.ts'
import type { Database, Macros } from '../src/types/database.ts'

const TIMEZONE = 'America/Toronto'
const MAX_DAYS = 366
const MS_PER_DAY = 86_400_000
const PAGE_SIZE = 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', ...headers },
  })
}

function digest(value: string) {
  return createHash('sha256').update(value).digest()
}

function parseDay(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return NaN
  // UTC timestamps are only used to enumerate civil dates, including across DST.
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(time) && dayString(time) === value ? time : NaN
}

function dayString(time: number) {
  return new Date(time).toISOString().slice(0, 10)
}

async function readPages<Row extends { id: string }>(
  readPage: (after?: string) => PromiseLike<{ data: Row[] | null; error: unknown }>,
): Promise<Row[]> {
  const rows: Row[] = []
  for (;;) {
    const { data, error } = await readPage(rows.at(-1)?.id)
    if (error || !data) throw new Error('Supabase read failed')
    // Supabase may return fewer rows per page than requested.
    if (data.length === 0) return rows
    rows.push(...data)
  }
}

export async function daybookNutrition(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' })
  }

  const token = process.env.DAYBOOK_API_TOKEN
  const supplied = /^Bearer +([A-Za-z0-9._~+/-]+=*)$/i.exec(request.headers.get('Authorization') ?? '')?.[1]
  if (!token || !supplied || !timingSafeEqual(digest(supplied), digest(token))) {
    return json({ error: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' })
  }

  const { searchParams } = new URL(request.url)
  const fromValues = searchParams.getAll('from')
  const toValues = searchParams.getAll('to')
  const [from] = fromValues
  const [to] = toValues
  const start = parseDay(from)
  const end = parseDay(to)
  const dayCount = (end - start) / MS_PER_DAY + 1
  if (fromValues.length !== 1 || toValues.length !== 1 || !(dayCount >= 1 && dayCount <= MAX_DAYS)) {
    return json({ error: `Provide one valid from and to date in YYYY-MM-DD order, up to ${MAX_DAYS} inclusive days.` }, 400)
  }

  const owner = process.env.DAYBOOK_USER_ID
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!owner || !UUID.test(owner) || !url || !key) {
    return json({ error: 'Daybook nutrition is unavailable' }, 503)
  }

  try {
    const db = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    // logged_date is the selected calendar day in MacroBot, including backdated logs.
    const [food, weights] = await Promise.all([
      readPages((after) => {
        const query = db.from('log_entries')
          .select('id,logged_date,calories,protein_g,carbs_g,fats_g,fiber_g')
          .eq('user_id', owner).gte('logged_date', from).lte('logged_date', to)
          .order('id').limit(PAGE_SIZE)
        return after ? query.gt('id', after) : query
      }),
      readPages((after) => {
        const query = db.from('weight_entries')
          .select('id,logged_date,weight_kg')
          .eq('user_id', owner).gte('logged_date', from).lte('logged_date', to)
          .order('id').limit(PAGE_SIZE)
        return after ? query.gt('id', after) : query
      }),
    ])

    const foodByDate = new Map<string, Macros[]>()
    for (const entry of food) {
      const day = foodByDate.get(entry.logged_date)
      if (day) day.push(entry)
      else foodByDate.set(entry.logged_date, [entry])
    }
    // Weight edits upsert the single row per user and date.
    const weightByDate = new Map(weights.map((entry) => [entry.logged_date, Number(entry.weight_kg)]))
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = dayString(start + index * MS_PER_DAY)
      const entries = foodByDate.get(date)
      const totals = entries ? sumMacros(entries) : null
      return {
        date,
        weightKg: weightByDate.get(date) ?? null,
        caloriesKcal: totals ? roundMacro(totals.calories, 2) : null,
        proteinG: totals ? roundMacro(totals.protein_g, 2) : null,
      }
    })
    return json({ timezone: TIMEZONE, days })
  } catch {
    return json({ error: 'Daybook nutrition is unavailable' }, 503)
  }
}
