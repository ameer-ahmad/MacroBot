# MacroBot

A PWA for tracking calories and macros (protein, carbs, fats, fiber).

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router, TanStack Query, Zustand
- Supabase (auth + database)
- Open Food Facts + USDA FoodData Central

## Food logging

The **Log** tab is the single place to add food. It shows your daily log grouped by meal (breakfast, lunch, dinner, snacks). Tap **Add** on any meal to open the add flow, which offers several ways to add food:

- **Search** — results show your previously logged foods first (ordered by recency), then **USDA FoodData Central** items you haven't logged before. All results match what you type.
- **Scan** — camera barcode scanning via Open Food Facts.
- **AI** — describe a meal in plain language (e.g. _"4 eggs cooked in 5g of butter"_) and/or attach a food photo; the assistant estimates each item's macros for you to review and log. A **Nutrition label** tab reads a photo of a label and saves that food to your library.
- **Manual** — enter a name and macros directly.

After choosing a food, set the quantity and meal, then add it to the log. Tap any logged entry to edit quantity/meal or delete it.

- **Date navigation**: prev/next day, tap the date for a calendar, jump to today
- **Dashboard** shows live totals vs your daily goals

Get a free USDA API key at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup). Camera access requires HTTPS or `localhost`; if permission is denied, use manual entry.

## Goals & weight tracking

- **Goal calculator** (onboarding + Settings): Mifflin–St Jeor BMR × activity factor for maintenance calories, adjusted by your weight goal (lose/maintain/gain) and pace (slow ±250 / moderate ±500 / fast ±750 kcal). Macros come from a carb-preference split (low 40/20/40, moderate 30/40/30, high 25/55/20 — P/C/F). You can also enter fully custom values.
- **Daily weigh-ins**: log today's weight from the dashboard; shows a 7-day trend.
- **Weekly auto-adjust**: after two weeks of data, the app compares this week's average weight to last week's against your target pace (0.5/1/1.5 lb ± 0.25). If you're off target **and** your logged intake was close to your goal, it suggests a calorie/macro change — which you can **apply or keep current**. If your logged intake was off-plan, it won't adjust (you didn't follow it). Runs at most once per week.

## Insights (Phase 7)

- **Dashboard trends** section with week/month toggle
- **Calorie line chart** with daily goal reference line
- **Macro bar chart** for protein, carbs, fats, fiber
- Summary stats: average calories, average protein, days logged
- **Settings** profile & goals editor (name, units, all macro targets, body-stat calculator)

## PWA & offline (Phase 8)

- **Installable** via `vite-plugin-pwa` — web manifest, theme color, and a branded maskable icon (`public/pwa-icon.svg`). Use your browser's "Add to Home Screen" / "Install app".
- **Service worker caching** (Workbox): the app shell is precached; runtime caching covers USDA (`NetworkFirst`), Open Food Facts (`StaleWhileRevalidate`), and Supabase REST reads (`NetworkFirst`). Auth and the AI edge function are never cached.
- **Offline logging queue**: when you're offline (or a save can't reach the server), log entries are stored on-device (localStorage) and shown in the log marked "Saved offline · will sync". They sync automatically when connectivity returns.
- **Status bar**: a slim bar under the header shows offline state, pending-sync count, and an in-app **"new version available → Reload"** prompt when the service worker updates.
- The service worker is disabled in `npm run dev`; test PWA behavior with `npm run build && npm run preview`.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev
```

## Supabase setup (Phase 2)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy **Project URL** and **anon public** key into `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run the migration in the Supabase SQL Editor:
   - Open **SQL Editor** → **New query**
   - Paste contents of [`supabase/migrations/20250625000000_initial_schema.sql`](supabase/migrations/20250625000000_initial_schema.sql)
   - Click **Run**
4. Restart the dev server and check **Settings** → Supabase should show **Connected**.
5. In Supabase **Authentication → Providers**, ensure **Email** is enabled. Disable email confirmation for local dev, or users must confirm via email before signing in.

### Auth (Phase 3)

- `/login` and `/signup` for email + password auth
- New users are guided through `/onboarding` to set daily macro goals
- All app routes require sign-in; goals are stored in `profiles`

### Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User goals + body stats and goal preferences (sex, age, height, weight, activity, diet, goal direction/intensity) |
| `foods` | Saved food library (manual, USDA, Open Food Facts) |
| `log_entries` | Daily food log entries by meal |
| `weight_entries` | Daily body-weight log (one row per day) used for trend-based goal adjustments |

All tables use Row Level Security — users can only access their own data. A profile row is auto-created when a user signs up (Phase 3).

> The weight log + profile stat columns live in migration `20250627120000_weight_and_goal_stats.sql`. Run it (SQL Editor or `supabase db push`) before using daily weigh-ins and weekly auto-adjust.

### Optional: Supabase CLI

If you use the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref your-project-ref
supabase db push
npm run supabase:types
```

## AI features setup

The AI meal description, food-photo, and nutrition-label features call OpenAI
through the `ai-meal` [Supabase Edge Function](https://supabase.com/docs/guides/functions),
so the OpenAI key stays server-side and is never shipped to the browser. The
function requires a signed-in user (`verify_jwt = true`).

```bash
# 1. Store your OpenAI key as a function secret (one time)
supabase secrets set OPENAI_API_KEY=sk-...

# 2. Deploy the function
supabase functions deploy ai-meal
```

The function uses OpenAI `gpt-4o-mini` with vision + structured (JSON schema)
output. Uploaded photos are downscaled in the browser before upload to limit
payload size and cost. Until the function is deployed, the rest of the app
(search, scan, manual entry) works as normal.

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_USDA_API_KEY` | USDA FoodData Central API key |
| `OPENAI_API_KEY` | OpenAI key — set as a **Supabase function secret**, not a `VITE_` var (see AI features setup) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run supabase:types` | Regenerate TypeScript types from linked Supabase project |
