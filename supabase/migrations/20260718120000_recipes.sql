-- Recipes: multi-ingredient recipes that expand into log entries when logged.

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text,
  servings numeric(10, 3) not null default 1 check (servings > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists recipes_name_idx
  on public.recipes using gin (to_tsvector('english', name));

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

drop policy if exists "Users can view own recipes" on public.recipes;
create policy "Users can view own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own recipes" on public.recipes;
create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own recipes" on public.recipes;
create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recipes" on public.recipes;
create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- recipe_ingredients
-- ---------------------------------------------------------------------------

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  name text not null,
  quantity numeric(10, 3) not null default 1 check (quantity > 0),
  serving_unit text not null default 'serving',
  calories numeric(10, 2) not null default 0 check (calories >= 0),
  protein_g numeric(10, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10, 2) not null default 0 check (carbs_g >= 0),
  fats_g numeric(10, 2) not null default 0 check (fats_g >= 0),
  fiber_g numeric(10, 2) not null default 0 check (fiber_g >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipe_ingredients_recipe_id_idx
  on public.recipe_ingredients (recipe_id, sort_order);

create index if not exists recipe_ingredients_user_id_idx
  on public.recipe_ingredients (user_id);

drop trigger if exists recipe_ingredients_set_updated_at on public.recipe_ingredients;
create trigger recipe_ingredients_set_updated_at
before update on public.recipe_ingredients
for each row execute function public.set_updated_at();

alter table public.recipe_ingredients enable row level security;

drop policy if exists "Users can view own recipe ingredients" on public.recipe_ingredients;
create policy "Users can view own recipe ingredients"
  on public.recipe_ingredients for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own recipe ingredients" on public.recipe_ingredients;
create policy "Users can insert own recipe ingredients"
  on public.recipe_ingredients for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own recipe ingredients" on public.recipe_ingredients;
create policy "Users can update own recipe ingredients"
  on public.recipe_ingredients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recipe ingredients" on public.recipe_ingredients;
create policy "Users can delete own recipe ingredients"
  on public.recipe_ingredients for delete
  using (auth.uid() = user_id);
