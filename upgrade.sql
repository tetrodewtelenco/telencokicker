-- Tel&Co Kicker V4 upgrade
-- Behoudt bestaande spelers en matchen.

alter table public.players add column if not exists photo_url text;
alter table public.players add column if not exists active boolean not null default true;

alter table public.matches add column if not exists match_type text default '2v2';
alter table public.matches alter column team_a_player2 drop not null;
alter table public.matches alter column team_b_player2 drop not null;

update public.matches
set match_type = case
  when team_a_player2 is null and team_b_player2 is null then '1v1'
  else '2v2'
end
where match_type is null or match_type not in ('1v1','2v2');

insert into storage.buckets(id,name,public)
values('avatars','avatars',true)
on conflict(id) do update set public=true;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
for select using(bucket_id='avatars');

drop policy if exists "avatars public upload" on storage.objects;
create policy "avatars public upload" on storage.objects
for insert with check(bucket_id='avatars');

do $$
begin
  begin alter publication supabase_realtime add table public.players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.matches; exception when duplicate_object then null; end;
end $$;
