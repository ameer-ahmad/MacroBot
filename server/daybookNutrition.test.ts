import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import vercel from '../api/daybook/nutrition.ts'
import netlify, { config } from '../netlify/functions/daybook-nutrition.mts'

const owner = '11d4d453-d609-4aed-966c-50b7957505f0'
const testToken = 'fixture-token'
const dates = 'from=2026-10-31&to=2026-11-03'
const path = '/api/daybook/nutrition'

function request(query = dates, authorization?: string, method = 'GET') {
  return new Request(`https://macrobot.example${path}?${query}`, {
    method,
    headers: authorization ? { Authorization: authorization } : {},
  })
}

const bearer = `Bearer ${testToken}`

beforeEach(() => {
  vi.stubEnv('DAYBOOK_API_TOKEN', testToken)
  vi.stubEnv('DAYBOOK_USER_ID', owner)
  vi.stubEnv('SUPABASE_URL', 'https://supabase.example')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'fixture-supabase-key')
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([])))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Daybook nutrition', () => {
  it.each([undefined, 'Basic fixture-token', 'Bearer invalid', 'Bearer fixture-token, Bearer invalid'])(
    'rejects missing or invalid authorization (%s) before reading data',
    async (authorization) => {
      for (const handler of [vercel.fetch, netlify]) {
        const result = await handler(request(dates, authorization))
        expect(result.status).toBe(401)
        expect(result.headers.get('WWW-Authenticate')).toBe('Bearer')
        expect(result.headers.get('Cache-Control')).toContain('no-store')
      }
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('fails closed when the bearer secret or owner configuration is missing', async () => {
    vi.stubEnv('DAYBOOK_API_TOKEN', undefined)
    expect((await vercel.fetch(request(dates, bearer))).status).toBe(401)
    vi.stubEnv('DAYBOOK_API_TOKEN', testToken)
    vi.stubEnv('DAYBOOK_USER_ID', undefined)
    expect((await vercel.fetch(request(dates, bearer))).status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    'from=2026-11-01',
    'from=2026-11-1&to=2026-11-03',
    'from=2026-02-29&to=2026-03-01',
    'from=2026-11-03&to=2026-11-01',
    'from=2026-11-01&from=2026-11-02&to=2026-11-03',
    'from=2026-11-01&to=2027-11-02',
  ])('rejects an invalid range (%s) before reading data', async (query) => {
    expect((await vercel.fetch(request(query, bearer))).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects write methods', async () => {
    const result = await vercel.fetch(request(dates, bearer, 'POST'))
    expect(result.status).toBe(405)
    expect(result.headers.get('Allow')).toBe('GET')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns inclusive saved dates across DST, with account-scoped, paginated logged totals', async () => {
    const other = 'be50dcef-ad05-4562-bb40-d80aa0c9adb1'
    const macros = { carbs_g: 0, fats_g: 0, fiber_g: 0 }
    const food = [
      { id: 'a', logged_date: '2026-11-01', calories: 350.2, protein_g: 10.1, ...macros },
      { id: 'b', logged_date: '2026-11-01', calories: 500.3, protein_g: 20.2, ...macros },
      { id: 'c', logged_date: '2026-11-02', calories: 0, protein_g: 0, ...macros },
    ]
    const weight = [{ id: 'd', logged_date: '2026-10-31', weight_kg: 79.4 }]
    const dbFetch = vi.fn(async (input: URL | Request | string, options?: RequestInit) => {
      const { pathname, searchParams } = new URL(input instanceof Request ? input.url : input)
      expect(options?.method).toBe('GET')
      expect(searchParams.get('user_id')).toBe(`eq.${owner}`)
      expect(searchParams.getAll('logged_date')).toEqual(['gte.2026-10-31', 'lte.2026-11-03'])
      expect(searchParams.get('order')).toBe('id.asc')
      const rows = pathname === '/rest/v1/log_entries' ? food : weight
      const after = searchParams.get('id')?.slice(3) ?? ''
      // Simulate a Supabase row cap smaller than the requested page size.
      return Response.json(rows.filter((row) => row.id > after).slice(0, 1))
    })
    vi.stubGlobal('fetch', dbFetch)

    expect(config.path).toBe(path)
    const response = await netlify(request(`${dates}&user_id=${other}`, bearer))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(await response.json()).toEqual({
      timezone: 'America/Toronto',
      days: [
        { date: '2026-10-31', weightKg: 79.4, caloriesKcal: null, proteinG: null },
        { date: '2026-11-01', weightKg: null, caloriesKcal: 850.5, proteinG: 30.3 },
        { date: '2026-11-02', weightKg: null, caloriesKcal: 0, proteinG: 0 },
        { date: '2026-11-03', weightKg: null, caloriesKcal: null, proteinG: null },
      ],
    })
  })

  it('accepts a single leap day', async () => {
    const result = await vercel.fetch(request('from=2028-02-29&to=2028-02-29', bearer))
    expect(result.status).toBe(200)
    expect((await result.json()).days).toEqual([
      { date: '2028-02-29', weightKg: null, caloriesKcal: null, proteinG: null },
    ])
  })
})
