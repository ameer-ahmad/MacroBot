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

## Insights (Phase 7)

- **Dashboard trends** section with week/month toggle
- **Calorie line chart** with daily goal reference line
- **Macro bar chart** for protein, carbs, fats, fiber
- Summary stats: average calories, average protein, days logged
- **Settings** profile & goals editor (name, units, all macro targets)

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
| `profiles` | User goals (calories, protein, carbs, fats, fiber) and preferences |
| `foods` | Saved food library (manual, USDA, Open Food Facts) |
| `log_entries` | Daily food log entries by meal |

All tables use Row Level Security — users can only access their own data. A profile row is auto-created when a user signs up (Phase 3).

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
