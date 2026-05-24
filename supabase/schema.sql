create table if not exists public.saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin jsonb not null,
  destination jsonb not null,
  route_data jsonb not null,
  locations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text not null,
  notes text,
  visited boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists saved_routes_user_created_idx
  on public.saved_routes (user_id, created_at desc);

create index if not exists user_favorites_user_created_idx
  on public.user_favorites (user_id, created_at desc);

create unique index if not exists user_favorites_user_place_idx
  on public.user_favorites (user_id, place_id);

alter table public.saved_routes enable row level security;
alter table public.user_favorites enable row level security;

drop policy if exists "Users can read their saved routes" on public.saved_routes;
create policy "Users can read their saved routes"
  on public.saved_routes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their saved routes" on public.saved_routes;
create policy "Users can insert their saved routes"
  on public.saved_routes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their favorites" on public.user_favorites;
create policy "Users can manage their favorites"
  on public.user_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
