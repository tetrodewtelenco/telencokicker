-- TEL&CO KICKER LEAGUE v3
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_a1 uuid not null references public.players(id),
  team_a2 uuid not null references public.players(id),
  team_b1 uuid not null references public.players(id),
  team_b2 uuid not null references public.players(id),
  score_a integer not null check (score_a >= 0 and score_a <= 50),
  score_b integer not null check (score_b >= 0 and score_b <= 50),
  created_at timestamptz not null default now(),
  constraint no_draw check (score_a <> score_b),
  constraint four_unique_players check (
    team_a1 <> team_a2 and team_a1 <> team_b1 and team_a1 <> team_b2 and
    team_a2 <> team_b1 and team_a2 <> team_b2 and team_b1 <> team_b2
  )
);

alter table public.players enable row level security;
alter table public.matches enable row level security;

drop policy if exists "public read players" on public.players;
drop policy if exists "public insert players" on public.players;
drop policy if exists "admin update players" on public.players;
drop policy if exists "admin delete players" on public.players;
drop policy if exists "public read matches" on public.matches;
drop policy if exists "public insert matches" on public.matches;
drop policy if exists "admin update matches" on public.matches;
drop policy if exists "admin delete matches" on public.matches;

create policy "public read players" on public.players for select to anon, authenticated using (true);
create policy "public insert players" on public.players for insert to anon, authenticated with check (true);
create policy "admin update players" on public.players for update to authenticated using (true) with check (true);
create policy "admin delete players" on public.players for delete to authenticated using (true);

create policy "public read matches" on public.matches for select to anon, authenticated using (true);
create policy "public insert matches" on public.matches for insert to anon, authenticated with check (true);
create policy "admin update matches" on public.matches for update to authenticated using (true) with check (true);
create policy "admin delete matches" on public.matches for delete to authenticated using (true);

grant select, insert on public.players to anon;
grant select, insert on public.matches to anon;
grant select, insert, update, delete on public.players to authenticated;
grant select, insert, update, delete on public.matches to authenticated;

-- Realtime for shared live updates
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.matches;
