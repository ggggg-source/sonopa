-- Выполните в Supabase SQL Editor.
-- Затем включите Email и Google в Authentication → Providers.
-- Redirect URL для локальной разработки: http://localhost:3000/api/auth/callback

create table if not exists public.playlists (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  cover_color text not null,
  cover_accent text not null,
  items jsonb not null default '[]'::jsonb,
  system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listening_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null,
  position double precision not null default 0,
  playlist_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.playlists enable row level security;
alter table public.listening_progress enable row level security;

drop policy if exists "playlists_own" on public.playlists;
create policy "playlists_own" on public.playlists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "progress_own" on public.listening_progress;
create policy "progress_own" on public.listening_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.listening_progress to authenticated;
