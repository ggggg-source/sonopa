-- Sonopa — полная схема БД. Выполните целиком в Supabase → SQL Editor.
-- После этого: Authentication → Providers (Email, Google, Anonymous при желании).

-- ===== Профили =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles readable" on public.profiles;
drop policy if exists "profiles own write" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
create policy "profiles own write" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id);

-- ===== Лайки =====
create table if not exists public.user_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_id text not null,
  title text not null default '',
  artist text not null default '',
  cover text not null default '',
  created_at timestamptz not null default now(),
  unique(user_id, youtube_id)
);
alter table public.user_likes enable row level security;
drop policy if exists "own likes" on public.user_likes;
create policy "own likes" on public.user_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Плейлисты (мобильный API: user_playlists + playlist_tracks) =====
create table if not exists public.user_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  cover text not null default '',
  created_at timestamptz not null default now()
);
alter table public.user_playlists enable row level security;
drop policy if exists "own playlists" on public.user_playlists;
create policy "own playlists" on public.user_playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id text not null,
  youtube_id text not null,
  title text not null default '',
  artist text not null default '',
  cover text not null default '',
  position int not null default 0,
  unique(playlist_id, youtube_id)
);
alter table public.playlist_tracks enable row level security;
drop policy if exists "own playlist tracks" on public.playlist_tracks;
create policy "own playlist tracks" on public.playlist_tracks
  for all using (
    exists (select 1 from public.user_playlists p where p.id::text = playlist_tracks.playlist_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.user_playlists p where p.id::text = playlist_tracks.playlist_id and p.user_id = auth.uid())
  );

-- ===== История =====
create table if not exists public.user_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  youtube_id text not null,
  title text not null default '',
  artist text not null default '',
  cover text not null default '',
  played_at timestamptz not null default now()
);
alter table public.user_history enable row level security;
drop policy if exists "own history" on public.user_history;
create policy "own history" on public.user_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_history_user_played_idx on public.user_history(user_id, played_at desc);

-- ===== Репосты =====
create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('track','playlist')),
  youtube_id text,
  playlist_id text,
  title text not null default '',
  artist text not null default '',
  cover text not null default '',
  original_user_id uuid,
  created_at timestamptz not null default now()
);
alter table public.reposts enable row level security;
drop policy if exists "reposts readable" on public.reposts;
drop policy if exists "reposts insert own" on public.reposts;
drop policy if exists "reposts delete own" on public.reposts;
create policy "reposts readable" on public.reposts for select using (true);
create policy "reposts insert own" on public.reposts for insert with check (auth.uid() = user_id);
create policy "reposts delete own" on public.reposts for delete using (auth.uid() = user_id);

-- ===== Друзья =====
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  friend_name text not null default '',
  friend_email text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;
drop policy if exists "friends visible to parties" on public.friends;
drop policy if exists "friends insert own" on public.friends;
drop policy if exists "friends update recipient" on public.friends;
drop policy if exists "friends delete party" on public.friends;
create policy "friends visible to parties" on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friends insert own" on public.friends for insert with check (auth.uid() = user_id);
create policy "friends update recipient" on public.friends for update
  using (auth.uid() = friend_id) with check (auth.uid() = friend_id);
create policy "friends delete party" on public.friends for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);
create index if not exists friends_user_idx on public.friends(user_id);
create index if not exists friends_friend_idx on public.friends(friend_id);
create index if not exists friends_status_idx on public.friends(status);

-- ===== Синхронизация веб-клиента (lib/sync.ts): playlists + listening_progress =====
create table if not exists public.playlists (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_color text,
  cover_accent text,
  items jsonb not null default '[]',
  system boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.playlists enable row level security;
drop policy if exists "playlists all own" on public.playlists;
create policy "playlists all own" on public.playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.listening_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  playlist_id text,
  position double precision not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, track_id)
);
alter table public.listening_progress enable row level security;
drop policy if exists "progress all own" on public.listening_progress;
create policy "progress all own" on public.listening_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Доступы =====
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
