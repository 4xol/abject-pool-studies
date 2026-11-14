-- Run ONLY if you already ran the old setup.sql in Supabase.
-- Allows the new four pools: Intriguing, Pleasant, Beautiful, Disturbing.
-- Existing answers are NOT changed. Export/reset previous pilot data before launching a new study wave.

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
