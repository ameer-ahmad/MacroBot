# MacroBot

A PWA for tracking calories and macros (protein, carbs, fats, fiber).

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- React Router, TanStack Query, Zustand
- Supabase (auth + database) — Phase 2+
- Open Food Facts + USDA FoodData Central — Phase 4+

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev
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
