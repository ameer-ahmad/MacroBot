-- MacroBot initial schema: profiles, foods, log_entries + RLS

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

create type public.food_source as enum (
  'manual',
  'custom',
  'usda',
  'open_food_facts'
);

create type public.unit_system as enum ('metric', 'imperial');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  units public.unit_system not null default 'metric',
  calorie_goal integer not null default 2000 check (calorie_goal > 0),
  protein_goal numeric(8, 2) not null default 150 check (protein_goal >= 0),
  carbs_goal numeric(8, 2) not null default 200 check (carbs_goal >= 0),
  fats_goal numeric(8, 2) not null default 65 check (fats_goal >= 0),
  fiber_goal numeric(8, 2) not null default 30 check (fiber_goal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- foods (saved / custom food library per user)
-- ---------------------------------------------------------------------------

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand text,
  serving_size numeric(10, 3) not null default 1 check (serving_size > 0),
  serving_unit text not null default 'serving',
  calories numeric(10, 2) not null default 0 check (calories >= 0),
  protein_g numeric(10, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10, 2) not null default 0 check (carbs_g >= 0),
  fats_g numeric(10, 2) not null default 0 check (fats_g >= 0),
  fiber_g numeric(10, 2) not null default 0 check (fiber_g >= 0),
  barcode text,
  source public.food_source not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index foods_user_id_idx on public.foods (user_id);
create index foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index foods_name_idx on public.foods using gin (to_tsvector('english', name));

create trigger foods_set_updated_at
before update on public.foods
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- log_entries (daily food log)
-- ---------------------------------------------------------------------------

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  logged_date date not null default current_date,
  meal public.meal_type not null,
  name text not null,
  quantity numeric(10, 3) not null default 1 check (quantity > 0),
  serving_unit text not null default 'serving',
  calories numeric(10, 2) not null default 0 check (calories >= 0),
  protein_g numeric(10, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(10, 2) not null default 0 check (carbs_g >= 0),
  fats_g numeric(10, 2) not null default 0 check (fats_g >= 0),
  fiber_g numeric(10, 2) not null default 0 check (fiber_g >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index log_entries_user_date_idx on public.log_entries (user_id, logged_date desc);
create index log_entries_meal_idx on public.log_entries (user_id, logged_date, meal);

create trigger log_entries_set_updated_at
before update on public.log_entries
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.log_entries enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- foods
create policy "Users can view own foods"
  on public.foods for select
  using (auth.uid() = user_id);

create policy "Users can insert own foods"
  on public.foods for insert
  with check (auth.uid() = user_id);

create policy "Users can update own foods"
  on public.foods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own foods"
  on public.foods for delete
  using (auth.uid() = user_id);

-- log_entries
create policy "Users can view own log entries"
  on public.log_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own log entries"
  on public.log_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own log entries"
  on public.log_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own log entries"
  on public.log_entries for delete
  using (auth.uid() = user_id);
