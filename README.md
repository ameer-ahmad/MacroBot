# MacroBot

A PWA for tracking calories and macros (protein, carbs, fats, fiber).

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router, TanStack Query, Zustand
- Supabase (auth + database)
- Open Food Facts + USDA FoodData Central — Phase 4+

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

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_USDA_API_KEY` | USDA FoodData Central API key |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run supabase:types` | Regenerate TypeScript types from linked Supabase project |
