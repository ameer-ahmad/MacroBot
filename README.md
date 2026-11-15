# MacroBot

A PWA for tracking calories and macros (protein, carbs, fats, fiber).

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router, TanStack Query, Zustand
- Supabase (auth + database)
- Open Food Facts + USDA FoodData Central

## Food logging

Tap **Log food** on the Dashboard or **Add** beside a meal in the Log to open the add flow:

- **Search** — results show your previously logged foods first (ordered by recency), then **USDA FoodData Central** items you haven't logged before. All results match what you type.
- **Scan** — use the camera or upload a barcode photo to look up a product in Open Food Facts.
- **AI** — describe a meal in plain language (e.g. _"4 eggs cooked in 5g of butter"_), take a food photo, or upload one. The assistant estimates each item's macros for you to review and log. The **Nutrition label** tab lets you take or upload a label photo and save the food to your library.
- **Recipe** — build and save a multi-ingredient recipe. Logging starts at one serving and saves the scaled ingredients together.
- **Manual** — enter a name and macros directly.

After choosing a food, set the quantity and meal, then add it to the log. Tap any logged entry to edit quantity/meal or delete it.

- **Date navigation**: prev/next day, tap the date for a calendar, jump to today
- **Copy a meal**: choose a logged meal, pick a destination date and meal, then adjust portions or remove items before saving
- **Delete a meal**: use the trash icon beside a meal to review and remove its entries
- **Dashboard** shows live totals vs your daily goals

Get a free USDA API key at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup). Camera access requires HTTPS or `localhost`. If camera access is unavailable, you can upload a photo.

## Goals & weight tracking

