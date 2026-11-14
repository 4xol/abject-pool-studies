-- THE ALLURE OF THE ABJECT BODY — DATABASE & STORAGE
-- Run once in Supabase Dashboard -> SQL Editor.
-- Do NOT put admin secrets or service-role keys in GitHub.

create extension if not exists pgcrypto;

create table if not exists public.study_researchers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create table if not exists public.study_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  group_name text not null default 'unclassified'
    check(group_name in ('constructed', 'lived', 'unclassified')),
  source_credit text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.study_submissions (
  id uuid primary key default gen_random_uuid(),
  answers jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.study_researchers enable row level security;
alter table public.study_images enable row level security;
alter table public.study_submissions enable row level security;

-- The client uses this check after sign-in. A table lookup alone never grants admin rights.
create or replace function public.is_researcher()
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.study_researchers sr
    where sr.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_researcher() from public;
grant execute on function public.is_researcher() to authenticated;

-- IMPORTANT: the participant never gets group_name or source_credit.
-- Public SQL RPC exposes only the image id and opaque storage path.
create or replace function public.get_study_images()
returns table(image_id uuid, image_path text)
language sql
stable security definer
set search_path = ''
as $$
  select i.id, i.storage_path from public.study_images i
  where i.is_active = true
  order by i.created_at, i.id;
$$;
revoke all on function public.get_study_images() from public;
grant execute on function public.get_study_images() to anon, authenticated;

-- One anonymous submission for the completed image set.
-- It is impossible to read other people's answers using a public API key.
create or replace function public.submit_study(p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  an_item jsonb;
  a_tags jsonb;
  a_id uuid;
  ids uuid[] := ARRAY[]::uuid[];
  saved_id uuid;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Invalid submission format';
  end if;
  if jsonb_array_length(p_answers) < 1 or jsonb_array_length(p_answers) > 100 then
    raise exception 'Submission must include 1 to 100 images';
  end if;

  for an_item in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(an_item) <> 'object' or not (an_item ? 'imageId') or not (an_item ? 'tags') then
      raise exception 'Invalid image answer';
    end if;
    a_id := (an_item->>'imageId')::uuid;
    if a_id = any(ids) then
      raise exception 'Duplicate image';
    end if;
    ids := array_append(ids, a_id);
    a_tags := an_item->'tags';
    if jsonb_typeof(a_tags) <> 'array' or jsonb_array_length(a_tags) > 4 then
      raise exception 'Invalid pool selection';
    end if;
    if exists (
      select 1 from jsonb_array_elements(a_tags) as x(value)
      where jsonb_typeof(x.value) <> 'string'
        or (x.value #>> '{}') not in ('Intriguing','Pleasant','Beautiful','Disturbing')
    ) then
      raise exception 'Unknown pool';
    end if;
    if (select count(*) from jsonb_array_elements_text(a_tags))
       <> (select count(distinct value) from jsonb_array_elements_text(a_tags) as t(value)) then
      raise exception 'Duplicate pool';
    end if;
  end loop;

  if exists (
    select 1 from unnest(ids) as submitted(image_id)
    left join public.study_images i on submitted.image_id = i.id
    where i.id is null or i.is_active = false
  ) then
    raise exception 'An image is no longer active. Please refresh the survey.';
  end if;

  insert into public.study_submissions (answers) values (p_answers)
  returning id into saved_id;
  return saved_id;
end;
$$;
revoke all on function public.submit_study(jsonb) from public;
grant execute on function public.submit_study(jsonb) to anon, authenticated;

-- Researcher tables are private. Nothing can directly read/modify them as anon.
drop policy if exists "Researcher manages study images" on public.study_images;
create policy "Researcher manages study images" on public.study_images
  for all to authenticated
  using (public.is_researcher())
  with check (public.is_researcher());

drop policy if exists "Researcher reads and deletes responses" on public.study_submissions;
create policy "Researcher reads and deletes responses" on public.study_submissions
  for select to authenticated using (public.is_researcher());
drop policy if exists "Researcher deletes responses" on public.study_submissions;
create policy "Researcher deletes responses" on public.study_submissions
  for delete to authenticated using (public.is_researcher());

grant select, insert, update, delete on public.study_images to authenticated;
grant select, delete on public.study_submissions to authenticated;
-- No table grants to anon. Public functions above are the only public entry points.
revoke all on public.study_researchers from anon, authenticated;
revoke all on public.study_images from anon;
revoke all on public.study_submissions from anon;

-- Public READ for photo URLs; only authorised researchers can upload/remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-images', 'study-images', true, 8388608, ARRAY['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/webp','image/jpeg','image/png'];

drop policy if exists "Researcher upload images" on storage.objects;
create policy "Researcher upload images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'study-images' and public.is_researcher());
drop policy if exists "Researcher manage stored images" on storage.objects;
create policy "Researcher manage stored images" on storage.objects
  for all to authenticated
  using (bucket_id = 'study-images' and public.is_researcher())
  with check (bucket_id = 'study-images' and public.is_researcher());

-- NEXT STEP AFTER CREATING YOUR RESEARCHER USER:
-- Run the following separately in SQL Editor, replacing the email.
-- insert into public.study_researchers (user_id)
-- select id from auth.users where email = 'YOUR_RESEARCHER_EMAIL@example.com'
-- on conflict (user_id) do nothing;
