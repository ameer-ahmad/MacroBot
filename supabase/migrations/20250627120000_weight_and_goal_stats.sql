-- Daily weight log + profile body stats / goal preferences for weekly auto-adjust.

-- ---------------------------------------------------------------------------
-- weight_entries (one row per user per day)
-- ---------------------------------------------------------------------------

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_date date not null default current_date,
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create index if not exists weight_entries_user_date_idx
  on public.weight_entries (user_id, logged_date desc);

drop trigger if exists weight_entries_set_updated_at on public.weight_entries;
create trigger weight_entries_set_updated_at
before update on public.weight_entries
for each row execute function public.set_updated_at();

alter table public.weight_entries enable row level security;

drop policy if exists "Users can view own weight entries" on public.weight_entries;
create policy "Users can view own weight entries"
  on public.weight_entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own weight entries" on public.weight_entries;
create policy "Users can insert own weight entries"
  on public.weight_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own weight entries" on public.weight_entries;
create policy "Users can update own weight entries"
  on public.weight_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own weight entries" on public.weight_entries;
create policy "Users can delete own weight entries"
  on public.weight_entries for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- profiles: body stats + goal preferences (all nullable)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists sex text check (sex in ('male', 'female')),
  add column if not exists age integer check (age > 0 and age < 130),
  add column if not exists height_cm numeric(6, 2) check (height_cm > 0),
  add column if not exists weight_kg numeric(6, 2) check (weight_kg > 0),
  add column if not exists activity_level text
    check (activity_level in ('sedentary', 'light', 'moderate', 'very', 'extra')),
  add column if not exists diet_type text
    check (diet_type in ('low', 'moderate', 'high')),
  add column if not exists goal_direction text
    check (goal_direction in ('lose', 'maintain', 'gain')),
  add column if not exists intensity text
    check (intensity in ('slow', 'moderate', 'fast')),
  add column if not exists last_adjustment_date date;