- **Goal calculator** (onboarding + Settings): Mifflin–St Jeor BMR × activity factor for maintenance calories, adjusted by your weight goal (lose/maintain/gain) and pace (slow ±250 / moderate ±500 / fast ±750 kcal). Macros come from a carb-preference split (low 40/20/40, moderate 30/40/30, high 25/55/20 — P/C/F). You can also enter fully custom values.
- **Daily weigh-ins**: log today's weight from the dashboard; shows a 7-day trend.
- **Weekly auto-adjust**: after two weeks of data, the app compares this week's average weight to last week's against your target pace (0.5/1/1.5 lb ± 0.25). If you're off target **and** your logged intake was close to your goal, it suggests a calorie/macro change — which you can **apply or keep current**. If your logged intake was off-plan, it won't adjust (you didn't follow it). Runs at most once per week.

## Insights (Phase 7)

- **Dashboard trends** section with week/month toggle
- **Calorie line chart** with daily goal reference line and gaps on unlogged days
- **Macro bar chart** for protein, carbs, fats, fiber
- Summary stats: average calories, average protein, days logged
- **Settings** profile & goals editor (name, units, all macro targets, body-stat calculator)

## PWA & offline (Phase 8)

- **Installable** via `vite-plugin-pwa` — web manifest, theme color, and a branded icon set. The brand source is `public/pwa-icon.svg`; PNG icons (64/192/512, a maskable 512, a 180px Apple touch icon) and `favicon.ico` are generated from it with `@vite-pwa/assets-generator` (`npm run generate-pwa-assets`) so installs look crisp on every platform, including iOS. Use your browser's "Add to Home Screen" / "Install app".
- **Service worker caching** (Workbox): the app shell is precached; runtime caching covers USDA (`NetworkFirst`), Open Food Facts (`StaleWhileRevalidate`), and Supabase REST reads (`NetworkFirst`). Auth and the AI edge function are never cached.
- **Offline logging queue**: food entries save on-device under your account first. They sync automatically when connectivity returns, and failed batches stay visible with a **Retry** action.
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
| `recipes` / `recipe_ingredients` | Multi-ingredient recipes; logging expands into one log entry per ingredient |
| `weight_entries` | Daily body-weight log (one row per day) used for trend-based goal adjustments |

All tables use Row Level Security — users can only access their own data. A profile row is auto-created when a user signs up (Phase 3).

> The weight log + profile stat columns live in migration `20250627120000_weight_and_goal_stats.sql`. Run it (SQL Editor or `supabase db push`) before using daily weigh-ins and weekly auto-adjust.
>
> Recipes live in migration `20260718120000_recipes.sql` (`recipes` + `recipe_ingredients`). Run it before creating or logging recipes.

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

The function uses OpenAI `gpt-6-luna` with vision + structured (JSON schema)
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

## Daybook nutrition API

```text
GET /api/daybook/nutrition?from=2026-11-01&to=2026-11-14
```

1. In the MacroBot Supabase project, copy your account's UUID from **Authentication → Users**. Copy the project URL and a Supabase secret key from the same project's API settings.
2. Set these variables in the MacroBot host's server-side environment. Use the Functions scope on Netlify when available. [Vercel environment settings](https://vercel.com/docs/environment-variables) · [Netlify function environment settings](https://docs.netlify.com/build/functions/environment-variables/)

   | Variable | Value |
   |----------|-------|
   | `DAYBOOK_USER_ID` | Your MacroBot account UUID. Both database reads are filtered to this account. |
   | `DAYBOOK_API_TOKEN` | A strong, randomly generated secret shared with the Daybook server. |
   | `SUPABASE_URL` | The URL of the Supabase project used by MacroBot. |
   | `SUPABASE_SECRET_KEY` | The Supabase secret API key. Keep this on MacroBot's server because it bypasses RLS. |

3. Deploy or redeploy MacroBot with its Vercel or Netlify configuration. The existing food and weight migrations provide the tables. A static-only deployment or the plain Vite dev server cannot serve this endpoint.
4. Call the HTTPS URL on MacroBot's domain from the Daybook server with `Authorization: Bearer <token>`. Store the shared secret in Daybook's server environment. A GET without a valid header should return `401`.

The response contains `timezone: "America/Toronto"` and an oldest-first `days` array with `date`, `weightKg`, `caloriesKcal`, and `proteinG`. Both dates are inclusive and each request may span up to 366 days. It uses the stored `logged_date` values. MacroBot derives these from the device's local calendar or the date selected in the food log, so an entry made on a device outside Toronto keeps its saved date.

Weight is stored in kilograms after conversion at entry time, and each day's most recent saved weight overwrites the previous one. Food totals sum the portion-adjusted kilocalories and grams of protein saved in synced log entries. A day without a weigh-in has a null weight, and a day without synced food entries has null intake totals. Recorded zeros remain zero. Some logging flows store unavailable nutrition values as zero, so those values are indistinguishable from measured zeros. Pending offline food logs appear after syncing.

## Testing

Unit tests (Vitest) cover the pure logic: macro scaling/units, the BMR/TDEE/macro
goal math, the weekly calorie auto-adjust algorithm, and the food-search
normalizers.

```bash
npm test          # run once
npm run test:watch
```

## Deployment

The app is a static SPA with a Supabase Edge Function for AI and an optional hosting function for Daybook.

1. **Frontend** — deploy the Vite build (output: `dist/`) to any static host. Config
   files are included for the two common options:
   - **Vercel** — `vercel.json` (build command, output dir, SPA rewrite, cache headers).
   - **Netlify** — `netlify.toml` (build, publish dir, SPA redirect, cache headers).
   Both keep `sw.js` / `manifest.webmanifest` uncached so updates roll out instantly,
   and cache hashed `/assets/*` immutably. For other hosts, set the build command to
   `npm run build`, publish `dist/`, and add a catch-all rewrite to `/index.html`.
2. **Environment variables** — set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
   `VITE_USDA_API_KEY` in the host's project settings (they're inlined at build time).
3. **Backend** — run the SQL migrations and deploy the `ai-meal` function with its
   `OPENAI_API_KEY` secret (see above). Add your deployed origin to Supabase
   **Authentication → URL Configuration** (Site URL + redirect URLs).
4. **Audit** — after deploy, run a Lighthouse PWA audit (Chrome DevTools → Lighthouse)
   against the production URL to confirm installability and performance.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (HTTPS, LAN host) |
| `npm run build` | Production build (type-check + bundle + PWA) |
| `npm run preview` | Preview production build (test PWA/offline here) |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run generate-pwa-assets` | Regenerate PNG/ICO icons from `public/pwa-icon.svg` |
| `npm run supabase:types` | Regenerate TypeScript types from linked Supabase project |
