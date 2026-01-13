
do $$
declare
  mod_id uuid;
  user_rec record;
  new_channel_id uuid;
begin
  -- 1. Find a moderator (just pick the oldest one for stability)
  select id into mod_id from public.profiles where role = 'moderator' order by created_at asc limit 1;

  if mod_id is null then
    raise notice 'No moderator found, skipping Mod Chat creation.';
    return;
  end if;

  -- 2. Loop through all general users
  for user_rec in select id from public.profiles where role = 'general'
  loop
    -- Check if they already have a chat named 'Mod Chat' (or similar) with this mod?
    -- Actually, simpler: Check if they have ANY channel named 'Mod Chat'.
    if not exists (
      select 1 from public.channels c
      join public.channel_participants cp on c.id = cp.channel_id
      where cp.user_id = user_rec.id and c.name = 'Mod Chat'
    ) then
      
      -- Create Channel
      insert into public.channels (name, type, created_by)
      values ('Mod Chat', 'hallway', mod_id)
      returning id into new_channel_id;

      -- Add Participants (User + Mod)
      insert into public.channel_participants (channel_id, user_id)
      values (new_channel_id, user_rec.id), (new_channel_id, mod_id);
      
      raise notice 'Created Mod Chat for user %', user_rec.id;
    end if;
  end loop;
end;
$$;
