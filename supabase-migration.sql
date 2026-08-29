
-- TEL&CO KICKER V8 SAFE UPGRADE
-- Behoudt bestaande spelers en matchen.

alter table public.players
  add column if not exists photo_url text,
  add column if not exists active boolean not null default true;

alter table public.matches
  add column if not exists match_type text not null default '2v2';

-- Nodig voor 1v1. Bestaande 2v2-data blijft ongewijzigd.
alter table public.matches alter column team_a2 drop not null;
alter table public.matches alter column team_b2 drop not null;

update public.matches
set match_type = case
  when team_a2 is null and team_b2 is null then '1v1'
  else '2v2'
end
where match_type is null or match_type not in ('1v1','2v2');

-- Publieke avatar-bucket
insert into storage.buckets(id,name,public)
values ('avatars','avatars',true)
on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "avatars public upload" on storage.objects;
create policy "avatars public upload"
on storage.objects for insert
with check (bucket_id = 'avatars');

drop policy if exists "avatars public update" on storage.objects;
create policy "avatars public update"
on storage.objects for update
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

-- Realtime proberen activeren (veilig als tabel al toegevoegd is)
do $$
begin
  begin alter publication supabase_realtime add table public.players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.matches; exception when duplicate_object then null; end;
end $$;
